import json
import urllib.error
import urllib.request

REQUEST_TIMEOUT_SECONDS = 30


def request(method, url, token=None, api_key=None, body=None, headers=None):
    request_headers = {"Accept": "application/json"}

    if api_key:
        request_headers["apikey"] = api_key

    if token:
        request_headers["Authorization"] = "Bearer " + token

    if headers:
        request_headers.update(headers)

    request_body = None
    if body is not None:
        if isinstance(body, bytes):
            request_body = body
        else:
            request_headers.setdefault("Content-Type", "application/json")
            request_body = json.dumps(body).encode("utf-8")

    request_object = urllib.request.Request(
        url,
        data=request_body,
        headers=request_headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(
            request_object,
            timeout=REQUEST_TIMEOUT_SECONDS,
        ) as response:
            return response.status, response.read(262144)
    except urllib.error.HTTPError as error:
        return error.code, error.read(262144)


def parse_json(raw):
    if not raw:
        return None
    return json.loads(raw.decode("utf-8"))
