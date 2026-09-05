from __future__ import annotations

from dataclasses import dataclass

from apps.commercial.exceptions import CommercialStateError


@dataclass(frozen=True)
class RequestTransition:
    action: str
    actor_kind: str
    from_statuses: frozenset[str]
    to_status: str


CUSTOMER = "customer"
BUSINESS_OWNER = "business_owner"
ADMIN = "admin"
SYSTEM = "system"

TRANSITIONS = (
    RequestTransition(
        action="submit",
        actor_kind=CUSTOMER,
        from_statuses=frozenset({"draft"}),
        to_status="submitted",
    ),
    RequestTransition(
        action="start_review",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"submitted"}),
        to_status="under_review",
    ),
    RequestTransition(
        action="accept",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"submitted", "under_review", "proposal_sent"}),
        to_status="accepted",
    ),
    RequestTransition(
        action="send_proposal",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"submitted", "under_review", "proposal_sent"}),
        to_status="proposal_sent",
    ),
    RequestTransition(
        action="counter_offer",
        actor_kind=CUSTOMER,
        from_statuses=frozenset({"proposal_sent"}),
        to_status="proposal_sent",
    ),
    RequestTransition(
        action="accept_proposal",
        actor_kind=CUSTOMER,
        from_statuses=frozenset({"proposal_sent"}),
        to_status="accepted",
    ),
    RequestTransition(
        action="request_payment",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"accepted"}),
        to_status="payment_pending",
    ),
    RequestTransition(
        action="submit_payment_proof",
        actor_kind=CUSTOMER,
        from_statuses=frozenset({"payment_pending"}),
        to_status="payment_submitted",
    ),
    RequestTransition(
        action="confirm_payment",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"payment_submitted"}),
        to_status="confirmed",
    ),
    RequestTransition(
        action="reject_payment_proof",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"payment_submitted"}),
        to_status="payment_pending",
    ),
    RequestTransition(
        action="complete",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"confirmed"}),
        to_status="completed",
    ),
    RequestTransition(
        action="reject",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"submitted", "under_review", "proposal_sent", "accepted"}),
        to_status="rejected",
    ),
    RequestTransition(
        action="cancel",
        actor_kind=CUSTOMER,
        from_statuses=frozenset({"draft", "submitted", "under_review", "proposal_sent", "accepted", "payment_pending"}),
        to_status="cancelled",
    ),
    RequestTransition(
        action="cancel",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"submitted", "under_review", "proposal_sent", "accepted", "payment_pending"}),
        to_status="cancelled",
    ),
    RequestTransition(
        action="open_dispute",
        actor_kind=CUSTOMER,
        from_statuses=frozenset({"payment_submitted", "confirmed", "completed"}),
        to_status="disputed",
    ),
    RequestTransition(
        action="open_dispute",
        actor_kind=BUSINESS_OWNER,
        from_statuses=frozenset({"payment_submitted", "confirmed", "completed"}),
        to_status="disputed",
    ),
    RequestTransition(
        action="expire",
        actor_kind=SYSTEM,
        from_statuses=frozenset({"submitted", "under_review", "proposal_sent", "accepted", "payment_pending"}),
        to_status="expired",
    ),
)


def resolve_request_transition(*, action: str, actor_kind: str, current_status: str) -> RequestTransition:
    for transition in TRANSITIONS:
        if (
            transition.action == action
            and transition.actor_kind == actor_kind
            and current_status in transition.from_statuses
        ):
            return transition

    raise CommercialStateError(
        code="invalid_request_transition",
        message=(
            f"Action '{action}' is not allowed for actor '{actor_kind}' "
            f"from request status '{current_status}'."
        ),
    )


def is_terminal_request_status(status: str) -> bool:
    return status in {"completed", "rejected", "cancelled", "expired", "disputed"}
