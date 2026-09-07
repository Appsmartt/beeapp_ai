#!/usr/bin/env bash

set -u
set -o pipefail

API_BASE_URL="${BEEAPP_API_BASE_URL:-http://192.168.1.5:8000}"
ACCESS_TOKEN="${BEEAPP_COMMERCE_TEST_TOKEN:-}"
RUN_ID="${BEEAPP_TEST_RUN_ID:-commerce-$(date -u +%Y%m%dT%H%M%SZ)-$$}"

response_file="$(mktemp)"
http_status=""
created_request_id=""
idempotency_key="bloque4-${RUN_ID}"

cleanup_file() {
  rm -f "$response_file"
}

print_response() {
  if [ -s "$response_file" ]; then
    jq '
      walk(
        if type == "object" then
          del(
            .access_token,
            .refresh_token,
            .token,
            .authorization,
            .Authorization,
            .password,
            .private_details,
            .private_instructions,
            .signed_url,
            .signedURL,
            .url
          )
        else
          .
        end
      )
    ' "$response_file" 2>/dev/null || cat "$response_file"
    printf '\n'
  else
    printf '%s\n' '(Respuesta vacía)'
  fi
}

request() {
  local label="$1"
  local method="$2"
  local url="$3"
  local data="${4:-}"
  local key="${5:-}"
  local curl_status

  if [ -n "$data" ] && [ -n "$key" ]; then
    http_status="$(
      curl \
        --silent \
        --show-error \
        --output "$response_file" \
        --write-out '%{http_code}' \
        --request "$method" \
        --header "Authorization: Bearer $ACCESS_TOKEN" \
        --header 'Content-Type: application/json' \
        --header "Idempotency-Key: $key" \
        --data "$data" \
        "$url"
    )"
    curl_status=$?
  elif [ -n "$data" ]; then
    http_status="$(
      curl \
        --silent \
        --show-error \
        --output "$response_file" \
        --write-out '%{http_code}' \
        --request "$method" \
        --header "Authorization: Bearer $ACCESS_TOKEN" \
        --header 'Content-Type: application/json' \
        --data "$data" \
        "$url"
    )"
    curl_status=$?
  else
    http_status="$(
      curl \
        --silent \
        --show-error \
        --output "$response_file" \
        --write-out '%{http_code}' \
        --request "$method" \
        --header "Authorization: Bearer $ACCESS_TOKEN" \
        "$url"
    )"
    curl_status=$?
  fi

  printf '\n============================================================\n'
  printf '%s\n' "$label"
  printf 'HTTP_STATUS=%s\n' "$http_status"
  printf 'CURL_STATUS=%s\n' "$curl_status"
  print_response
}

if [ -z "$ACCESS_TOKEN" ]; then
  printf '%s\n' \
    'BEEAPP_COMMERCE_TEST_TOKEN no está configurado.'
  printf '%s\n' \
    'Exporta un token temporal en esta terminal antes de ejecutar el script.'
else
  printf '%s\n' \
    '=============================================================================='
  printf '%s\n' \
    'BLOQUE 4 — PRUEBA HTTP AUTENTICADA DE SOLICITUD COMERCIAL'
  printf '%s\n' \
    '=============================================================================='
  printf 'API_BASE_URL=%s\n' "$API_BASE_URL"
  printf 'RUN_ID=%s\n' "$RUN_ID"

  request \
    '1. PERFIL AUTENTICADO' \
    'GET' \
    "$API_BASE_URL/api/accounts/me/"

  request \
    '2. PERFILES COMERCIALES PUBLICOS' \
    'GET' \
    "$API_BASE_URL/api/commercial/public/profiles/?limit=50"

  product_offer_id=""
  product_profile_id=""

  while IFS= read -r candidate_profile_id; do
    if [ -n "$candidate_profile_id" ] \
      && [ -z "$product_offer_id" ]; then
      request \
        "2A. OFERTAS DEL PERFIL $candidate_profile_id" \
        'GET' \
        "$API_BASE_URL/api/commercial/public/profiles/$candidate_profile_id/offers/?offer_kind=product&limit=50"

      product_offer_id="$(
        jq -r '
          .offers[]
          | select(
              .offer_kind == "product"
              and (.modalities | index("pickup"))
            )
          | .id
          ' "$response_file" 2>/dev/null \
          | head -n 1
      )"

      if [ -n "$product_offer_id" ] \
        && [ "$product_offer_id" != "null" ]; then
        product_profile_id="$candidate_profile_id"
      else
        product_offer_id=""
      fi
    fi
  done <<EOF
$(jq -r '.profiles[]?.id // empty' "$response_file" 2>/dev/null)
EOF

  if [ -z "$product_offer_id" ] \
    || [ -z "$product_profile_id" ]; then
    printf '%s\n' \
      'NO_EJECUTADO: no existe una oferta pública de producto con modalidad pickup.'
    printf '%s\n' \
      'No se creó ninguna solicitud ni se modificaron datos.'
  else
    request_body="$(
      jq -n \
        --arg profile_id "$product_profile_id" \
        --arg offer_id "$product_offer_id" \
        --arg run_id "$RUN_ID" \
        '{
          request_type: "product_order",
          commercial_profile_id: $profile_id,
          requested_modality: "pickup",
          customer_note: ("Prueba HTTP Bloque 4 " + $run_id),
          currency_code: "COP",
          items: [
            {
              commercial_offer_id: $offer_id,
              quantity: 1
            }
          ]
        }'
    )"

    request \
      '3. CREAR SOLICITUD FORMAL' \
      'POST' \
      "$API_BASE_URL/api/commercial/requests/" \
      "$request_body" \
      "$idempotency_key"

    created_request_id="$(
      jq -r '.request.request_id // empty' \
        "$response_file" 2>/dev/null
    )"

    if [ "$http_status" = "201" ] \
      && [ -n "$created_request_id" ]; then
      request \
        '4. REPETIR CREACION CON IDEMPOTENCY-KEY' \
        'POST' \
        "$API_BASE_URL/api/commercial/requests/" \
        "$request_body" \
        "$idempotency_key"

      request \
        '5. LEER DETALLE FORMAL' \
        'GET' \
        "$API_BASE_URL/api/commercial/requests/$created_request_id/"

      request \
        '6. CANCELAR SOLICITUD DE PRUEBA' \
        'POST' \
        "$API_BASE_URL/api/commercial/requests/$created_request_id/transition/" \
        '{"action":"cancel","reason_code":"block4_http_test","reason_text":"Limpieza automática de prueba Bloque 4."}'

      printf '\n%s\n' \
        'LIMPIEZA: se solicitó cancelar la solicitud creada para la prueba.'
    else
      printf '\n%s\n' \
        'NO_LIMPIEZA: no se creó una solicitud nueva; no hay datos de prueba que cancelar.'
    fi
  fi
fi

cleanup_file
