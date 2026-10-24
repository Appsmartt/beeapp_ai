#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/.beeapp-work"
API_BASE_URL="${BEEAPP_API_BASE_URL:-http://192.168.1.5:8000}"
RUN_ID="s9-$(date -u +%Y%m%dT%H%M%SZ)-$$"
REPORT_FILE="$REPORT_DIR/${RUN_ID}_inventory_hold_release_report.txt"
RESPONSE_FILE="$(mktemp)"
BUSINESS_TOKEN=""
CUSTOMER_TOKEN=""
PROFILE_ID=""
CATALOG_ID=""
OFFER_ID=""
PROFILE_CREATED=0
CATALOG_CREATED=0
OFFER_CREATED=0
SELECTED_MODALITY=""
RESULT="FAILED"
PENDING_REQUEST_IDS=()

mkdir -p "$REPORT_DIR"
chmod 700 "$REPORT_DIR"
: > "$REPORT_FILE"
chmod 600 "$REPORT_FILE"

report() {
  printf '%s\n' "$*" >> "$REPORT_FILE"
}

request() {
  local label="$1" method="$2" url="$3" body="${4:-}" token="${5:-}" key="${6:-}"
  local http_status curl_status
  local -a args=(--silent --show-error --output "$RESPONSE_FILE" --write-out '%{http_code}' --request "$method")

  : > "$RESPONSE_FILE"
  [ -n "$token" ] && args+=(--header "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(--header 'Content-Type: application/json' --data "$body")
  [ -n "$key" ] && args+=(--header "Idempotency-Key: $key")

  set +e
  http_status="$(curl "${args[@]}" "$url")"
  curl_status=$?
  set -e

  report "STEP=$label HTTP=$http_status CURL=$curl_status"
  if [ "$http_status" -ge 400 ] 2>/dev/null; then
    report "ERROR_BODY=$(jq -c '{code:(.code // null),message:(.message // .detail // null),details:(.details // null)}' "$RESPONSE_FILE" 2>/dev/null || printf '{\"message\":\"non_json_error\"}')"
  fi
  printf '%s|%s\n' "$http_status" "$curl_status"
}

require_status() {
  local label="$1" actual="$2" expected="$3"
  if [ "$actual" != "$expected" ]; then
    report "FAIL=$label expected=$expected actual=$actual"
    exit 1
  fi
  report "PASS=$label"
}

login() {
  local label="$1" email="$2" password="$3"
  local payload result status token user_id

  payload="$(jq -n --arg email "$email" --arg password "$password" '{email:$email,password:$password}')"
  result="$(request "$label" POST "$API_BASE_URL/api/accounts/login/" "$payload")"
  status="${result%%|*}"
  require_status "$label" "$status" 200

  token="$(jq -r '.session.access_token // empty' "$RESPONSE_FILE")"
  [ -n "$token" ] || { report "FAIL=$label missing_token"; exit 1; }

  result="$(request "${label}_ME" GET "$API_BASE_URL/api/accounts/me/" "" "$token")"
  status="${result%%|*}"
  require_status "${label}_ME" "$status" 200

  user_id="$(jq -r '.profile.id // .id // empty' "$RESPONSE_FILE")"
  [ -n "$user_id" ] || { report "FAIL=$label missing_user_id"; exit 1; }

  printf '%s|%s\n' "$token" "$user_id"
}

offer_inventory() {
  local result status
  result="$(request GET_OFFER_INVENTORY GET "$API_BASE_URL/api/commercial/profiles/$PROFILE_ID/offers/$OFFER_ID/" "" "$BUSINESS_TOKEN")"
  status="${result%%|*}"
  require_status GET_OFFER_INVENTORY "$status" 200
  jq -r '[.offer.stock_quantity,.offer.reserved_inventory,.offer.available_inventory] | @tsv' "$RESPONSE_FILE"
}

require_inventory() {
  local label="$1" expected_stock="$2" expected_reserved="$3" expected_available="$4"
  local row stock reserved available

  row="$(offer_inventory)"
  IFS=$'\t' read -r stock reserved available <<< "$row"

  if [ "$stock" != "$expected_stock" ] || [ "$reserved" != "$expected_reserved" ] || [ "$available" != "$expected_available" ]; then
    report "FAIL=$label stock=$stock reserved=$reserved available=$available"
    exit 1
  fi
  report "PASS=$label stock=$stock reserved=$reserved available=$available"
}

wait_for_inventory() {
  local label="$1" expected_stock="$2" expected_reserved="$3" expected_available="$4"
  local attempt=1 row stock reserved available

  while [ "$attempt" -le 10 ]; do
    row="$(offer_inventory)"
    IFS=$'\t' read -r stock reserved available <<< "$row"

    if [ "$stock" = "$expected_stock" ] && [ "$reserved" = "$expected_reserved" ] && [ "$available" = "$expected_available" ]; then
      report "PASS=$label attempt=$attempt stock=$stock reserved=$reserved available=$available"
      return 0
    fi

    report "WAIT=$label attempt=$attempt stock=$stock reserved=$reserved available=$available"
    sleep 1
    attempt=$((attempt + 1))
  done

  report "FAIL=$label expected_stock=$expected_stock expected_reserved=$expected_reserved expected_available=$expected_available"
  exit 1
}

create_order() {
  local label="$1" quantity="$2" key="$3"
  local payload result status request_id

  payload="$(jq -n \
    --arg profile_id "$PROFILE_ID" \
    --arg offer_id "$OFFER_ID" \
    --arg run_id "$RUN_ID" \
    --arg modality "$SELECTED_MODALITY" \
    --argjson quantity "$quantity" \
    '{request_type:"product_order",commercial_profile_id:$profile_id,requested_modality:$modality,customer_note:("S9 E2E "+$run_id),currency_code:"COP",items:[{commercial_offer_id:$offer_id,quantity:$quantity}]}')"

  result="$(request "$label" POST "$API_BASE_URL/api/commercial/requests/" "$payload" "$CUSTOMER_TOKEN" "$key")"
  status="${result%%|*}"
  request_id="$(jq -r '.request.request_id // .request.id // empty' "$RESPONSE_FILE")"
  printf '%s|%s\n' "$status" "$request_id"
}

require_request_status() {
  local label="$1" request_id="$2" token="$3" expected="$4"
  local result status actual

  result="$(request "$label" GET "$API_BASE_URL/api/commercial/requests/$request_id/" "" "$token")"
  status="${result%%|*}"
  require_status "$label" "$status" 200
  actual="$(jq -r '.request.status // empty' "$RESPONSE_FILE")"

  if [ "$actual" != "$expected" ]; then
    report "FAIL=$label expected=$expected actual=$actual"
    exit 1
  fi
  report "PASS=$label status=$actual"
}

cleanup() {
  local result status request_id

  set +e

  for request_id in "${PENDING_REQUEST_IDS[@]}"; do
    [ -n "$request_id" ] || continue
    result="$(request CLEANUP_CANCEL_REQUEST POST "$API_BASE_URL/api/commercial/requests/$request_id/transition/" '{"action":"cancel","reason_code":"s9_cleanup","reason_text":"S9 automatic cleanup."}' "$CUSTOMER_TOKEN")"
    status="${result%%|*}"
    report "CLEANUP_REQUEST=$request_id HTTP=$status"
  done

  if [ "$OFFER_CREATED" = "1" ]; then
    result="$(request CLEANUP_ARCHIVE_OFFER POST "$API_BASE_URL/api/commercial/profiles/$PROFILE_ID/offers/$OFFER_ID/archive/" "" "$BUSINESS_TOKEN")"
    status="${result%%|*}"
    report "CLEANUP_OFFER_HTTP=$status"
  fi

  if [ "$CATALOG_CREATED" = "1" ]; then
    result="$(request CLEANUP_ARCHIVE_CATALOG POST "$API_BASE_URL/api/commercial/profiles/$PROFILE_ID/catalogs/$CATALOG_ID/archive/" "" "$BUSINESS_TOKEN")"
    status="${result%%|*}"
    report "CLEANUP_CATALOG_HTTP=$status"
  fi

  if [ "$PROFILE_CREATED" = "1" ]; then
    result="$(request CLEANUP_ARCHIVE_PROFILE PATCH "$API_BASE_URL/api/commercial/profiles/$PROFILE_ID/publication/" "{\"publication_status\":\"archived\",\"reason_text\":\"S9 cleanup $RUN_ID\"}" "$BUSINESS_TOKEN")"
    status="${result%%|*}"
    report "CLEANUP_PROFILE_HTTP=$status"
  fi

  rm -f "$RESPONSE_FILE"
  unset BUSINESS_TOKEN CUSTOMER_TOKEN BUSINESS_PASSWORD CUSTOMER_PASSWORD
  report "RESULT=$RESULT"
  report "REPORT_FILE=$REPORT_FILE"
  code "$REPORT_FILE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

report "S9_INVENTORY_HOLD_RELEASE"
report "RUN_ID=$RUN_ID"
report "API_BASE_URL=$API_BASE_URL"
report "SECRETS_NOT_REPORTED=yes"

read -r -p "Correo cuenta comercio: " BUSINESS_EMAIL
read -r -s -p "Contraseña cuenta comercio: " BUSINESS_PASSWORD
printf '\n'
read -r -p "Correo cuenta cliente: " CUSTOMER_EMAIL
read -r -s -p "Contraseña cuenta cliente: " CUSTOMER_PASSWORD
printf '\n'

business_login="$(login LOGIN_BUSINESS "$BUSINESS_EMAIL" "$BUSINESS_PASSWORD")"
BUSINESS_TOKEN="${business_login%%|*}"
BUSINESS_USER_ID="${business_login#*|}"
unset BUSINESS_PASSWORD

customer_login="$(login LOGIN_CUSTOMER "$CUSTOMER_EMAIL" "$CUSTOMER_PASSWORD")"
CUSTOMER_TOKEN="${customer_login%%|*}"
CUSTOMER_USER_ID="${customer_login#*|}"
unset CUSTOMER_PASSWORD

if [ "$BUSINESS_USER_ID" = "$CUSTOMER_USER_ID" ]; then
  report "FAIL=business_and_customer_must_be_different"
  exit 1
fi

profiles_result="$(request LIST_OWNED_PROFILES GET "$API_BASE_URL/api/commercial/profiles/" "" "$BUSINESS_TOKEN")"
profiles_status="${profiles_result%%|*}"
require_status LIST_OWNED_PROFILES "$profiles_status" 200
PROFILE_ID="$(jq -r '.profiles[]? | select(.publication_status=="published" and .is_available==true) | .id' "$RESPONSE_FILE" | head -n 1)"

if [ -z "$PROFILE_ID" ]; then
  SELECTED_MODALITY="pickup"
  profile_payload="$(jq -n --arg run_id "$RUN_ID" '{offer_type:"products",new_category_names:[("S9 E2E "+$run_id)],display_name:("S9 E2E "+$run_id),description:"S9 isolated inventory test.",country_code:"CO",city:"Bogotá",is_address_public:false,is_phone_public:false,is_email_public:false,modalities:["pickup"],hours:[]}')"
  profile_result="$(request CREATE_PROFILE POST "$API_BASE_URL/api/commercial/profiles/" "$profile_payload" "$BUSINESS_TOKEN")"
  profile_status="${profile_result%%|*}"
  require_status CREATE_PROFILE "$profile_status" 201
  PROFILE_ID="$(jq -r '.profile.id // empty' "$RESPONSE_FILE")"
  [ -n "$PROFILE_ID" ] || { report "FAIL=missing_profile_id"; exit 1; }
  PROFILE_CREATED=1

  publish_result="$(request PUBLISH_PROFILE PATCH "$API_BASE_URL/api/commercial/profiles/$PROFILE_ID/publication/" '{"publication_status":"published"}' "$BUSINESS_TOKEN")"
  publish_status="${publish_result%%|*}"
  require_status PUBLISH_PROFILE "$publish_status" 200
fi

if [ -z "$SELECTED_MODALITY" ]; then
  profile_detail="$(request GET_PROFILE_DETAIL GET "$API_BASE_URL/api/commercial/profiles/$PROFILE_ID/" "" "$BUSINESS_TOKEN")"
  profile_detail_status="${profile_detail%%|*}"
  require_status GET_PROFILE_DETAIL "$profile_detail_status" 200
  SELECTED_MODALITY="$(jq -r '.profile.modalities[]? | if type == "object" then .modality else . end // empty' "$RESPONSE_FILE" | head -n 1)"
fi

[ -n "$SELECTED_MODALITY" ] || { report "FAIL=profile_has_no_modality"; exit 1; }
report "SELECTED_MODALITY=$SELECTED_MODALITY"

catalog_payload="$(jq -n --arg run_id "$RUN_ID" '{name:("S9 E2E "+$run_id),description:"S9 isolated catalog.",status:"published"}')"
catalog_result="$(request CREATE_CATALOG POST "$API_BASE_URL/api/commercial/profiles/$PROFILE_ID/catalogs/" "$catalog_payload" "$BUSINESS_TOKEN")"
catalog_status="${catalog_result%%|*}"
require_status CREATE_CATALOG "$catalog_status" 201
CATALOG_ID="$(jq -r '.catalog.id // empty' "$RESPONSE_FILE")"
[ -n "$CATALOG_ID" ] || { report "FAIL=missing_catalog_id"; exit 1; }
CATALOG_CREATED=1

offer_payload="$(jq -n --arg catalog_id "$CATALOG_ID" --arg run_id "$RUN_ID" --arg modality "$SELECTED_MODALITY" '{catalog_id:$catalog_id,offer_kind:"product",title:("S9 E2E Product "+$run_id),description:"S9 isolated product.",pricing_strategy:"fixed",base_price_amount:1000,currency_code:"COP",is_available:true,status:"published",track_inventory:true,stock_quantity:3,requires_booking:false,modalities:[$modality]}')"
offer_result="$(request CREATE_OFFER POST "$API_BASE_URL/api/commercial/profiles/$PROFILE_ID/offers/" "$offer_payload" "$BUSINESS_TOKEN")"
offer_status="${offer_result%%|*}"
require_status CREATE_OFFER "$offer_status" 201
OFFER_ID="$(jq -r '.offer.id // empty' "$RESPONSE_FILE")"
[ -n "$OFFER_ID" ] || { report "FAIL=missing_offer_id"; exit 1; }
OFFER_CREATED=1

require_inventory INITIAL_INVENTORY 3 0 3

cancel_order="$(create_order CREATE_CANCEL_REQUEST 3 "s9-cancel-$RUN_ID")"
cancel_status="${cancel_order%%|*}"
cancel_request_id="${cancel_order#*|}"
require_status CREATE_CANCEL_REQUEST "$cancel_status" 201
[ -n "$cancel_request_id" ] || { report "FAIL=missing_cancel_request_id"; exit 1; }
PENDING_REQUEST_IDS+=("$cancel_request_id")
wait_for_inventory HOLD_AFTER_CREATE_CANCEL 3 3 0

cancel_result="$(request CANCEL_REQUEST POST "$API_BASE_URL/api/commercial/requests/$cancel_request_id/transition/" '{"action":"cancel","reason_code":"s9_e2e","reason_text":"S9 cancel verification."}' "$CUSTOMER_TOKEN")"
cancel_transition_status="${cancel_result%%|*}"
require_status CANCEL_REQUEST "$cancel_transition_status" 200
require_request_status VERIFY_CANCELLED "$cancel_request_id" "$CUSTOMER_TOKEN" cancelled
PENDING_REQUEST_IDS=()
require_inventory INVENTORY_AFTER_CANCEL 3 0 3

reject_order="$(create_order CREATE_REJECT_REQUEST 3 "s9-reject-$RUN_ID")"
reject_status="${reject_order%%|*}"
reject_request_id="${reject_order#*|}"
require_status CREATE_REJECT_REQUEST "$reject_status" 201
[ -n "$reject_request_id" ] || { report "FAIL=missing_reject_request_id"; exit 1; }
PENDING_REQUEST_IDS+=("$reject_request_id")
wait_for_inventory HOLD_AFTER_CREATE_REJECT 3 3 0

reject_result="$(request REJECT_REQUEST POST "$API_BASE_URL/api/commercial/requests/$reject_request_id/transition/" "{\"action\":\"reject\",\"reason_code\":\"s9_e2e\",\"reason_text\":\"S9 rejection $RUN_ID\"}" "$BUSINESS_TOKEN")"
reject_transition_status="${reject_result%%|*}"
require_status REJECT_REQUEST "$reject_transition_status" 200
require_request_status VERIFY_REJECTED "$reject_request_id" "$BUSINESS_TOKEN" rejected
PENDING_REQUEST_IDS=()
require_inventory INVENTORY_AFTER_REJECT 3 0 3

idempotent_order="$(create_order CREATE_IDEMPOTENT_REQUEST 1 "s9-idempotent-$RUN_ID")"
idempotent_status="${idempotent_order%%|*}"
idempotent_request_id="${idempotent_order#*|}"
require_status CREATE_IDEMPOTENT_REQUEST "$idempotent_status" 201
[ -n "$idempotent_request_id" ] || { report "FAIL=missing_idempotent_request_id"; exit 1; }
PENDING_REQUEST_IDS+=("$idempotent_request_id")
wait_for_inventory HOLD_AFTER_IDEMPOTENT_FIRST 3 1 2

repeat_order="$(create_order REPEAT_IDEMPOTENT_REQUEST 1 "s9-idempotent-$RUN_ID")"
repeat_status="${repeat_order%%|*}"
repeat_request_id="${repeat_order#*|}"
if [ "$repeat_status" != "200" ] || [ "$repeat_request_id" != "$idempotent_request_id" ]; then
  report "FAIL=idempotency status=$repeat_status request_id=$repeat_request_id"
  exit 1
fi
report "PASS=IDEMPOTENCY"
require_inventory HOLD_AFTER_IDEMPOTENT_REPEAT 3 1 2

idempotent_cancel="$(request CANCEL_IDEMPOTENT_REQUEST POST "$API_BASE_URL/api/commercial/requests/$idempotent_request_id/transition/" '{"action":"cancel","reason_code":"s9_e2e","reason_text":"S9 cleanup."}' "$CUSTOMER_TOKEN")"
idempotent_cancel_status="${idempotent_cancel%%|*}"
require_status CANCEL_IDEMPOTENT_REQUEST "$idempotent_cancel_status" 200
PENDING_REQUEST_IDS=()
require_inventory INVENTORY_AFTER_IDEMPOTENT_CANCEL 3 0 3

overstock_order="$(create_order CREATE_OVERSTOCK_REQUEST 4 "s9-overstock-$RUN_ID")"
overstock_status="${overstock_order%%|*}"
overstock_request_id="${overstock_order#*|}"
if [ "$overstock_status" = "201" ] || [ -n "$overstock_request_id" ]; then
  report "FAIL=OVERSTOCK_UNEXPECTED_SUCCESS status=$overstock_status request_id=$overstock_request_id"
  exit 1
fi
report "PASS=OVERSTOCK_REJECTED HTTP=$overstock_status"
require_inventory INVENTORY_AFTER_OVERSTOCK 3 0 3

RESULT="PASSED"
