from __future__ import annotations

from enum import StrEnum


class CommercialProfilePublicationStatus(StrEnum):
    PUBLISHED = "published"
    PAUSED = "paused"
    ARCHIVED = "archived"
    SUSPENDED = "suspended"


class CommercialVerificationStatus(StrEnum):
    NOT_REQUESTED = "not_requested"
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    REQUIRES_CORRECTION = "requires_correction"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class CommercialVerificationDocumentStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    REPLACED = "replaced"


class CommercialVerificationDocumentType(StrEnum):
    NATIONAL_ID = "national_id"
    TAX_ID = "tax_id"
    BUSINESS_REGISTRATION = "business_registration"
    BANK_CERTIFICATE = "bank_certificate"
    OTHER = "other"


class CommercialCatalogStatus(StrEnum):
    PUBLISHED = "published"
    PAUSED = "paused"
    ARCHIVED = "archived"


class CommercialOfferStatus(StrEnum):
    PUBLISHED = "published"
    PAUSED = "paused"
    ARCHIVED = "archived"


class CommercialOfferKind(StrEnum):
    PRODUCT = "product"
    SERVICE = "service"


class CommercialBusinessOfferType(StrEnum):
    PRODUCTS = "products"
    SERVICES = "services"
    MIXED = "mixed"


class CommercialModality(StrEnum):
    AT_ESTABLISHMENT = "at_establishment"
    IN_PERSON = "in_person"
    VIRTUAL = "virtual"
    HOME_VISIT = "home_visit"
    DELIVERY = "delivery"
    PICKUP = "pickup"
    PHONE_CALL = "phone_call"
    BUDDY_CHAT = "buddy_chat"


class CommercialPricingStrategy(StrEnum):
    FIXED = "fixed"
    STARTING_AT = "starting_at"
    FREE = "free"
    TO_BE_CONFIRMED = "to_be_confirmed"


class CommercialPaymentPolicy(StrEnum):
    NOT_REQUIRED = "not_required"
    REQUIRED_BEFORE_CONFIRMATION = "required_before_confirmation"
    REQUIRED_AFTER_SERVICE = "required_after_service"
    TO_BE_AGREED = "to_be_agreed"


class CommercialExternalPaymentType(StrEnum):
    NEQUI = "nequi"
    DAVIPLATA = "daviplata"
    BREB = "breb"
    BANK_ACCOUNT = "bank_account"


class CommercialPaymentMethodStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class CommercialRequestType(StrEnum):
    PRODUCT_ORDER = "product_order"
    SERVICE_REQUEST = "service_request"
    BOOKING_REQUEST = "booking_request"


class CommercialRequestStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    PROPOSAL_SENT = "proposal_sent"
    ACCEPTED = "accepted"
    PAYMENT_PENDING = "payment_pending"
    PAYMENT_SUBMITTED = "payment_submitted"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    DISPUTED = "disputed"


class CommercialRequestEventType(StrEnum):
    CREATED = "created"
    SUBMITTED = "submitted"
    STATUS_CHANGED = "status_changed"
    PROPOSAL_CREATED = "proposal_created"
    PROPOSAL_ACCEPTED = "proposal_accepted"
    PAYMENT_REQUESTED = "payment_requested"
    PAYMENT_PROOF_SUBMITTED = "payment_proof_submitted"
    PAYMENT_PROOF_CONFIRMED = "payment_proof_confirmed"
    PAYMENT_PROOF_REJECTED = "payment_proof_rejected"
    RESERVATION_HOLD_CREATED = "reservation_hold_created"
    RESERVATION_HOLD_EXPIRED = "reservation_hold_expired"
    RESERVATION_CONFIRMED = "reservation_confirmed"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_RESOLVED = "dispute_resolved"
    SYSTEM_NOTE = "system_note"


class CommercialProposalStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"


class CommercialInventoryHoldStatus(StrEnum):
    ACTIVE = "active"
    CONSUMED = "consumed"
    RELEASED = "released"
    EXPIRED = "expired"


class CommercialReservationStatus(StrEnum):
    PROPOSED = "proposed"
    HOLD = "hold"
    PAYMENT_PENDING = "payment_pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"
    NO_SHOW = "no_show"


class CommercialReservationEventType(StrEnum):
    CREATED = "created"
    PROPOSAL_SELECTED = "proposal_selected"
    HOLD_CREATED = "hold_created"
    HOLD_EXPIRED = "hold_expired"
    PAYMENT_PENDING = "payment_pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"
    NO_SHOW = "no_show"
    CALENDAR_PROJECTION_CREATED = "calendar_projection_created"
    CALENDAR_PROJECTION_UPDATED = "calendar_projection_updated"
    CALENDAR_PROJECTION_FAILED = "calendar_projection_failed"
    SYSTEM_NOTE = "system_note"


class CommercialPaymentProofStatus(StrEnum):
    SUBMITTED = "submitted"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    REPLACED = "replaced"


class CommercialPaymentProofEventType(StrEnum):
    SUBMITTED = "submitted"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    REPLACED = "replaced"
    SIGNED_URL_REQUESTED = "signed_url_requested"
    SYSTEM_NOTE = "system_note"


class CommercialDisputeStatus(StrEnum):
    OPENED = "opened"
    UNDER_REVIEW = "under_review"
    RESOLVED_FOR_CUSTOMER = "resolved_for_customer"
    RESOLVED_FOR_BUSINESS = "resolved_for_business"
    CLOSED = "closed"


class CommercialDisputeEventType(StrEnum):
    OPENED = "opened"
    EVIDENCE_ADDED = "evidence_added"
    UNDER_REVIEW = "under_review"
    RESOLUTION_PROPOSED = "resolution_proposed"
    RESOLVED_FOR_CUSTOMER = "resolved_for_customer"
    RESOLVED_FOR_BUSINESS = "resolved_for_business"
    CLOSED = "closed"
    SYSTEM_NOTE = "system_note"


class CommercialNotificationType(StrEnum):
    REQUEST_CREATED = "request_created"
    REQUEST_ACCEPTED = "request_accepted"
    REQUEST_REJECTED = "request_rejected"
    REQUEST_CANCELLED = "request_cancelled"
    REQUEST_EXPIRED = "request_expired"
    PROPOSAL_CREATED = "proposal_created"
    PROPOSAL_ACCEPTED = "proposal_accepted"
    PROPOSAL_REJECTED = "proposal_rejected"
    BOOKING_HOLD_CREATED = "booking_hold_created"
    BOOKING_HOLD_EXPIRED = "booking_hold_expired"
    BOOKING_CONFIRMED = "booking_confirmed"
    PAYMENT_DETAILS_AVAILABLE = "payment_details_available"
    PAYMENT_PROOF_SUBMITTED = "payment_proof_submitted"
    PAYMENT_PROOF_CONFIRMED = "payment_proof_confirmed"
    PAYMENT_PROOF_REJECTED = "payment_proof_rejected"
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_UPDATED = "dispute_updated"
    DISPUTE_RESOLVED = "dispute_resolved"


class CommercialChatEventType(StrEnum):
    REQUEST_REFERENCE = "commercial_request_reference"
    BOOKING_REFERENCE = "commercial_booking_reference"
    PAYMENT_REFERENCE = "commercial_payment_reference"
    DISPUTE_REFERENCE = "commercial_dispute_reference"


class CommercialAdminCapability(StrEnum):
    COMMERCIAL_VERIFICATION_REVIEW = "commercial.verification.review"
    COMMERCIAL_DISPUTE_REVIEW = "commercial.dispute.review"
    COMMERCIAL_PROFILE_SUSPEND = "commercial.profile.suspend"
    COMMERCIAL_AUDIT_READ = "commercial.audit.read"


def enum_values(enum_class: type[StrEnum]) -> tuple[str, ...]:
    return tuple(item.value for item in enum_class)
