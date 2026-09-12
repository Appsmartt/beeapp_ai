import type {
  AuthCredentials,
  CommercialOfferType,
  CommercialModality,
  GetCommercialCategoriesResponse,
  GetCommercialCitiesResponse,
  GetCommercialCountriesResponse,
  GetOwnedCommercialCatalogResponse,
  GetOwnedCommercialCatalogsResponse,
  GetOwnedCommercialOfferResponse,
  GetOwnedCommercialOffersResponse,
  GetOwnedCommercialProfileResponse,
  GetOwnedCommercialProfilesResponse,
  GetPublicCommercialCatalogsResponse,
  GetPublicCommercialOfferResponse,
  GetPublicCommercialOffersResponse,
  GetPublicCommercialProfileResponse,
  GetPublicCommercialProfilesResponse,
  PublicCommercialOffersQuery,
  PublicCommercialProfilesQuery,
  PublicCommercialCategoriesQuery,
CreateCommercialProfilePayload,
CreateCommercialProfileResponse,
UpdateCommercialProfilePayload,
UpdateCommercialProfileResponse,
UpdateCommercialProfilePublicationPayload,
UpdateCommercialProfilePublicationResponse,
CreateCommercialCatalogPayload,
CreateCommercialCatalogResponse,
UpdateCommercialCatalogPayload,
UpdateCommercialCatalogResponse,
CommercialCatalogMutationResponse,
AdjustCommercialOfferInventoryPayload,
AdjustCommercialOfferInventoryResponse,
CommercialOfferMutationResponse,
CreateCommercialOfferPayload,
CreateCommercialOfferResponse,
UpdateCommercialOfferModalitiesPayload,
UpdateCommercialOfferModalitiesResponse,
UpdateCommercialOfferPayload,
UpdateCommercialOfferResponse,
CommercialOfferImageMutationResponse,
CreateCommercialOfferImagePayload,
CreateCommercialOfferImageResponse,
UpdateCommercialOfferImagePayload,
CommercialPaymentMethodMutationResponse,
CreateCommercialPaymentMethodPayload,
CreateCommercialPaymentMethodResponse,
GetOwnedCommercialPaymentMethodResponse,
GetOwnedCommercialPaymentMethodsResponse,
UpdateCommercialPaymentMethodPayload,
UpdateCommercialPaymentMethodResponse,
CreateCommercialRequestPayload,
CreateCommercialRequestResponse,
GetCommercialRequestResponse,
GetCommercialRequestFormalDetailResponse,
CommercialRequestTransitionPayload,
CommercialRequestTransitionResponse,
CreateCommercialRequestProposalPayload,
CreateCommercialRequestProposalResponse,
CreateCommercialReservationHoldPayload,
CreateCommercialReservationHoldResponse,
GetCommercialRequestsQuery,
GetCommercialRequestsResponse,
GetOwnedCommercialRequestsResponse,
GetCommercialRequestTimelineResponse,
CompleteCommercialRequestPayload,
CompleteCommercialRequestResponse,
CommercialRequestProposalMutationResponse,
RejectCommercialRequestProposalPayload,
WithdrawCommercialRequestProposalPayload,
ReplaceCommercialPaymentProofPayload,
ReplaceCommercialPaymentProofResponse,

  AttachCommercialVerificationDocumentPayload,
  CommercialVerificationMutationResponse,
  GetOwnedCommercialVerificationResponse,
  SaveCommercialVerificationPayload,
} from '@beeapp/shared-types';

import { api } from './client';

function toQueryString(
  values: object,
): string {
  const parameters = new URLSearchParams();

  Object.entries(
    values as Record<
      string,
      string | number | boolean | null | undefined
    >,
  ).forEach(([key, value]) => {
    if (
      value === undefined
      || value === null
      || value === ''
    ) {
      return;
    }

    parameters.set(key, String(value));
  });

  const query = parameters.toString();

  return query ? `?${query}` : '';
}

function profilePath(profileId: string): string {
  const normalizedProfileId = String(profileId || '').trim();

  if (!normalizedProfileId) {
    throw new Error(
      'No fue posible identificar el perfil comercial.',
    );
  }

  return `/commercial/profiles/${encodeURIComponent(
    normalizedProfileId,
  )}/`;
}


function verificationPath(profileId: string): string {
  return profilePath(profileId) + "verification/";
}

function publicProfilePath(profileId: string): string {
  const normalizedProfileId = String(profileId || '').trim();

  if (!normalizedProfileId) {
    throw new Error(
      'No fue posible identificar el perfil comercial.',
    );
  }

  return `/commercial/public/profiles/${encodeURIComponent(
    normalizedProfileId,
  )}/`;
}

function offerPath(
  profileId: string,
  offerId: string,
): string {
  const normalizedOfferId = String(offerId || '').trim();

  if (!normalizedOfferId) {
    throw new Error(
      'No fue posible identificar la oferta comercial.',
    );
  }

  return `${profilePath(profileId)}offers/${encodeURIComponent(
    normalizedOfferId,
  )}/`;
}

function catalogPath(
  profileId: string,
  catalogId: string,
): string {
  const normalizedCatalogId = String(catalogId || '').trim();

  if (!normalizedCatalogId) {
    throw new Error(
      'No fue posible identificar el catálogo comercial.',
    );
  }

  return `${profilePath(profileId)}catalogs/${encodeURIComponent(
    normalizedCatalogId,
  )}/`;
}

export function getCommercialCountries(
  auth: AuthCredentials,
): Promise<GetCommercialCountriesResponse> {
  return api.get<GetCommercialCountriesResponse>(
    '/commercial/public/countries/',
    { auth },
  );
}

export function getCommercialCities(
  auth: AuthCredentials,
  countryCode: string,
): Promise<GetCommercialCitiesResponse> {
  const normalizedCountryCode = String(
    countryCode || '',
  ).trim().toUpperCase();

  if (!normalizedCountryCode) {
    throw new Error('Selecciona un país para consultar ciudades.');
  }

  return api.get<GetCommercialCitiesResponse>(
    `/commercial/public/cities/${toQueryString({
      country_code: normalizedCountryCode,
    })}`,
    { auth },
  );
}

export function getPublicCommercialCategories(
  auth: AuthCredentials,
  query: PublicCommercialCategoriesQuery = {},
): Promise<GetCommercialCategoriesResponse> {
  return api.get<GetCommercialCategoriesResponse>(
    `/commercial/public/categories/${toQueryString(query)}`,
    { auth },
  );
}

export function getPublicCommercialProfiles(
  auth: AuthCredentials,
  query: PublicCommercialProfilesQuery = {},
): Promise<GetPublicCommercialProfilesResponse> {
  return api.get<GetPublicCommercialProfilesResponse>(
    `/commercial/public/profiles/${toQueryString(query)}`,
    { auth },
  );
}

export function getPublicCommercialProfile(
  auth: AuthCredentials,
  profileId: string,
): Promise<GetPublicCommercialProfileResponse> {
  return api.get<GetPublicCommercialProfileResponse>(
    publicProfilePath(profileId),
    { auth },
  );
}

export function getPublicCommercialCatalogs(
  auth: AuthCredentials,
  profileId: string,
): Promise<GetPublicCommercialCatalogsResponse> {
  return api.get<GetPublicCommercialCatalogsResponse>(
    `${publicProfilePath(profileId)}catalogs/`,
    { auth },
  );
}

export function getPublicCommercialOffers(
  auth: AuthCredentials,
  profileId: string,
  query: PublicCommercialOffersQuery = {},
): Promise<GetPublicCommercialOffersResponse> {
  return api.get<GetPublicCommercialOffersResponse>(
    `${publicProfilePath(profileId)}offers/${toQueryString(query)}`,
    { auth },
  );
}

export function getPublicCommercialOffer(
  auth: AuthCredentials,
  offerId: string,
): Promise<GetPublicCommercialOfferResponse> {
  const normalizedOfferId = String(offerId || '').trim();

  if (!normalizedOfferId) {
    throw new Error(
      'No fue posible identificar la oferta comercial.',
    );
  }

  return api.get<GetPublicCommercialOfferResponse>(
    `/commercial/public/offers/${encodeURIComponent(
      normalizedOfferId,
    )}/`,
    { auth },
  );
}

export function getOwnedCommercialProfiles(
  auth: AuthCredentials,
): Promise<GetOwnedCommercialProfilesResponse> {
  return api.get<GetOwnedCommercialProfilesResponse>(
    '/commercial/profiles/',
    { auth },
  );
}

export function getOwnedCommercialProfile(
  auth: AuthCredentials,
  profileId: string,
): Promise<GetOwnedCommercialProfileResponse> {
  return api.get<GetOwnedCommercialProfileResponse>(
    profilePath(profileId),
    { auth },
  );
}


export function getOwnedCommercialVerification(
  auth: AuthCredentials,
  profileId: string,
): Promise<GetOwnedCommercialVerificationResponse> {
  return api.get<GetOwnedCommercialVerificationResponse>(
    verificationPath(profileId),
    { auth },
  );
}

export function saveOwnedCommercialVerification(
  auth: AuthCredentials,
  profileId: string,
  payload: SaveCommercialVerificationPayload,
): Promise<CommercialVerificationMutationResponse> {
  return api.post<CommercialVerificationMutationResponse>(
    verificationPath(profileId),
    payload,
    { auth },
  );
}

export function submitOwnedCommercialVerification(
  auth: AuthCredentials,
  profileId: string,
): Promise<CommercialVerificationMutationResponse> {
  return api.post<CommercialVerificationMutationResponse>(
    verificationPath(profileId) + "submit/",
    undefined,
    { auth },
  );
}

export function attachOwnedCommercialVerificationDocument(
  auth: AuthCredentials,
  profileId: string,
  payload: AttachCommercialVerificationDocumentPayload,
): Promise<CommercialVerificationMutationResponse> {
  return api.post<CommercialVerificationMutationResponse>(
    verificationPath(profileId) + "document/",
    payload,
    { auth },
  );
}

export function getOwnedCommercialCatalogs(
  auth: AuthCredentials,
  profileId: string,
  options: {
    include_archived?: boolean;
  } = {},
): Promise<GetOwnedCommercialCatalogsResponse> {
  return api.get<GetOwnedCommercialCatalogsResponse>(
    `${profilePath(profileId)}catalogs/${toQueryString({
      include_archived: options.include_archived,
    })}`,
    { auth },
  );
}

export function getOwnedCommercialCatalog(
  auth: AuthCredentials,
  profileId: string,
  catalogId: string,
): Promise<GetOwnedCommercialCatalogResponse> {
  return api.get<GetOwnedCommercialCatalogResponse>(
    catalogPath(profileId, catalogId),
    { auth },
  );
}

export function getOwnedCommercialOffers(
  auth: AuthCredentials,
  profileId: string,
  options: {
    catalog_id?: string;
    include_archived?: boolean;
  } = {},
): Promise<GetOwnedCommercialOffersResponse> {
  return api.get<GetOwnedCommercialOffersResponse>(
    `${profilePath(profileId)}offers/${toQueryString(options)}`,
    { auth },
  );
}

export function getOwnedCommercialOffer(
  auth: AuthCredentials,
  profileId: string,
  offerId: string,
): Promise<GetOwnedCommercialOfferResponse> {
  return api.get<GetOwnedCommercialOfferResponse>(
    offerPath(profileId, offerId),
    { auth },
  );
}

export type CommercialExploreFilters = {
  country_code?: string;
  city?: string;
  offer_type?: CommercialOfferType;
  modality?: CommercialModality;
  verified_only?: boolean;
  delivery_only?: boolean;
  search?: string;
};

export function createCommercialProfile(
auth: AuthCredentials,
payload: CreateCommercialProfilePayload,
): Promise<CreateCommercialProfileResponse> {
return api.post<CreateCommercialProfileResponse>(
'/commercial/profiles/',
payload,
{ auth },
);
}

export function updateCommercialProfile(
auth: AuthCredentials,
profileId: string,
payload: UpdateCommercialProfilePayload,
): Promise<UpdateCommercialProfileResponse> {
return api.patch<UpdateCommercialProfileResponse>(
profilePath(profileId),
payload,
{ auth },
);
}

export function updateCommercialProfilePublication(
auth: AuthCredentials,
profileId: string,
payload: UpdateCommercialProfilePublicationPayload,
): Promise<UpdateCommercialProfilePublicationResponse> {
return api.patch<UpdateCommercialProfilePublicationResponse>(
`${profilePath(profileId)}publication/`,
payload,
{ auth },
);
}

export function createOwnedCommercialCatalog(
auth: AuthCredentials,
profileId: string,
payload: CreateCommercialCatalogPayload,
): Promise<CreateCommercialCatalogResponse> {
return api.post<CreateCommercialCatalogResponse>(
`${profilePath(profileId)}catalogs/`,
payload,
{ auth },
);
}

export function updateOwnedCommercialCatalog(
auth: AuthCredentials,
profileId: string,
catalogId: string,
payload: UpdateCommercialCatalogPayload,
): Promise<UpdateCommercialCatalogResponse> {
return api.patch<UpdateCommercialCatalogResponse>(
catalogPath(profileId, catalogId),
payload,
{ auth },
);
}

export function pauseOwnedCommercialCatalog(
auth: AuthCredentials,
profileId: string,
catalogId: string,
): Promise<CommercialCatalogMutationResponse> {
return api.post<CommercialCatalogMutationResponse>(
`${catalogPath(profileId, catalogId)}pause/`,
undefined,
{ auth },
);
}

export function publishOwnedCommercialCatalog(
auth: AuthCredentials,
profileId: string,
catalogId: string,
): Promise<CommercialCatalogMutationResponse> {
return api.post<CommercialCatalogMutationResponse>(
`${catalogPath(profileId, catalogId)}publish/`,
undefined,
{ auth },
);
}

export function archiveOwnedCommercialCatalog(
auth: AuthCredentials,
profileId: string,
catalogId: string,
): Promise<CommercialCatalogMutationResponse> {
return api.post<CommercialCatalogMutationResponse>(
`${catalogPath(profileId, catalogId)}archive/`,
undefined,
{ auth },
);
}

export function restoreOwnedCommercialCatalog(
auth: AuthCredentials,
profileId: string,
catalogId: string,
): Promise<CommercialCatalogMutationResponse> {
return api.post<CommercialCatalogMutationResponse>(
`${catalogPath(profileId, catalogId)}restore/`,
undefined,
{ auth },
);
}

export function createOwnedCommercialOffer(
auth: AuthCredentials,
profileId: string,
payload: CreateCommercialOfferPayload,
): Promise<CreateCommercialOfferResponse> {
return api.post<CreateCommercialOfferResponse>(
`${profilePath(profileId)}offers/`,
payload,
{ auth },
);
}

export function updateOwnedCommercialOffer(
auth: AuthCredentials,
profileId: string,
offerId: string,
payload: UpdateCommercialOfferPayload,
): Promise<UpdateCommercialOfferResponse> {
return api.patch<UpdateCommercialOfferResponse>(
offerPath(profileId, offerId),
payload,
{ auth },
);
}

export function pauseOwnedCommercialOffer(
auth: AuthCredentials,
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return api.post<CommercialOfferMutationResponse>(
`${offerPath(profileId, offerId)}pause/`,
undefined,
{ auth },
);
}

export function publishOwnedCommercialOffer(
auth: AuthCredentials,
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return api.post<CommercialOfferMutationResponse>(
`${offerPath(profileId, offerId)}publish/`,
undefined,
{ auth },
);
}

export function archiveOwnedCommercialOffer(
auth: AuthCredentials,
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return api.post<CommercialOfferMutationResponse>(
`${offerPath(profileId, offerId)}archive/`,
undefined,
{ auth },
);
}

export function restoreOwnedCommercialOffer(
auth: AuthCredentials,
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return api.post<CommercialOfferMutationResponse>(
`${offerPath(profileId, offerId)}restore/`,
undefined,
{ auth },
);
}

export function enableOwnedCommercialOffer(
auth: AuthCredentials,
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return api.post<CommercialOfferMutationResponse>(
`${offerPath(profileId, offerId)}enable/`,
undefined,
{ auth },
);
}

export function disableOwnedCommercialOffer(
auth: AuthCredentials,
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return api.post<CommercialOfferMutationResponse>(
`${offerPath(profileId, offerId)}disable/`,
undefined,
{ auth },
);
}

export function updateOwnedCommercialOfferModalities(
auth: AuthCredentials,
profileId: string,
offerId: string,
payload: UpdateCommercialOfferModalitiesPayload,
): Promise<UpdateCommercialOfferModalitiesResponse> {
return api.patch<UpdateCommercialOfferModalitiesResponse>(
`${offerPath(profileId, offerId)}modalities/`,
payload,
{ auth },
);
}

export function adjustOwnedCommercialOfferInventory(
auth: AuthCredentials,
profileId: string,
offerId: string,
payload: AdjustCommercialOfferInventoryPayload,
): Promise<AdjustCommercialOfferInventoryResponse> {
return api.post<AdjustCommercialOfferInventoryResponse>(
`${offerPath(profileId, offerId)}inventory/adjust/`,
payload,
{ auth },
);
}

function ownedOfferImagePath(
profileId: string,
offerId: string,
imageId: string,
): string {
const normalizedImageId = String(imageId || '').trim();

if (!normalizedImageId) {
throw new Error(
'No fue posible identificar la imagen de la oferta.',
);
}

return `${offerPath(
profileId,
offerId,
)}images/${encodeURIComponent(normalizedImageId)}/`;
}

export function createOwnedCommercialOfferImage(
auth: AuthCredentials,
profileId: string,
offerId: string,
payload: CreateCommercialOfferImagePayload,
): Promise<CreateCommercialOfferImageResponse> {
return api.post<CreateCommercialOfferImageResponse>(
`${offerPath(profileId, offerId)}images/`,
payload,
{ auth },
);
}

export function archiveOwnedCommercialOfferImage(
auth: AuthCredentials,
profileId: string,
offerId: string,
imageId: string,
): Promise<CommercialOfferImageMutationResponse> {
return api.post<CommercialOfferImageMutationResponse>(
`${ownedOfferImagePath(
profileId,
offerId,
imageId,
)}archive/`,
undefined,
{ auth },
);
}

export function restoreOwnedCommercialOfferImage(
auth: AuthCredentials,
profileId: string,
offerId: string,
imageId: string,
): Promise<CommercialOfferImageMutationResponse> {
return api.post<CommercialOfferImageMutationResponse>(
`${ownedOfferImagePath(
profileId,
offerId,
imageId,
)}restore/`,
undefined,
{ auth },
);
}

export function updateOwnedCommercialOfferImage(
auth: AuthCredentials,
profileId: string,
offerId: string,
imageId: string,
payload: UpdateCommercialOfferImagePayload,
): Promise<CommercialOfferImageMutationResponse> {
return api.patch<CommercialOfferImageMutationResponse>(
ownedOfferImagePath(
profileId,
offerId,
imageId,
),
payload,
{ auth },
);
}

export function setOwnedCommercialOfferPrimaryImage(
auth: AuthCredentials,
profileId: string,
offerId: string,
imageId: string,
): Promise<CommercialOfferImageMutationResponse> {
return api.post<CommercialOfferImageMutationResponse>(
`${ownedOfferImagePath(
profileId,
offerId,
imageId,
)}set-primary/`,
undefined,
{ auth },
);
}

function paymentMethodPath(
profileId: string,
paymentMethodId: string,
): string {
const normalizedPaymentMethodId = String(
paymentMethodId || '',
).trim();

if (!normalizedPaymentMethodId) {
throw new Error(
'No fue posible identificar el método de pago.',
);
}

return `${profilePath(
profileId,
)}payment-methods/${encodeURIComponent(
normalizedPaymentMethodId,
)}/`;
}

export function getOwnedCommercialPaymentMethods(
auth: AuthCredentials,
profileId: string,
options: {
include_archived?: boolean;
} = {},
): Promise<GetOwnedCommercialPaymentMethodsResponse> {
return api.get<GetOwnedCommercialPaymentMethodsResponse>(
`${profilePath(profileId)}payment-methods/${toQueryString(
options,
)}`,
{ auth },
);
}

export function getOwnedCommercialPaymentMethod(
auth: AuthCredentials,
profileId: string,
paymentMethodId: string,
): Promise<GetOwnedCommercialPaymentMethodResponse> {
return api.get<GetOwnedCommercialPaymentMethodResponse>(
paymentMethodPath(profileId, paymentMethodId),
{ auth },
);
}

export function createOwnedCommercialPaymentMethod(
auth: AuthCredentials,
profileId: string,
payload: CreateCommercialPaymentMethodPayload,
): Promise<CreateCommercialPaymentMethodResponse> {
return api.post<CreateCommercialPaymentMethodResponse>(
`${profilePath(profileId)}payment-methods/`,
payload,
{ auth },
);
}

export function updateOwnedCommercialPaymentMethod(
auth: AuthCredentials,
profileId: string,
paymentMethodId: string,
payload: UpdateCommercialPaymentMethodPayload,
): Promise<UpdateCommercialPaymentMethodResponse> {
return api.patch<UpdateCommercialPaymentMethodResponse>(
paymentMethodPath(profileId, paymentMethodId),
payload,
{ auth },
);
}

export function archiveOwnedCommercialPaymentMethod(
auth: AuthCredentials,
profileId: string,
paymentMethodId: string,
): Promise<CommercialPaymentMethodMutationResponse> {
return api.post<CommercialPaymentMethodMutationResponse>(
`${paymentMethodPath(
profileId,
paymentMethodId,
)}archive/`,
undefined,
{ auth },
);
}


export function createCommercialRequest(
  auth: AuthCredentials,
  idempotencyKey: string,
  payload: CreateCommercialRequestPayload,
): Promise<CreateCommercialRequestResponse> {
  const normalizedIdempotencyKey = String(
    idempotencyKey || '',
  ).trim();

  if (!normalizedIdempotencyKey) {
    throw new Error(
      'No fue posible identificar la solicitud. Inténtalo nuevamente.',
    );
  }

  return api.post<CreateCommercialRequestResponse>(
    '/commercial/requests/',
    payload,
    {
      auth,
      headers: {
        'Idempotency-Key': normalizedIdempotencyKey,
      },
    },
  );
}


export function getCommercialRequests(
  credentials: AuthCredentials,
  query: GetCommercialRequestsQuery = {},
): Promise<GetCommercialRequestsResponse> {
  const searchParams = new URLSearchParams();

  (query.statuses || []).forEach((status) => {
    const normalizedStatus = String(status || '').trim();

    if (normalizedStatus) {
      searchParams.append('status', normalizedStatus);
    }
  });

  if (query.limit !== undefined) {
    searchParams.set('limit', String(query.limit));
  }

  if (query.offset !== undefined) {
    searchParams.set('offset', String(query.offset));
  }

  const queryString = searchParams.toString();
  const endpoint = queryString
    ? `/commercial/requests/?${queryString}`
    : '/commercial/requests/';

  return api.get<GetCommercialRequestsResponse>(
    endpoint,
    {
      auth: credentials,
    },
  );
}


export function getCommercialRequest(
auth: AuthCredentials,
requestId: string,
): Promise<GetCommercialRequestResponse> {
const normalizedRequestId = String(requestId || '').trim();

if (!normalizedRequestId) {
throw new Error(
'No fue posible identificar la solicitud.',
);
}

return api.get<GetCommercialRequestResponse>(
`/commercial/requests/${normalizedRequestId}/`,
{ auth },
);
}

function commercialRequestPath(requestId: string): string {
  const normalizedRequestId = String(requestId || '').trim();

  if (!normalizedRequestId) {
    throw new Error(
      'No fue posible identificar la solicitud comercial.',
    );
  }

  return `/commercial/requests/${encodeURIComponent(
    normalizedRequestId,
  )}/`;
}

function commercialProposalPath(proposalId: string): string {
  const normalizedProposalId = String(proposalId || '').trim();

  if (!normalizedProposalId) {
    throw new Error(
      'No fue posible identificar la propuesta comercial.',
    );
  }

  return `/commercial/proposals/${encodeURIComponent(
    normalizedProposalId,
  )}/`;
}

function commercialPaymentProofPath(
  paymentProofId: string,
): string {
  const normalizedPaymentProofId = String(
    paymentProofId || '',
  ).trim();

  if (!normalizedPaymentProofId) {
    throw new Error(
      'No fue posible identificar el comprobante de pago.',
    );
  }

  return `/commercial/payment-proofs/${encodeURIComponent(
    normalizedPaymentProofId,
  )}/`;
}

export function getOwnedCommercialRequests(
  auth: AuthCredentials,
  profileId: string,
  query: GetCommercialRequestsQuery = {},
): Promise<GetOwnedCommercialRequestsResponse> {
  const searchParams = new URLSearchParams();

  (query.statuses || []).forEach((status) => {
    const normalizedStatus = String(status || '').trim();

    if (normalizedStatus) {
      searchParams.append('status', normalizedStatus);
    }
  });

  if (query.limit !== undefined) {
    searchParams.set('limit', String(query.limit));
  }

  if (query.offset !== undefined) {
    searchParams.set('offset', String(query.offset));
  }

  const queryString = searchParams.toString();
  const endpoint = queryString
    ? `${profilePath(profileId)}requests/?${queryString}`
    : `${profilePath(profileId)}requests/`;

  return api.get<GetOwnedCommercialRequestsResponse>(
    endpoint,
    { auth },
  );
}

export function getCommercialRequestTimeline(
  auth: AuthCredentials,
  requestId: string,
): Promise<GetCommercialRequestTimelineResponse> {
  return api.get<GetCommercialRequestTimelineResponse>(
    `${commercialRequestPath(requestId)}timeline/`,
    { auth },
  );
}

export function getCommercialRequestFormalDetail(
auth: AuthCredentials,
requestId: string,
): Promise<GetCommercialRequestFormalDetailResponse> {
return api.get<GetCommercialRequestFormalDetailResponse>(
`${commercialRequestPath(requestId)}formal-detail/`,
{ auth },
);
}

export function transitionCommercialRequest(
auth: AuthCredentials,
requestId: string,
payload: CommercialRequestTransitionPayload,
): Promise<CommercialRequestTransitionResponse> {
return api.post<CommercialRequestTransitionResponse>(
`${commercialRequestPath(requestId)}transition/`,
payload,
{ auth },
);
}

export function createCommercialRequestProposal(
auth: AuthCredentials,
requestId: string,
payload: CreateCommercialRequestProposalPayload,
): Promise<CreateCommercialRequestProposalResponse> {
return api.post<CreateCommercialRequestProposalResponse>(
`${commercialRequestPath(requestId)}proposals/`,
payload,
{ auth },
);
}

export function createCommercialReservationHold(
auth: AuthCredentials,
requestId: string,
payload: CreateCommercialReservationHoldPayload,
): Promise<CreateCommercialReservationHoldResponse> {
return api.post<CreateCommercialReservationHoldResponse>(
`${commercialRequestPath(requestId)}reservation-hold/`,
payload,
{ auth },
);
}

export function completeCommercialRequest(
  auth: AuthCredentials,
  requestId: string,
  payload: CompleteCommercialRequestPayload = {},
): Promise<CompleteCommercialRequestResponse> {
  return api.post<CompleteCommercialRequestResponse>(
    `${commercialRequestPath(requestId)}complete/`,
    payload,
    { auth },
  );
}

export function acceptCommercialRequestProposal(
  auth: AuthCredentials,
  proposalId: string,
): Promise<CommercialRequestProposalMutationResponse> {
  return api.post<CommercialRequestProposalMutationResponse>(
    `${commercialProposalPath(proposalId)}accept/`,
    undefined,
    { auth },
  );
}

export function rejectCommercialRequestProposal(
  auth: AuthCredentials,
  proposalId: string,
  payload: RejectCommercialRequestProposalPayload = {},
): Promise<CommercialRequestProposalMutationResponse> {
  return api.post<CommercialRequestProposalMutationResponse>(
    `${commercialProposalPath(proposalId)}reject/`,
    payload,
    { auth },
  );
}

export function withdrawCommercialRequestProposal(
  auth: AuthCredentials,
  proposalId: string,
  payload: WithdrawCommercialRequestProposalPayload = {},
): Promise<CommercialRequestProposalMutationResponse> {
  return api.post<CommercialRequestProposalMutationResponse>(
    `${commercialProposalPath(proposalId)}withdraw/`,
    payload,
    { auth },
  );
}

export function replaceCommercialPaymentProof(
  auth: AuthCredentials,
  paymentProofId: string,
  payload: ReplaceCommercialPaymentProofPayload,
): Promise<ReplaceCommercialPaymentProofResponse> {
  return api.post<ReplaceCommercialPaymentProofResponse>(
    `${commercialPaymentProofPath(paymentProofId)}replace/`,
    payload,
    { auth },
  );
}
