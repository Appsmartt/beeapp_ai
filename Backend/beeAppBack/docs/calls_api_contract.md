# BeeApp Calls API Contract

Base path: `/api/calls/`

All endpoints require:

```http
Authorization: Bearer <Supabase access token>
Content-Type: application/json
```

The client selects `actor_identity_id` because one authenticated account may
operate more than one chat identity. Supabase verifies that the identity belongs
to the authenticated user and is an active participant in the conversation.

## Security boundaries

The frontend must never generate or choose:

- Agora channel names
- Agora UIDs
- Agora RTC tokens
- Agora token expiration values

Django generates the channel, retrieves the persisted participant UID from
Supabase, and generates a short-lived RTC token on the server.

The Agora App Certificate is server-only and must never be sent to a client.

## Direct-call UID rules

For a direct conversation:

- Initiator UID: `1`
- Recipient UID: `2`

Those values are created and persisted by Supabase. The frontend receives its
assigned UID but must not submit a client-selected UID.

For group calls, Django generates a positive random UID for a new participant.
Supabase enforces uniqueness for `(call_id, agora_uid)`.

## Call lifecycle

1. Initiator calls `POST /conversations/<conversation_id>/start/`.
2. The response contains `call` and `agora` credentials for the initiator.
3. The initiator joins the Agora channel with those credentials.
4. After Agora reports a successful join, the client calls
   `POST /<call_id>/confirm-joined/`.
5. Recipient calls `POST /<call_id>/join/` and receives its own credentials.
6. Recipient joins Agora and calls `confirm-joined` after successful SDK join.
7. The direct call becomes `active` when the recipient confirms.
8. On a token expiry warning, use `POST /<call_id>/refresh-token/`.
9. On SDK join failure before confirmation, use
   `POST /<call_id>/cancel-join-attempt/`.
10. On exit, call `POST /<call_id>/leave/` or `POST /<call_id>/end/` as
    appropriate.

## Start a call

`POST /conversations/<conversation_id>/start/`

Request:

```json
{
  "actor_identity_id": "uuid",
  "call_type": "voice"
}
```

`call_type` may be `voice` or `video`.

Success: `201 Created`

```json
{
  "call": {
    "id": "uuid",
    "conversation_id": "uuid",
    "call_type": "voice",
    "status": "ringing",
    "agora_channel_name": "beeapp_<server-generated-value>",
    "conversation_type": "direct"
  },
  "participant": {
    "identity_id": "uuid",
    "agora_uid": 1,
    "status": "invited"
  },
  "participants": [],
  "can_end_call": true,
  "can_kick_participants": false,
  "agora": {
    "app_id": "agora-app-id",
    "channel_name": "beeapp_<server-generated-value>",
    "uid": 1,
    "token": "short-lived-rtc-token",
    "expires_at": 0
  }
}
```

The response examples omit fields returned by Supabase that are not relevant to
the client flow.

## Join a call

`POST /<call_id>/join/`

Request:

```json
{
  "actor_identity_id": "uuid"
}
```

Success: `200 OK`

The response has the same shape as start. For direct calls, the receiver gets
the UID persisted by Supabase, normally `2`.

## Confirm successful Agora join

`POST /<call_id>/confirm-joined/`

Call this only after the Agora SDK reports a successful channel join.

Request:

```json
{
  "actor_identity_id": "uuid"
}
```

Success: `200 OK`

```json
{
  "participant": {
    "id": "uuid",
    "call_id": "uuid",
    "identity_id": "uuid",
    "agora_uid": 1,
    "status": "joined"
  }
}
```

## Refresh an RTC token

`POST /<call_id>/refresh-token/`

Request:

```json
{
  "actor_identity_id": "uuid"
}
```

Success: `200 OK`

The response has the same credentials shape as start and join. It does not
change call state or accept a call again.

## Handle SDK join failure

`POST /<call_id>/cancel-join-attempt/`

Request:

```json
{
  "actor_identity_id": "uuid",
  "failure_reason": "optional client-safe error summary"
}
```

Success: `200 OK`

Never send raw SDK logs, tokens, device identifiers, or credentials in
`failure_reason`.

## Decline, leave, and end

Decline a direct ringing call:

```text
POST /<call_id>/decline/
```

Leave a joined call:

```text
POST /<call_id>/leave/
```

End a call when permitted:

```text
POST /<call_id>/end/
```

Each request body contains:

```json
{
  "actor_identity_id": "uuid"
}
```

## Kick a group participant

`POST /<call_id>/kick/`

Only group owners and admins may use this endpoint, and the target must be
joined.

```json
{
  "actor_identity_id": "uuid",
  "target_identity_id": "uuid"
}
```

A client cannot remove itself; it must use `leave`.

## Read call data

Call detail:

```text
GET /<call_id>/?actor_identity_id=<uuid>
```

Active conversation call:

```text
GET /conversations/<conversation_id>/active/?actor_identity_id=<uuid>
```

Conversation history:

```text
GET /conversations/<conversation_id>/history/?actor_identity_id=<uuid>&limit=50
```

The history limit is from `1` to `100`.

Read endpoints do not return Agora RTC credentials.

## HTTP errors

- `400`: Invalid payload or request.
- `401`: Missing, invalid, or expired Bearer access token.
- `403`: Identity, membership, or role is not authorized.
- `404`: Call is not accessible or does not exist.
- `409`: Call state or participant capacity prevents the action.
- `429`: Rate limit exceeded.
- `503`: RTC token could not be generated.

## Client reminders

- Do not log or persist RTC tokens.
- Do not expose the Agora App Certificate.
- Do not call `confirm-joined` until the Agora SDK reports success.
- On token expiry warnings, obtain a fresh token and renew it through the SDK.
- On disconnect, update UI from call detail/realtime state and use the
  appropriate leave or retry flow.

## Group-call eligibility

Calls are supported only for interactive groups with:

```text
posting_policy = all_members
```

Broadcast groups with `posting_policy = admins_only` cannot start or host group
calls in V1. The API returns the error code:

```text
CALL_GROUP_CALLS_NOT_ALLOWED
```
