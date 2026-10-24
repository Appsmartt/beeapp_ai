import json
import urllib.error
import urllib.request

SUCCESS_RESPONSE_LIMIT = 262144
ERROR_RESPONSE_LIMIT = 4096
REQUEST_TIMEOUT_SECONDS = 20


def request(method, url, headers=None, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request_object = urllib.request.Request(
        url,
        data=body,
        headers=headers or {},
        method=method,
    )
    try:
        with urllib.request.urlopen(
            request_object,
            timeout=REQUEST_TIMEOUT_SECONDS,
        ) as response:
            raw = response.read(SUCCESS_RESPONSE_LIMIT)
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read(ERROR_RESPONSE_LIMIT)
        try:
            data = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            data = None
        return error.code, data


def rpc(supabase_url, anon_key, token, name, payload):
    return request(
        "POST",
        f"{supabase_url}/rest/v1/rpc/{name}",
        {
            "apikey": anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        payload,
    )


def backend_get(api_base, token, path):
    return request(
        "GET",
        api_base + path,
        {"Authorization": f"Bearer {token}"},
    )
