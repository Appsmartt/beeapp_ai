#!/usr/bin/env bash

set -u

BASE_URL="${BEEAPP_BASE_URL:-http://127.0.0.1:8000}"
LOGIN_URL="${BASE_URL}/api/accounts/login/"
FOLLOWS_URL="${BASE_URL}/api/statuses/follows/"
TMP_DIR="$(mktemp -d)"

A_TOKEN=""
A_USER_ID=""
B_TOKEN=""
B_USER_ID=""
FOLLOW_ID=""

cleanup() {
  if [[ -n "${FOLLOW_ID}" && -n "${A_TOKEN}" ]]; then
    curl \
      --silent \
      --output /dev/null \
      --request DELETE \
      --header "Authorization: Bearer ${A_TOKEN}" \
      "${FOLLOWS_URL}${FOLLOW_ID}/" \
      || true
  fi

  unset A_EMAIL A_PASSWORD B_EMAIL B_PASSWORD
  unset A_TOKEN A_USER_ID B_TOKEN B_USER_ID FOLLOW_ID
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

fail() {
  printf '\n✗ PRUEBA FALLÓ: %s\n' "$1" >&2
  return 1
}

print_response() {
  local file="$1"
  python -m json.tool < "$file" 2>/dev/null || cat "$file"
}

login_account() {
  local label="$1"
  local email="$2"
  local password="$3"
  local output_file="$4"
  local payload
  local http_status

  payload="$(
    LOGIN_EMAIL="$email" LOGIN_PASSWORD="$password" \
    python - <<'PY'
import json
import os

print(json.dumps({
    "email": os.environ["LOGIN_EMAIL"],
    "password": os.environ["LOGIN_PASSWORD"],
}))
PY
  )"

  http_status="$(
    curl \
      --silent \
      --show-error \
      --output "$output_file" \
      --write-out '%{http_code}' \
      --request POST \
      --header "Content-Type: application/json" \
      --data "$payload" \
      "$LOGIN_URL" \
      2>/dev/null
  )"

  unset payload

  if [[ "$http_status" != "200" ]]; then
    printf 'Login de %s falló con HTTP %s.\n' \
      "$label" "$http_status" >&2
    print_response "$output_file"
    return 1
  fi
}

extract_login_values() {
  local input_file="$1"

  python - "$input_file" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as file:
    payload = json.load(file)

token = payload["session"]["access_token"]
user_id = payload["user"]["id"]

if not isinstance(token, str) or not token.strip():
    raise ValueError("access_token inválido")

if not isinstance(user_id, str) or not user_id.strip():
    raise ValueError("user.id inválido")

print(token)
print(user_id)
PY
}

extract_follow_id() {
  local input_file="$1"

  python - "$input_file" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as file:
    payload = json.load(file)

follow = payload["follow"]

if follow.get("state") != "pending":
    raise ValueError(
        f"estado esperado pending, recibido {follow.get('state')!r}"
    )

print(follow["id"])
PY
}

assert_list_contains() {
  local input_file="$1"
  local expected_follow_id="$2"
  local expected_state="$3"
  local label="$4"

  python - \
    "$input_file" \
    "$expected_follow_id" \
    "$expected_state" \
    "$label" <<'PY'
import json
import sys

path, follow_id, state, label = sys.argv[1:5]

with open(path, encoding="utf-8") as file:
    payload = json.load(file)

items = payload.get("items")

if not isinstance(items, list):
    raise SystemExit(f"{label}: items no es lista")

match = next(
    (item for item in items if item.get("id") == follow_id),
    None,
)

if not match:
    raise SystemExit(
        f"{label}: no contiene follow de prueba"
    )

if match.get("state") != state:
    raise SystemExit(
        f"{label}: estado {match.get('state')!r}, "
        f"esperado {state!r}"
    )

target = match.get("target")

if not isinstance(target, dict):
    raise SystemExit(f"{label}: target inválido")

for key in (
    "actor_type",
    "profile_id",
    "commercial_profile_id",
    "display_name",
    "avatar_file_id",
    "is_available",
):
    if key not in target:
        raise SystemExit(
            f"{label}: falta target.{key}"
        )

print(f"✓ {label}: relación {state} encontrada.")
PY
}

request_follow() {
  local output_file="$1"
  local payload
  local http_status

  payload="$(
    TARGET_PROFILE_ID="$B_USER_ID" \
    python - <<'PY'
import json
import os

print(json.dumps({
    "target_actor_type": "profile",
    "target_profile_id": os.environ["TARGET_PROFILE_ID"],
}))
PY
  )"

  http_status="$(
    curl \
      --silent \
      --show-error \
      --output "$output_file" \
      --write-out '%{http_code}' \
      --request POST \
      --header "Content-Type: application/json" \
      --header "Authorization: Bearer ${A_TOKEN}" \
      --data "$payload" \
      "$FOLLOWS_URL" \
      2>/dev/null
  )"

  unset payload

  if [[ "$http_status" != "201" ]]; then
    printf 'Solicitud falló con HTTP %s.\n' "$http_status" >&2
    print_response "$output_file"
    return 1
  fi
}

accept_follow() {
  local output_file="$1"
  local http_status

  http_status="$(
    curl \
      --silent \
      --show-error \
      --output "$output_file" \
      --write-out '%{http_code}' \
      --request POST \
      --header "Authorization: Bearer ${B_TOKEN}" \
      "${FOLLOWS_URL}${FOLLOW_ID}/accept/" \
      2>/dev/null
  )"

  if [[ "$http_status" != "200" ]]; then
    printf 'Aceptación falló con HTTP %s.\n' "$http_status" >&2
    print_response "$output_file"
    return 1
  fi

  python - "$output_file" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as file:
    payload = json.load(file)

if payload["follow"].get("state") != "accepted":
    raise SystemExit("La solicitud no quedó accepted")

print("✓ Solicitud aceptada.")
PY
}

get_list() {
  local token="$1"
  local url="$2"
  local output_file="$3"
  local http_status

  http_status="$(
    curl \
      --silent \
      --show-error \
      --output "$output_file" \
      --write-out '%{http_code}' \
      --header "Authorization: Bearer ${token}" \
      "$url" \
      2>/dev/null
  )"

  if [[ "$http_status" != "200" ]]; then
    printf 'Lista falló con HTTP %s.\n' "$http_status" >&2
    print_response "$output_file"
    return 1
  fi
}

if ! command -v curl >/dev/null 2>&1; then
  fail "curl no está instalado."
  exit 0
fi

if ! command -v python >/dev/null 2>&1; then
  fail "python no está disponible."
  exit 0
fi

printf 'BeeApp Estados — prueba privada con listas\n'
printf 'Base URL: %s\n\n' "$BASE_URL"

read -r -p "Correo cuenta A (solicita seguimiento): " A_EMAIL
read -r -s -p "Contraseña cuenta A: " A_PASSWORD
printf '\n'

read -r -p "Correo cuenta B (recibe y acepta): " B_EMAIL
read -r -s -p "Contraseña cuenta B: " B_PASSWORD
printf '\n'

if [[ -z "${A_EMAIL// }" || -z "${A_PASSWORD}" ]]; then
  fail "credenciales de A obligatorias."
  exit 0
fi

if [[ -z "${B_EMAIL// }" || -z "${B_PASSWORD}" ]]; then
  fail "credenciales de B obligatorias."
  exit 0
fi

printf '\n1/8 — Login A...\n'
login_account "A" "$A_EMAIL" "$A_PASSWORD" \
  "$TMP_DIR/login_a.json" || exit 0

A_VALUES="$(extract_login_values "$TMP_DIR/login_a.json")" || {
  fail "sesión A inválida."
  exit 0
}

A_TOKEN="$(printf '%s\n' "$A_VALUES" | sed -n '1p')"
A_USER_ID="$(printf '%s\n' "$A_VALUES" | sed -n '2p')"
unset A_VALUES A_EMAIL A_PASSWORD
printf '✓ Cuenta A autenticada.\n'

printf '\n2/8 — Login B...\n'
login_account "B" "$B_EMAIL" "$B_PASSWORD" \
  "$TMP_DIR/login_b.json" || exit 0

B_VALUES="$(extract_login_values "$TMP_DIR/login_b.json")" || {
  fail "sesión B inválida."
  exit 0
}

B_TOKEN="$(printf '%s\n' "$B_VALUES" | sed -n '1p')"
B_USER_ID="$(printf '%s\n' "$B_VALUES" | sed -n '2p')"
unset B_VALUES B_EMAIL B_PASSWORD

if [[ "$A_USER_ID" == "$B_USER_ID" ]]; then
  fail "A y B deben ser cuentas diferentes."
  exit 0
fi

printf '✓ Cuenta B autenticada.\n'

printf '\n3/8 — A solicita seguir a B...\n'
request_follow "$TMP_DIR/request.json" || exit 0

FOLLOW_ID="$(extract_follow_id "$TMP_DIR/request.json")" || {
  fail "respuesta de solicitud inválida."
  exit 0
}

printf '✓ Solicitud pending creada.\n'

printf '\n4/8 — Validando siguiendo de A...\n'
get_list \
  "$A_TOKEN" \
  "${FOLLOWS_URL}following/?limit=50" \
  "$TMP_DIR/following_pending.json" \
  || exit 0

assert_list_contains \
  "$TMP_DIR/following_pending.json" \
  "$FOLLOW_ID" \
  "pending" \
  "A siguiendo" \
  || exit 0

printf '\n5/8 — Validando solicitudes recibidas por B...\n'
get_list \
  "$B_TOKEN" \
  "${FOLLOWS_URL}requests/?limit=50" \
  "$TMP_DIR/requests_pending.json" \
  || exit 0

assert_list_contains \
  "$TMP_DIR/requests_pending.json" \
  "$FOLLOW_ID" \
  "pending" \
  "B solicitudes" \
  || exit 0

printf '\n6/8 — B acepta...\n'
accept_follow "$TMP_DIR/accepted.json" || exit 0

printf '\n7/8 — Validando following accepted de A...\n'
get_list \
  "$A_TOKEN" \
  "${FOLLOWS_URL}following/?limit=50" \
  "$TMP_DIR/following_accepted.json" \
  || exit 0

assert_list_contains \
  "$TMP_DIR/following_accepted.json" \
  "$FOLLOW_ID" \
  "accepted" \
  "A siguiendo" \
  || exit 0

printf '\n8/8 — Validando seguidores accepted de B...\n'
get_list \
  "$B_TOKEN" \
  "${FOLLOWS_URL}followers/?limit=50" \
  "$TMP_DIR/followers_accepted.json" \
  || exit 0

assert_list_contains \
  "$TMP_DIR/followers_accepted.json" \
  "$FOLLOW_ID" \
  "accepted" \
  "B seguidores" \
  || exit 0

printf '\nLimpieza — A deja de seguir a B...\n'

HTTP_STATUS="$(
  curl \
    --silent \
    --show-error \
    --output "$TMP_DIR/unfollow.txt" \
    --write-out '%{http_code}' \
    --request DELETE \
    --header "Authorization: Bearer ${A_TOKEN}" \
    "${FOLLOWS_URL}${FOLLOW_ID}/" \
    2>/dev/null
)"

if [[ "$HTTP_STATUS" != "204" ]]; then
  printf 'Unfollow falló con HTTP %s.\n' "$HTTP_STATUS" >&2
  cat "$TMP_DIR/unfollow.txt"
  exit 0
fi

FOLLOW_ID=""

printf '✓ Seguimiento de prueba eliminado.\n'
printf '\n✓ PRUEBA COMPLETADA: personal pending → accepted y listas verificadas.\n'

exit 0
