export type CommercialOfferType =
  | 'products'
  | 'services'
  | 'mixed';

export type CommercialOfferKind =
  | 'product'
  | 'service';

export type CommercialModality =
  | 'at_establishment'
  | 'in_person'
  | 'virtual'
  | 'home_visit'
  | 'delivery'
  | 'pickup'
  | 'phone_call'
  | 'buddy_chat';

export type CommercialPricingStrategy =
  | 'fixed'
  | 'starting_at'
  | 'free'
  | 'to_be_confirmed';

export type CommercialPaymentPolicy =
  | 'not_required'
  | 'required_before_confirmation'
  | 'required_after_service'
  | 'to_be_agreed';

export type CommercialProfilePublicationStatus =
  | 'published'
  | 'paused'
  | 'archived'
  | 'suspended';

export type CommercialVerificationStatus =
  | 'not_requested'
  | 'draft'
  | 'pending_review'
  | 'requires_correction'
  | 'verified'
  | 'rejected'
  | 'suspended';

export type CommercialCatalogStatus =
  | 'published'
  | 'paused'
  | 'archived';

export type CommercialOfferStatus =
  | 'published'
  | 'paused'
  | 'archived';

export interface CommercialCategory {
  id: string;
  parent_id: string | null;
  offer_type: CommercialOfferType;
  name: string;
  slug: string;
  sort_order: number;
}

export interface CommercialCountry {
  country_code: string;
}

export interface CommercialCity {
  city: string;
}

export interface CommercialPublicLocation {
  address: string | null;
  neighborhood: string | null;
  location_reference: string | null;
  is_address_public: boolean;
}

export interface CommercialPublicContact {
  phone_dial_code: string | null;
  phone_number: string | null;
  email: string | null;
  is_phone_public: boolean;
  is_email_public: boolean;
}

export interface CommercialProfileHour {
  id?: string;
  commercial_profile_id?: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CommercialProfileModalityRecord {
  id?: string;
  commercial_profile_id: string;
  modality: CommercialModality;
  created_at?: string;
  updated_at?: string;
  status?: 'active' | 'archived';
  archived_at?: string | null;
}

export interface CommercialPublicProfile {
  id: string;
  display_name: string;
  description: string;
  offer_type: CommercialOfferType;
  category: CommercialCategory | null;
  custom_activity_text: string | null;
  country_code: string;
  city: string;
  location: CommercialPublicLocation;
  contact: CommercialPublicContact;
  logo_file_id: string | null;
  modalities: CommercialModality[];
  delivery_fee_mode:
    | 'not_offered'
    | 'free'
    | 'fixed'
    | 'to_be_confirmed'
    | null;
  delivery_currency_code: 'COP' | null;
  is_verified: boolean;
  timezone: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CommercialOwnedProfile {
  id: string;
  owner_id: string;
  offer_type: CommercialOfferType;
  category_id: string | null;
  custom_activity_text: string | null;
  display_name: string;
  description: string;
  country_code: string;
  city: string;
  address: string | null;
  neighborhood: string | null;
  location_reference: string | null;
  is_address_public: boolean;
  phone_dial_code: string | null;
  phone_number: string | null;
  is_phone_public: boolean;
  public_email: string | null;
  is_email_public: boolean;
  logo_file_id: string | null;
  is_public: boolean;
  is_available: boolean;
  publication_status: CommercialProfilePublicationStatus;
  verification_status: CommercialVerificationStatus;
  verification_badge_visible: boolean;
  timezone: string | null;
  booking_hold_minutes: number | null;
  inventory_hold_minutes: number | null;
  delivery_fee_mode:
    | 'not_offered'
    | 'free'
    | 'fixed'
    | 'to_be_confirmed'
    | null;
  delivery_fee_amount: number | null;
  delivery_currency_code: string | null;
  archived_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  modalities: CommercialProfileModalityRecord[];
  hours: CommercialProfileHour[];
  created_at: string | null;
  updated_at: string | null;
}

export interface CommercialOfferImage {
  id: string;
  file_id: string;
  display_name: string | null;
  mime_type: string | null;
  sort_order: number | null;
  is_primary: boolean;
  url: string | null;
  url_expires_in_seconds?: number;
  status?: 'active' | 'archived';
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CommercialPublicOffer {
  id: string;
  commercial_profile_id: string;
  catalog_id: string;
  offer_kind: CommercialOfferKind;
  title: string;
  description: string | null;
  pricing_strategy: CommercialPricingStrategy;
  base_price_amount: number | null;
  currency_code: 'COP';
  modalities: CommercialModality[];
  duration_minutes: number | null;
  requires_booking: boolean;
  payment_policy: CommercialPaymentPolicy | null;
  images: CommercialOfferImage[];
  created_at: string | null;
  updated_at: string | null;
}

export interface CommercialOwnedOffer {
  id: string;
  commercial_profile_id: string;
  catalog_id: string;
  offer_kind: CommercialOfferKind;
  title: string;
  description: string | null;
  pricing_strategy: CommercialPricingStrategy;
  base_price_amount: number | null;
  currency_code: 'COP';
  is_available: boolean;
  sort_order: number;
  status: CommercialOfferStatus;
  archived_at: string | null;
  track_inventory: boolean;
  stock_quantity: number | null;
  duration_minutes: number | null;
  requires_booking: boolean;
  payment_policy: CommercialPaymentPolicy | null;
  modalities: CommercialProfileModalityRecord[];
  images: CommercialOfferImage[];
  created_at: string | null;
  updated_at: string | null;
}

export interface CommercialCatalog {
  id: string;
  commercial_profile_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status?: CommercialCatalogStatus;
  archived_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PublicCommercialProfilesQuery {
  country_code?: string;
  city?: string;
  category_id?: string;
  offer_type?: CommercialOfferType;
  modality?: CommercialModality;
  verified_only?: boolean;
  delivery_only?: boolean;
  search?: string;
  ordering?: 'recent' | 'name';
  limit?: number;
  offset?: number;
}

export interface PublicCommercialOffersQuery {
  catalog_id?: string;
  offer_kind?: CommercialOfferKind;
  modality?: CommercialModality;
  requires_booking?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetPublicCommercialProfilesResponse {
  profiles: CommercialPublicProfile[];
  count: number;
  limit: number;
  offset: number;
  ordering: 'recent' | 'name';
}

export interface GetPublicCommercialProfileResponse {
  profile: CommercialPublicProfile;
}

export interface GetPublicCommercialCatalogsResponse {
  commercial_profile_id: string;
  catalogs: CommercialCatalog[];
}

export interface GetPublicCommercialOffersResponse {
  commercial_profile_id: string;
  offers: CommercialPublicOffer[];
  count: number;
  limit: number;
  offset: number;
}

export interface GetPublicCommercialOfferResponse {
  offer: CommercialPublicOffer;
}

export interface GetCommercialCountriesResponse {
  countries: CommercialCountry[];
}

export interface GetCommercialCitiesResponse {
  cities: CommercialCity[];
}

export interface GetCommercialCategoriesResponse {
  categories: CommercialCategory[];
}

export interface GetOwnedCommercialProfilesResponse {
  profiles: CommercialOwnedProfile[];
}

export interface GetOwnedCommercialCatalogsResponse {
  commercial_profile_id: string;
  catalogs: CommercialCatalog[];
}

export interface GetOwnedCommercialOffersResponse {
  commercial_profile_id: string;
  offers: CommercialOwnedOffer[];
}

export interface GetOwnedCommercialProfileResponse {
  profile: CommercialOwnedProfile;
}

export interface GetOwnedCommercialCatalogResponse {
  catalog: CommercialCatalog;
}

export interface GetOwnedCommercialOfferResponse {
  offer: CommercialOwnedOffer;
}
export interface CreateCommercialProfilePayload {
  offer_type: CommercialOfferType;
  category_id?: string | null;
  custom_activity_text?: string | null;
  display_name: string;
  description: string;
  country_code?: string;
  city: string;
  address?: string | null;
  neighborhood?: string | null;
  location_reference?: string | null;
  is_address_public?: boolean;
  phone_dial_code?: string | null;
  phone_number?: string | null;
  is_phone_public?: boolean;
  public_email?: string | null;
  is_email_public?: boolean;
  logo_file_id: string;
  is_public?: boolean;
  is_available?: boolean;
  modalities: CommercialModality[];
  hours?: CommercialProfileHour[];
}

export interface UpdateCommercialProfilePayload {
  offer_type?: CommercialOfferType;
  category_id?: string | null;
  custom_activity_text?: string | null;
  display_name?: string;
  description?: string;
  country_code?: string;
  city?: string;
  address?: string | null;
  neighborhood?: string | null;
  location_reference?: string | null;
  is_address_public?: boolean;
  phone_dial_code?: string | null;
  phone_number?: string | null;
  is_phone_public?: boolean;
  public_email?: string | null;
  is_email_public?: boolean;
  logo_file_id?: string | null;
  is_available?: boolean;
  timezone?: string;
  booking_hold_minutes?: number;
  inventory_hold_minutes?: number;
  delivery_fee_mode?: CommercialOwnedProfile['delivery_fee_mode'];
  delivery_fee_amount?: number | null;
  delivery_currency_code?: string;
  modalities?: CommercialModality[];
  hours?: CommercialProfileHour[];
}

export interface CreateCommercialProfileResponse {
  profile: CommercialOwnedProfile;
}

export interface UpdateCommercialProfileResponse {
  profile: CommercialOwnedProfile;
}

export interface CreateCommercialCatalogPayload {
  name: string;
  description?: string | null;
  sort_order?: number;
  status?: 'published' | 'paused';
}

export interface UpdateCommercialCatalogPayload {
  name?: string;
  description?: string | null;
  sort_order?: number;
}

export interface CreateCommercialCatalogResponse {
  catalog: CommercialCatalog;
}

export interface UpdateCommercialCatalogResponse {
  catalog: CommercialCatalog;
}

export interface CommercialCatalogMutationResponse {
  catalog: CommercialCatalog;
}

export interface CreateCommercialOfferPayload {
  catalog_id: string;
  offer_kind: CommercialOfferKind;
  title: string;
  description?: string | null;
  pricing_strategy?: CommercialPricingStrategy;
  base_price_amount?: number | null;
  currency_code?: 'COP';
  is_available?: boolean;
  sort_order?: number;
  status?: 'published' | 'paused';
  track_inventory?: boolean;
  stock_quantity?: number | null;
  duration_minutes?: number | null;
  requires_booking?: boolean;
  payment_policy?: CommercialPaymentPolicy | null;
  modalities?: CommercialModality[];
}

export interface UpdateCommercialOfferPayload {
  catalog_id?: string;
  title?: string;
  description?: string | null;
  pricing_strategy?: CommercialPricingStrategy;
  base_price_amount?: number | null;
  currency_code?: 'COP';
  is_available?: boolean;
  sort_order?: number;
  track_inventory?: boolean;
  stock_quantity?: number | null;
  duration_minutes?: number | null;
  requires_booking?: boolean;
  payment_policy?: CommercialPaymentPolicy | null;
}

export interface CreateCommercialOfferResponse {
  offer: CommercialOwnedOffer;
}

export interface UpdateCommercialOfferResponse {
  offer: CommercialOwnedOffer;
}

export interface CommercialOfferMutationResponse {
  offer: CommercialOwnedOffer;
}

export interface UpdateCommercialOfferModalitiesPayload {
  modalities: CommercialModality[];
}

export interface UpdateCommercialOfferModalitiesResponse {
  offer: CommercialOwnedOffer;
}

export interface AdjustCommercialOfferInventoryPayload {
  quantity_delta: number;
  reason_code: string;
  reason_text?: string | null;
}

export interface AdjustCommercialOfferInventoryResponse {
  available_inventory: number;
}

export interface CreateCommercialOfferImagePayload {
  file_id: string;
  sort_order?: number;
  is_primary?: boolean;
}

export interface UpdateCommercialOfferImagePayload {
  sort_order: number;
}

export interface CommercialOfferImageMutationResponse {
  image: CommercialOfferImage;
}

export interface CreateCommercialOfferImageResponse {
  image: CommercialOfferImage;
}

export type CommercialPaymentMethodType =
  | 'nequi'
  | 'daviplata'
  | 'breb'
  | 'bank_account';

export interface CommercialOwnedPaymentMethod {
  id: string;
  commercial_profile_id: string;
  payment_method_type: CommercialPaymentMethodType;
  display_name: string;
  public_details: Record<string, unknown>;
  private_details: Record<string, unknown>;
  public_instructions: string | null;
  private_instructions: string | null;
  available_before_acceptance: boolean;
  sort_order: number;
  status: 'active' | 'archived';
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateCommercialPaymentMethodPayload {
  payment_method_type: CommercialPaymentMethodType;
  display_name: string;
  public_details?: Record<string, unknown>;
  private_details?: Record<string, unknown>;
  public_instructions?: string | null;
  private_instructions?: string | null;
  available_before_acceptance?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCommercialPaymentMethodPayload {
  display_name?: string;
  public_details?: Record<string, unknown>;
  private_details?: Record<string, unknown>;
  public_instructions?: string | null;
  private_instructions?: string | null;
  available_before_acceptance?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface GetOwnedCommercialPaymentMethodsResponse {
  commercial_profile_id: string;
  payment_methods: CommercialOwnedPaymentMethod[];
}

export interface GetOwnedCommercialPaymentMethodResponse {
  payment_method: CommercialOwnedPaymentMethod;
}

export interface CreateCommercialPaymentMethodResponse {
  payment_method: CommercialOwnedPaymentMethod;
}

export interface UpdateCommercialPaymentMethodResponse {
  payment_method: CommercialOwnedPaymentMethod;
}

export interface CommercialPaymentMethodMutationResponse {
  payment_method: CommercialOwnedPaymentMethod;
}

export type CommercialRequestType =
  | 'product_order'
  | 'service_request'
  | 'booking_request';

export type CommercialRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'proposal_sent'
  | 'accepted'
  | 'payment_pending'
  | 'payment_submitted'
  | 'confirmed'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'disputed';

export type CommercialDeliveryFeeMode =
  | 'not_offered'
  | 'free'
  | 'fixed'
  | 'to_be_confirmed';

export interface CreateCommercialRequestItemPayload {
  commercial_offer_id: string;
  quantity?: number;
line_comment?: string;
}

export interface CreateCommercialRequestPayload {
  request_type: CommercialRequestType;
  commercial_profile_id: string;
  requested_modality?: CommercialModality | null;
  customer_note?: string;
  delivery_address?: string;
  delivery_reference?: string;
  currency_code?: 'COP';
  items: CreateCommercialRequestItemPayload[];
}

export interface CommercialRequestItem {
  id?: string;
  commercial_offer_id: string;
  commercial_profile_id?: string;
  offer_kind?: CommercialOfferKind;
  title?: string;
  quantity: number;
  unit_price_amount?: number | null;
  line_total_amount?: number | null;
  pricing_strategy?: CommercialPricingStrategy;
  requested_modality?: CommercialModality | null;
  requires_booking?: boolean;
  payment_policy?: CommercialPaymentPolicy | null;
  duration_minutes?: number | null;
  offer_snapshot?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CommercialRequest {
  id: string;
  request_type: CommercialRequestType;
  status: CommercialRequestStatus | string;
  commercial_profile_id: string;
  customer_id?: string;
  requested_modality: CommercialModality | null;
  customer_note: string | null;
  delivery_address: string | null;
  delivery_reference: string | null;
  delivery_fee_mode?: CommercialDeliveryFeeMode;
  subtotal_amount: number | null;
  delivery_fee_amount: number | null;
  total_amount: number | null;
  currency_code: 'COP';
  items: CommercialRequestItem[];
  created_at: string | null;
  updated_at: string | null;
  expires_at?: string | null;
}

export interface CreatedCommercialRequest {
  request_id: string;
  code: string;
  status: CommercialRequestStatus | string;
  idempotent: boolean;
}

export interface CreateCommercialRequestResponse {
  request: CreatedCommercialRequest;
  idempotent: boolean;
}


export interface CommercialRequestListItem {
  id: string;
  code: string;
  commercial_profile_id: string;
  request_type: CommercialRequestType;
  status: CommercialRequestStatus | string;
  requested_modality: CommercialModality | null;
  subtotal_amount: number | null;
  delivery_fee_amount: number | null;
  total_amount: number | null;
  currency_code: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface GetCommercialRequestsQuery {
  statuses?: Array<CommercialRequestStatus | string>;
  limit?: number;
  offset?: number;
}

export interface GetCommercialRequestsResponse {
  requests: CommercialRequestListItem[];
  count: number;
  limit: number;
  offset: number;
}


export interface CommercialRequestDetailItem {
id: string;
commercial_offer_id: string;
sort_order: number;
quantity: number;
offer_kind: 'product' | 'service';
title: string;
description: string | null;
pricing_strategy: CommercialPricingStrategy;
unit_price_amount: number | null;
currency_code: string;
modality: CommercialModality | null;
duration_minutes: number | null;
requires_booking: boolean;
payment_policy: CommercialPaymentPolicy | null;
line_total_amount: number | null;
offer_snapshot: Record<string, unknown>;
original_terms: Record<string, unknown>;
created_at: string;
updated_at: string | null;
}

export interface CommercialRequestDetail {
id: string;
code: string;
client_id: string;
commercial_profile_id: string;
business_snapshot?: Record<string, unknown>;
request_type: CommercialRequestType;
status: CommercialRequestStatus | string;
expires_at: string | null;
customer_note: string | null;
requested_modality: CommercialModality | null;
delivery_address: string | null;
delivery_reference: string | null;
subtotal_amount: number | null;
delivery_fee_amount: number | null;
total_amount: number | null;
currency_code: string;
final_terms: Record<string, unknown>;
created_at: string;
updated_at: string;
items: CommercialRequestDetailItem[];
}

export interface GetCommercialRequestResponse {
request: CommercialRequestDetail;
}

export type CommercialRequestActorRole =
  | 'customer'
  | 'business_owner';

export interface CommercialRequestBusinessContext {
  id: string;
  display_name: string;
  city: string | null;
  country_code: string | null;
  timezone: string | null;
}

export interface CommercialRequestProposal {
  id: string;
  version_number: number;
  proposed_by_profile_id: string;
  status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'superseded'
    | 'expired'
    | 'withdrawn';
  requested_modality: CommercialModality | null;
  subtotal_amount: number | null;
  delivery_fee_amount: number | null;
  total_amount: number | null;
  currency_code: string;
  proposed_starts_at: string | null;
  proposed_ends_at: string | null;
  timezone: string | null;
  note: string | null;
  terms_snapshot: Record<string, unknown>;
  responded_at: string | null;
  responded_by_profile_id: string | null;
  created_at: string;
}

export interface CommercialRequestTimelineEvent {
  id: string;
  event_type: string;
  previous_status: CommercialRequestStatus | null;
  new_status: CommercialRequestStatus | null;
  actor_profile_id: string | null;
  reason_code: string | null;
  reason_text: string | null;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CommercialRequestTimeline {
  request_id: string;
  request_status: CommercialRequestStatus | string;
  proposals: CommercialRequestProposal[];
  events: CommercialRequestTimelineEvent[];
}

export interface GetCommercialRequestTimelineResponse {
  timeline: CommercialRequestTimeline;
}

export interface CommercialPaymentMethodPublic {
  id: string;
  payment_method_type: CommercialPaymentMethodType;
  display_name: string;
  public_details: Record<string, unknown>;
  public_instructions: string | null;
  sort_order: number | null;
}

export interface GetCommercialRequestPaymentMethodsResponse {
  request_id: string;
  payment_methods: CommercialPaymentMethodPublic[];
}

export interface CommercialPaymentProof {
  id: string;
  commerce_request_id: string;
  commercial_profile_id: string;
  submitted_by_profile_id: string;
  file_id: string;
  payment_method_id: string | null;
  payment_method_snapshot: Record<string, unknown>;
  payment_reference: string | null;
  note: string | null;
  status: 'submitted' | 'confirmed' | 'rejected' | 'replaced';
  rejected_at: string | null;
  rejected_by_profile_id: string | null;
  rejection_reason: string | null;
  replaced_by_proof_id: string | null;
  confirmed_at: string | null;
  confirmed_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommercialRequestPermissions {
  can_start_review: boolean;
  can_accept: boolean;
  can_reject: boolean;
  can_cancel: boolean;
  can_create_proposal: boolean;
  can_accept_proposal: boolean;
  can_reject_proposal: boolean;
  can_withdraw_proposal: boolean;
  can_request_payment: boolean;
  can_view_payment_methods: boolean;
  can_submit_payment_proof: boolean;
  can_replace_payment_proof: boolean;
  can_review_payment_proof: boolean;
  can_create_reservation_hold: boolean;
  can_complete: boolean;
  can_open_dispute: boolean;
  can_open_chat: boolean;
}

export interface CommercialReservation {
  id: string;
  commerce_request_id: string;
  commercial_profile_id: string;
  commercial_offer_id: string;
  source_proposal_id: string | null;
  status:
    | 'proposed'
    | 'hold'
    | 'payment_pending'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'rejected'
    | 'expired'
    | 'no_show';
  starts_at: string;
  ends_at: string;
  timezone: string;
  hold_started_at: string | null;
  hold_expires_at: string | null;
  completed_at: string | null;
  no_show_at: string | null;
  no_show_marked_by_profile_id: string | null;
  no_show_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommercialDispute {
  id: string;
  commerce_request_id: string;
  commercial_profile_id: string;
  commerce_reservation_id: string | null;
  opened_by_profile_id: string;
  status:
    | 'opened'
    | 'under_review'
    | 'resolved_for_customer'
    | 'resolved_for_business'
    | 'closed';
  reason_code: string;
  reason_text: string | null;
  resolution_text: string | null;
  resolved_by_profile_id: string | null;
  resolved_at: string | null;
  closed_by_profile_id: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommercialRequestDetailContext {
  actor_role: CommercialRequestActorRole;
  business: CommercialRequestBusinessContext;
  permissions: CommercialRequestPermissions;
  timeline: CommercialRequestTimeline;
  payment_proofs: CommercialPaymentProof[];
  reservation: CommercialReservation | null;
  dispute: CommercialDispute | null;
}

export interface GetCommercialRequestFormalDetailResponse {
  request: CommercialRequestDetail;
  context: CommercialRequestDetailContext;
}

export interface CommercialRequestTransitionPayload {
  action:
    | 'start_review'
    | 'accept'
    | 'reject'
    | 'cancel';
  reason_code?: string | null;
  reason_text?: string | null;
}

export interface CommercialRequestTransitionResponse {
  request: {
    request_id: string;
    status: CommercialRequestStatus;
    previous_status: CommercialRequestStatus | null;
    action: string;
  };
}

export interface CreateCommercialReservationHoldPayload {
starts_at: string;
timezone: string;
}

export interface CreateCommercialReservationHoldResponse {
reservation_id: string;
request_id: string;
status: 'hold';
}

export interface CreateCommercialRequestProposalPayload {
  requested_modality?: CommercialModality | null;
  subtotal_amount?: number | null;
  delivery_fee_amount?: number | null;
  total_amount?: number | null;
  proposed_starts_at?: string | null;
  proposed_ends_at?: string | null;
  timezone?: string | null;
  note?: string | null;
  terms_snapshot?: Record<string, unknown>;
}

export interface CreateCommercialRequestProposalResponse {
  proposal: {
    proposal_id: string;
    request_id: string;
    version_number: number;
    status: 'pending';
    request_status: 'proposal_sent';
    proposed_by: CommercialRequestActorRole;
  };
}

export interface PaymentProofSubmissionPayload {
  file_id: string;
  payment_method_id: string;
  payment_reference?: string | null;
  note?: string | null;
}

export interface PaymentProofSubmissionResponse {
  payment_proof_id: string;
  request_id: string;
  status: 'submitted';
}

export interface ReviewCommercialPaymentProofPayload {
  decision: 'confirmed' | 'rejected';
  rejection_reason?: string | null;
}

export interface ReviewCommercialPaymentProofResponse {
  payment_proof_id: string;
  status: 'confirmed' | 'rejected';
}

export interface GetOwnedCommercialRequestsResponse
  extends GetCommercialRequestsResponse {
  commercial_profile_id: string;
}

export interface CompleteCommercialRequestPayload {
  completion_note?: string | null;
}

export interface CompleteCommercialRequestResponse {
  request_id: string;
  status: 'completed';
}

export interface CommercialRequestProposalMutationResponse {
  proposal_id: string;
  request_id: string;
  status: 'accepted' | 'rejected' | 'withdrawn';
}

export interface RejectCommercialRequestProposalPayload {
  rejection_reason?: string | null;
}

export interface WithdrawCommercialRequestProposalPayload {
  withdrawal_reason?: string | null;
}

export interface ReplaceCommercialPaymentProofPayload {
  file_id: string;
  payment_method_id?: string | null;
  payment_reference?: string | null;
  note?: string | null;
}

export interface ReplaceCommercialPaymentProofResponse {
  payment_proof_id: string;
  replaced_payment_proof_id: string;
  status: 'submitted';
}
