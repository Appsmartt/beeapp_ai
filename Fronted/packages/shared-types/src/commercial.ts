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
  is_verified: boolean;
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
