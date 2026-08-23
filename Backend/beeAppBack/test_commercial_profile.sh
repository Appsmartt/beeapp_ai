#!/usr/bin/env bash

set -Eeuo pipefail

BASE_URL="${BEEAPP_BASE_URL:-http://127.0.0.1:8000}"
TEMP_DIR="$(mktemp -d)"
LOGO_PATH="$TEMP_DIR/beeapp-commercial-logo.png"
PAYLOAD_PATH="$TEMP_DIR/create-commercial-profile.json"

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: '$command_name' is required but was not found."
    exit 1
  fi
}

require_command curl
require_command python

echo "=============================================="
echo "BeeApp — Commercial Profile API Test"
echo "Backend: $BASE_URL"
echo "=============================================="
echo

read -r -p "Email: " BEEAPP_EMAIL
read -r -s -p "Password: " BEEAPP_PASSWORD
echo
echo

if [[ -z "$BEEAPP_EMAIL" || -z "$BEEAPP_PASSWORD" ]]; then
  echo "Error: email and password are required."
  exit 1
fi

LOGIN_RESPONSE="$(
  curl -sS \
    -X POST \
    -H "Content-Type: application/json" \
    --data-binary @- \
    "$BASE_URL/api/accounts/login/" <<JSON
{
  "email": "$BEEAPP_EMAIL",
  "password": "$BEEAPP_PASSWORD"
}
JSON
)"

ACCESS_TOKEN="$(
  printf '%s' "$LOGIN_RESPONSE" | python -c '
import json
import sys

try:
    data = json.load(sys.stdin)
    print(data["session"]["access_token"])
except Exception:
    sys.exit(1)
'
)" || {
  echo "Error: login failed or access_token was not returned."
  echo "Response:"
  printf '%s\n' "$LOGIN_RESPONSE" | python -m json.tool 2>/dev/null || printf '%s\n' "$LOGIN_RESPONSE"
  exit 1
}

echo "✓ Login successful."
echo

api_get() {
  local path="$1"

  curl -sS \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$BASE_URL$path"
}

api_post_json() {
  local path="$1"
  local json_file="$2"

  curl -sS \
    -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary "@$json_file" \
    "$BASE_URL$path"
}

echo "1/5 — Reading root service categories..."
SERVICE_CATEGORIES_RESPONSE="$(api_get "/api/commercial/categories/?offer_type=services")"

printf '%s' "$SERVICE_CATEGORIES_RESPONSE" | python -m json.tool

TECHNICAL_CATEGORY_ID="$(
  printf '%s' "$SERVICE_CATEGORIES_RESPONSE" | python -c '
import json
import sys

data = json.load(sys.stdin)

for category in data.get("categories", []):
    if category.get("slug") == "services-technical-repairs":
        print(category["id"])
        break
else:
    sys.exit(1)
'
)" || {
  echo "Error: 'Servicios técnicos y reparaciones' category was not found."
  exit 1
}

echo
echo "2/5 — Reading technical subcategories..."
TECHNICAL_SUBCATEGORIES_RESPONSE="$(
  api_get "/api/commercial/categories/?offer_type=services&parent_id=$TECHNICAL_CATEGORY_ID"
)"

printf '%s' "$TECHNICAL_SUBCATEGORIES_RESPONSE" | python -m json.tool

APPLIANCES_CATEGORY_ID="$(
  printf '%s' "$TECHNICAL_SUBCATEGORIES_RESPONSE" | python -c '
import json
import sys

data = json.load(sys.stdin)

for category in data.get("categories", []):
    if category.get("slug") == "services-technical-appliances":
        print(category["id"])
        break
else:
    sys.exit(1)
'
)" || {
  echo "Error: 'Electrodomésticos' category was not found."
  exit 1
}

echo
echo "3/5 — Reading appliance activities..."
APPLIANCE_ACTIVITIES_RESPONSE="$(
  api_get "/api/commercial/categories/?offer_type=services&parent_id=$APPLIANCES_CATEGORY_ID"
)"

printf '%s' "$APPLIANCE_ACTIVITIES_RESPONSE" | python -m json.tool

WASHER_REPAIR_CATEGORY_ID="$(
  printf '%s' "$APPLIANCE_ACTIVITIES_RESPONSE" | python -c '
import json
import sys

data = json.load(sys.stdin)

for category in data.get("categories", []):
    if category.get("slug") == "services-technical-appliances-washer-repair":
        print(category["id"])
        break
else:
    sys.exit(1)
'
)" || {
  echo "Error: 'Reparación de lavadoras' category was not found."
  exit 1
}

echo
echo "4/5 — Generating and uploading test logo..."

python - "$LOGO_PATH" <<'PY'
from pathlib import Path
import base64
import sys

png_data = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
    "AAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0WQAAAABJRU5ErkJggg=="
)

Path(sys.argv[1]).write_bytes(png_data)
PY

UPLOAD_RESPONSE="$(
  curl -sS \
    -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "file=@$LOGO_PATH;type=image/png" \
    "$BASE_URL/api/storage/uploads/"
)"

printf '%s' "$UPLOAD_RESPONSE" | python -m json.tool

LOGO_FILE_ID="$(
  printf '%s' "$UPLOAD_RESPONSE" | python -c '
import json
import sys

data = json.load(sys.stdin)

files = data.get("files", [])
if len(files) != 1:
    sys.exit(1)

file_record = files[0]

if file_record.get("kind") != "image":
    sys.exit(1)

if file_record.get("status") != "ready":
    sys.exit(1)

print(file_record["id"])
'
)" || {
  echo "Error: test logo upload failed or did not return a ready image."
  exit 1
}

echo
echo "5/5 — Creating commercial profile..."

cat > "$PAYLOAD_PATH" <<JSON
{
  "offer_type": "services",
  "category_id": "$WASHER_REPAIR_CATEGORY_ID",
  "display_name": "Servicio Técnico de Prueba",
  "description": "Perfil de prueba para validar la creación de servicios comerciales.",
  "country_code": "CO",
  "city": "Montería",
  "neighborhood": "Montería y municipios cercanos",
  "is_address_public": false,
  "is_phone_public": false,
  "is_email_public": false,
  "logo_file_id": "$LOGO_FILE_ID",
  "is_public": false,
  "is_available": true,
  "modalities": [
    "home_visit",
    "phone_call",
    "buddy_chat"
  ],
  "hours": [
    {
      "day_of_week": 0,
      "is_closed": true
    },
    {
      "day_of_week": 1,
      "is_closed": false,
      "opens_at": "08:00:00",
      "closes_at": "18:00:00"
    },
    {
      "day_of_week": 2,
      "is_closed": false,
      "opens_at": "08:00:00",
      "closes_at": "18:00:00"
    },
    {
      "day_of_week": 3,
      "is_closed": false,
      "opens_at": "08:00:00",
      "closes_at": "18:00:00"
    },
    {
      "day_of_week": 4,
      "is_closed": false,
      "opens_at": "08:00:00",
      "closes_at": "18:00:00"
    },
    {
      "day_of_week": 5,
      "is_closed": false,
      "opens_at": "08:00:00",
      "closes_at": "18:00:00"
    },
    {
      "day_of_week": 6,
      "is_closed": false,
      "opens_at": "09:00:00",
      "closes_at": "13:00:00"
    }
  ]
}
JSON

CREATE_PROFILE_RESPONSE="$(
  api_post_json "/api/commercial/profiles/" "$PAYLOAD_PATH"
)"

printf '%s' "$CREATE_PROFILE_RESPONSE" | python -m json.tool

COMMERCIAL_PROFILE_ID="$(
  printf '%s' "$CREATE_PROFILE_RESPONSE" | python -c '
import json
import sys

data = json.load(sys.stdin)

profile = data.get("profile")
if not profile or not profile.get("id"):
    sys.exit(1)

print(profile["id"])
'
)" || {
  echo "Error: commercial profile was not created."
  exit 1
}

echo
echo "Verifying created commercial profile..."

PROFILE_RESPONSE="$(
  api_get "/api/commercial/profiles/$COMMERCIAL_PROFILE_ID/"
)"

printf '%s' "$PROFILE_RESPONSE" | python -m json.tool

echo
echo "=============================================="
echo "✓ Commercial profile test completed successfully."
echo "Profile ID: $COMMERCIAL_PROFILE_ID"
echo "Logo file ID: $LOGO_FILE_ID"
echo "=============================================="
