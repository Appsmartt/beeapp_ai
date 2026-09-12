import {
  createCommercialProfile,
archiveOwnedCommercialCatalog,
pauseOwnedCommercialCatalog,
publishOwnedCommercialCatalog,
restoreOwnedCommercialCatalog,
adjustOwnedCommercialOfferInventory,
archiveOwnedCommercialOffer,
archiveOwnedCommercialOfferImage,
createOwnedCommercialOfferImage,
restoreOwnedCommercialOfferImage,
setOwnedCommercialOfferPrimaryImage,
updateOwnedCommercialOfferImage,
archiveOwnedCommercialPaymentMethod,
createOwnedCommercialPaymentMethod,
getOwnedCommercialPaymentMethod,
getOwnedCommercialPaymentMethods,
updateOwnedCommercialPaymentMethod,
createOwnedCommercialOffer,
disableOwnedCommercialOffer,
enableOwnedCommercialOffer,
pauseOwnedCommercialOffer,
publishOwnedCommercialOffer,
restoreOwnedCommercialOffer,
updateOwnedCommercialOffer,
updateOwnedCommercialOfferModalities,
createOwnedCommercialCatalog,
getCommercialCities,
  getCommercialCountries,
  getOwnedCommercialProfile,
getOwnedCommercialOffers,
getOwnedCommercialOffer,
getOwnedCommercialCatalogs,
getOwnedCommercialProfiles,
  getPublicCommercialCategories,
  getPublicCommercialCatalogs,
  getPublicCommercialOffer,
  getPublicCommercialOffers,
  getPublicCommercialProfile,
  updateCommercialProfile,
updateCommercialProfilePublication,
updateOwnedCommercialCatalog,
getPublicCommercialProfiles,
getCommercialRequest,
getCommercialRequests,
getOwnedCommercialRequests,
getCommercialRequestTimeline,
getCommercialRequestFormalDetail,
transitionCommercialRequest,
createCommercialRequestProposal,
createCommercialReservationHold,
completeCommercialRequest,
acceptCommercialRequestProposal,
rejectCommercialRequestProposal,
withdrawCommercialRequestProposal,
replaceCommercialPaymentProof,
getOwnedCommercialVerification,
saveOwnedCommercialVerification,
submitOwnedCommercialVerification,
attachOwnedCommercialVerificationDocument,
ApiRequestError,
} from '@beeapp/api-client';

import type {
  AdjustCommercialOfferInventoryPayload,
AdjustCommercialOfferInventoryResponse,
CommercialPaymentMethodMutationResponse,
CreateCommercialPaymentMethodPayload,
CreateCommercialPaymentMethodResponse,
GetOwnedCommercialPaymentMethodResponse,
GetOwnedCommercialPaymentMethodsResponse,
UpdateCommercialPaymentMethodPayload,
UpdateCommercialPaymentMethodResponse,
CommercialOfferImageMutationResponse,
CreateCommercialOfferImagePayload,
CreateCommercialOfferImageResponse,
UpdateCommercialOfferImagePayload,
CommercialOfferMutationResponse,
CreateCommercialOfferPayload,
CreateCommercialOfferResponse,
UpdateCommercialOfferModalitiesPayload,
UpdateCommercialOfferModalitiesResponse,
UpdateCommercialOfferPayload,
UpdateCommercialOfferResponse,
CommercialCatalogMutationResponse,
CreateCommercialCatalogPayload,
CreateCommercialProfilePayload,
  CreateCommercialCatalogResponse,
CreateCommercialProfileResponse,
GetCommercialCategoriesResponse,
PublicCommercialCategoriesQuery,
  GetCommercialCitiesResponse,
  GetCommercialCountriesResponse,
  GetOwnedCommercialProfileResponse,
GetOwnedCommercialOffersResponse,
GetOwnedCommercialOfferResponse,
GetOwnedCommercialCatalogsResponse,
GetOwnedCommercialProfilesResponse,
  GetPublicCommercialCatalogsResponse,
  GetPublicCommercialOfferResponse,
  GetPublicCommercialOffersResponse,
  GetPublicCommercialProfileResponse,
  GetPublicCommercialProfilesResponse,
  UpdateCommercialCatalogPayload,
UpdateCommercialProfilePayload,
UpdateCommercialProfilePublicationPayload,
UpdateCommercialProfilePublicationResponse,
PublicCommercialOffersQuery,
  UpdateCommercialCatalogResponse,
UpdateCommercialProfileResponse,
PublicCommercialProfilesQuery,
CreateCommercialRequestResponse,
GetCommercialRequestResponse,
GetCommercialRequestsQuery,
GetCommercialRequestsResponse,
GetOwnedCommercialRequestsResponse,
GetCommercialRequestTimelineResponse,
GetCommercialRequestFormalDetailResponse,
CommercialRequestTransitionPayload,
CommercialRequestTransitionResponse,
CreateCommercialRequestProposalPayload,
CreateCommercialRequestProposalResponse,
CreateCommercialReservationHoldPayload,
CreateCommercialReservationHoldResponse,
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

import {
  getValidSessionCredentials,
} from './authSession';

import {
revalidateBusinessCartLines,
type BusinessCart,
type RevalidateBusinessCartLineInput,
type RevalidateBusinessCartLinesResult,
} from '../features/buddyservices/cart/businessCartStore';

import {
buildProductOrderPayload,
buildServiceRequestPayload,
type BuildServiceRequestPayloadInput,
} from '../features/buddyservices/cart/businessCartRequestPayload';

import {
buildBookingRequestPayload,
type BuildBookingRequestPayloadInput,
} from '../features/buddyservices/commercialBookingRequestPayload';

import {
submitCommercialRequest,
} from '../features/buddyservices/commercialRequestSubmission';

async function getRequiredCommercialCredentials() {
  const credentials = await getValidSessionCredentials();

  if (!credentials) {
    throw new Error(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
  }

  return credentials;
}

export async function loadCommercialCountries(): Promise<
  GetCommercialCountriesResponse
> {
  return getCommercialCountries(
    await getRequiredCommercialCredentials(),
  );
}

export async function loadCommercialCities(
  countryCode: string,
): Promise<GetCommercialCitiesResponse> {
  return getCommercialCities(
    await getRequiredCommercialCredentials(),
    countryCode,
  );
}

export async function loadPublicCommercialCategories(
query: PublicCommercialCategoriesQuery = {},
): Promise<GetCommercialCategoriesResponse> {
return getPublicCommercialCategories(
await getRequiredCommercialCredentials(),
query,
);
}

export async function loadPublicCommercialProfiles(
  query: PublicCommercialProfilesQuery = {},
): Promise<GetPublicCommercialProfilesResponse> {
  return getPublicCommercialProfiles(
    await getRequiredCommercialCredentials(),
    query,
  );
}

export async function loadPublicCommercialProfile(
  profileId: string,
): Promise<GetPublicCommercialProfileResponse> {
  return getPublicCommercialProfile(
    await getRequiredCommercialCredentials(),
    profileId,
  );
}

export async function loadPublicCommercialCatalogs(
  profileId: string,
): Promise<GetPublicCommercialCatalogsResponse> {
  return getPublicCommercialCatalogs(
    await getRequiredCommercialCredentials(),
    profileId,
  );
}

export async function loadPublicCommercialOffers(
  profileId: string,
  query: PublicCommercialOffersQuery = {},
): Promise<GetPublicCommercialOffersResponse> {
  return getPublicCommercialOffers(
    await getRequiredCommercialCredentials(),
    profileId,
    query,
  );
}

export async function loadPublicCommercialOffer(
  offerId: string,
): Promise<GetPublicCommercialOfferResponse> {
  return getPublicCommercialOffer(
    await getRequiredCommercialCredentials(),
    offerId,
  );
}

export async function loadOwnedCommercialProfiles(): Promise<
  GetOwnedCommercialProfilesResponse
> {
  return getOwnedCommercialProfiles(
    await getRequiredCommercialCredentials(),
  );
}

export async function loadOwnedCommercialProfile(
profileId: string,
): Promise<GetOwnedCommercialProfileResponse> {
return getOwnedCommercialProfile(
await getRequiredCommercialCredentials(),
profileId,
);
}

export async function createOwnedCommercialProfile(
payload: CreateCommercialProfilePayload,
): Promise<CreateCommercialProfileResponse> {
return createCommercialProfile(
await getRequiredCommercialCredentials(),
payload,
);
}

export async function updateOwnedCommercialProfile(
profileId: string,
payload: UpdateCommercialProfilePayload,
): Promise<UpdateCommercialProfileResponse> {
return updateCommercialProfile(
await getRequiredCommercialCredentials(),
profileId,
payload,
);
}

export async function updateOwnedCommercialProfilePublication(
profileId: string,
payload: UpdateCommercialProfilePublicationPayload,
): Promise<UpdateCommercialProfilePublicationResponse> {
return updateCommercialProfilePublication(
await getRequiredCommercialCredentials(),
profileId,
payload,
);
}

export async function loadOwnedCommercialVerification(
profileId: string,
): Promise<GetOwnedCommercialVerificationResponse> {
return getOwnedCommercialVerification(
await getRequiredCommercialCredentials(),
profileId,
);
}

export async function saveOwnedCommercialVerificationRequest(
profileId: string,
payload: SaveCommercialVerificationPayload,
): Promise<CommercialVerificationMutationResponse> {
return saveOwnedCommercialVerification(
await getRequiredCommercialCredentials(),
profileId,
payload,
);
}

export async function submitOwnedCommercialVerificationRequest(
profileId: string,
): Promise<CommercialVerificationMutationResponse> {
return submitOwnedCommercialVerification(
await getRequiredCommercialCredentials(),
profileId,
);
}

export async function attachOwnedCommercialVerificationPdf(
profileId: string,
payload: AttachCommercialVerificationDocumentPayload,
): Promise<CommercialVerificationMutationResponse> {
return attachOwnedCommercialVerificationDocument(
await getRequiredCommercialCredentials(),
profileId,
payload,
);
}

export async function createOwnedCatalog(
profileId: string,
payload: CreateCommercialCatalogPayload,
): Promise<CreateCommercialCatalogResponse> {
return createOwnedCommercialCatalog(
await getRequiredCommercialCredentials(),
profileId,
payload,
);
}

export async function updateOwnedCatalog(
profileId: string,
catalogId: string,
payload: UpdateCommercialCatalogPayload,
): Promise<UpdateCommercialCatalogResponse> {
return updateOwnedCommercialCatalog(
await getRequiredCommercialCredentials(),
profileId,
catalogId,
payload,
);
}

export async function loadOwnedCommercialCatalogs(
profileId: string,
options: {
include_archived?: boolean;
} = {},
): Promise<GetOwnedCommercialCatalogsResponse> {
return getOwnedCommercialCatalogs(
await getRequiredCommercialCredentials(),
profileId,
options,
);
}

export async function pauseOwnedCatalog(
profileId: string,
catalogId: string,
): Promise<CommercialCatalogMutationResponse> {
return pauseOwnedCommercialCatalog(
await getRequiredCommercialCredentials(),
profileId,
catalogId,
);
}

export async function publishOwnedCatalog(
profileId: string,
catalogId: string,
): Promise<CommercialCatalogMutationResponse> {
return publishOwnedCommercialCatalog(
await getRequiredCommercialCredentials(),
profileId,
catalogId,
);
}

export async function archiveOwnedCatalog(
profileId: string,
catalogId: string,
): Promise<CommercialCatalogMutationResponse> {
return archiveOwnedCommercialCatalog(
await getRequiredCommercialCredentials(),
profileId,
catalogId,
);
}

export async function restoreOwnedCatalog(
profileId: string,
catalogId: string,
): Promise<CommercialCatalogMutationResponse> {
return restoreOwnedCommercialCatalog(
await getRequiredCommercialCredentials(),
profileId,
catalogId,
);
}

export async function createOwnedOffer(
profileId: string,
payload: CreateCommercialOfferPayload,
): Promise<CreateCommercialOfferResponse> {
return createOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
payload,
);
}

export async function updateOwnedOffer(
profileId: string,
offerId: string,
payload: UpdateCommercialOfferPayload,
): Promise<UpdateCommercialOfferResponse> {
return updateOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
offerId,
payload,
);
}

export async function pauseOwnedOffer(
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return pauseOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
offerId,
);
}

export async function publishOwnedOffer(
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return publishOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
offerId,
);
}

export async function archiveOwnedOffer(
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return archiveOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
offerId,
);
}

export async function restoreOwnedOffer(
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return restoreOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
offerId,
);
}

export async function enableOwnedOffer(
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return enableOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
offerId,
);
}

export async function disableOwnedOffer(
profileId: string,
offerId: string,
): Promise<CommercialOfferMutationResponse> {
return disableOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
offerId,
);
}

export async function updateOwnedOfferModalities(
profileId: string,
offerId: string,
payload: UpdateCommercialOfferModalitiesPayload,
): Promise<UpdateCommercialOfferModalitiesResponse> {
return updateOwnedCommercialOfferModalities(
await getRequiredCommercialCredentials(),
profileId,
offerId,
payload,
);
}

export async function adjustOwnedOfferInventory(
profileId: string,
offerId: string,
payload: AdjustCommercialOfferInventoryPayload,
): Promise<AdjustCommercialOfferInventoryResponse> {
return adjustOwnedCommercialOfferInventory(
await getRequiredCommercialCredentials(),
profileId,
offerId,
payload,
);
}

export async function loadOwnedCommercialOffers(
profileId: string,
options: {
catalog_id?: string;
include_archived?: boolean;
} = {},
): Promise<GetOwnedCommercialOffersResponse> {
return getOwnedCommercialOffers(
await getRequiredCommercialCredentials(),
profileId,
options,
);
}

export async function loadOwnedCommercialOffer(
profileId: string,
offerId: string,
): Promise<GetOwnedCommercialOfferResponse> {
return getOwnedCommercialOffer(
await getRequiredCommercialCredentials(),
profileId,
offerId,
);
}

export async function createOwnedOfferImage(
profileId: string,
offerId: string,
payload: CreateCommercialOfferImagePayload,
): Promise<CreateCommercialOfferImageResponse> {
return createOwnedCommercialOfferImage(
await getRequiredCommercialCredentials(),
profileId,
offerId,
payload,
);
}

export async function archiveOwnedOfferImage(
profileId: string,
offerId: string,
imageId: string,
): Promise<CommercialOfferImageMutationResponse> {
return archiveOwnedCommercialOfferImage(
await getRequiredCommercialCredentials(),
profileId,
offerId,
imageId,
);
}

export async function restoreOwnedOfferImage(
profileId: string,
offerId: string,
imageId: string,
): Promise<CommercialOfferImageMutationResponse> {
return restoreOwnedCommercialOfferImage(
await getRequiredCommercialCredentials(),
profileId,
offerId,
imageId,
);
}

export async function updateOwnedOfferImage(
profileId: string,
offerId: string,
imageId: string,
payload: UpdateCommercialOfferImagePayload,
): Promise<CommercialOfferImageMutationResponse> {
return updateOwnedCommercialOfferImage(
await getRequiredCommercialCredentials(),
profileId,
offerId,
imageId,
payload,
);
}

export async function setOwnedOfferPrimaryImage(
profileId: string,
offerId: string,
imageId: string,
): Promise<CommercialOfferImageMutationResponse> {
return setOwnedCommercialOfferPrimaryImage(
await getRequiredCommercialCredentials(),
profileId,
offerId,
imageId,
);
}

export async function loadOwnedPaymentMethods(
profileId: string,
options: {
include_archived?: boolean;
} = {},
): Promise<GetOwnedCommercialPaymentMethodsResponse> {
return getOwnedCommercialPaymentMethods(
await getRequiredCommercialCredentials(),
profileId,
options,
);
}

export async function loadOwnedPaymentMethod(
profileId: string,
paymentMethodId: string,
): Promise<GetOwnedCommercialPaymentMethodResponse> {
return getOwnedCommercialPaymentMethod(
await getRequiredCommercialCredentials(),
profileId,
paymentMethodId,
);
}

export async function createOwnedPaymentMethod(
profileId: string,
payload: CreateCommercialPaymentMethodPayload,
): Promise<CreateCommercialPaymentMethodResponse> {
return createOwnedCommercialPaymentMethod(
await getRequiredCommercialCredentials(),
profileId,
payload,
);
}

export async function updateOwnedPaymentMethod(
profileId: string,
paymentMethodId: string,
payload: UpdateCommercialPaymentMethodPayload,
): Promise<UpdateCommercialPaymentMethodResponse> {
return updateOwnedCommercialPaymentMethod(
await getRequiredCommercialCredentials(),
profileId,
paymentMethodId,
payload,
);
}

export async function archiveOwnedPaymentMethod(
profileId: string,
paymentMethodId: string,
): Promise<CommercialPaymentMethodMutationResponse> {
return archiveOwnedCommercialPaymentMethod(
await getRequiredCommercialCredentials(),
profileId,
paymentMethodId,
);
}


export async function createProductOrderFromBusinessCart(
cart: BusinessCart,
idempotencyKey: string,
): Promise<CreateCommercialRequestResponse> {
return submitCommercialRequest(
await getRequiredCommercialCredentials(),
idempotencyKey,
buildProductOrderPayload(cart),
);
}


export async function createServiceRequest(
input: BuildServiceRequestPayloadInput,
idempotencyKey: string,
): Promise<CreateCommercialRequestResponse> {
return submitCommercialRequest(
await getRequiredCommercialCredentials(),
idempotencyKey,
buildServiceRequestPayload(input),
);
}

export async function createBookingRequest(
input: BuildBookingRequestPayloadInput,
idempotencyKey: string,
): Promise<CreateCommercialRequestResponse> {
return submitCommercialRequest(
await getRequiredCommercialCredentials(),
idempotencyKey,
buildBookingRequestPayload(input),
);
}

export async function loadCommercialRequests(
query: GetCommercialRequestsQuery = {},
): Promise<GetCommercialRequestsResponse> {
return getCommercialRequests(
await getRequiredCommercialCredentials(),
query,
);
}


export async function loadCommercialRequest(
requestId: string,
): Promise<GetCommercialRequestResponse> {
return getCommercialRequest(
await getRequiredCommercialCredentials(),
requestId,
);
}

export async function loadOwnedCommercialRequests(
profileId: string,
query: GetCommercialRequestsQuery = {},
): Promise<GetOwnedCommercialRequestsResponse> {
return getOwnedCommercialRequests(
await getRequiredCommercialCredentials(),
profileId,
query,
);
}

export async function loadCommercialRequestTimeline(
requestId: string,
): Promise<GetCommercialRequestTimelineResponse> {
return getCommercialRequestTimeline(
await getRequiredCommercialCredentials(),
requestId,
);
}

export async function loadCommercialRequestFormalDetail(
requestId: string,
): Promise<GetCommercialRequestFormalDetailResponse> {
return getCommercialRequestFormalDetail(
await getRequiredCommercialCredentials(),
requestId,
);
}

export async function transitionOwnedCommercialRequest(
requestId: string,
payload: CommercialRequestTransitionPayload,
): Promise<CommercialRequestTransitionResponse> {
return transitionCommercialRequest(
await getRequiredCommercialCredentials(),
requestId,
payload,
);
}

export async function createCommercialProposal(
requestId: string,
payload: CreateCommercialRequestProposalPayload,
): Promise<CreateCommercialRequestProposalResponse> {
return createCommercialRequestProposal(
await getRequiredCommercialCredentials(),
requestId,
payload,
);
}

export async function createCommercialReservationHoldForRequest(
requestId: string,
payload: CreateCommercialReservationHoldPayload,
): Promise<CreateCommercialReservationHoldResponse> {
return createCommercialReservationHold(
await getRequiredCommercialCredentials(),
requestId,
payload,
);
}

export async function completeOwnedCommercialRequest(
requestId: string,
payload: CompleteCommercialRequestPayload = {},
): Promise<CompleteCommercialRequestResponse> {
return completeCommercialRequest(
await getRequiredCommercialCredentials(),
requestId,
payload,
);
}

export async function acceptCommercialProposal(
proposalId: string,
): Promise<CommercialRequestProposalMutationResponse> {
return acceptCommercialRequestProposal(
await getRequiredCommercialCredentials(),
proposalId,
);
}

export async function rejectCommercialProposal(
proposalId: string,
payload: RejectCommercialRequestProposalPayload = {},
): Promise<CommercialRequestProposalMutationResponse> {
return rejectCommercialRequestProposal(
await getRequiredCommercialCredentials(),
proposalId,
payload,
);
}

export async function withdrawCommercialProposal(
proposalId: string,
payload: WithdrawCommercialRequestProposalPayload = {},
): Promise<CommercialRequestProposalMutationResponse> {
return withdrawCommercialRequestProposal(
await getRequiredCommercialCredentials(),
proposalId,
payload,
);
}

export async function replaceRejectedCommercialPaymentProof(
paymentProofId: string,
payload: ReplaceCommercialPaymentProofPayload,
): Promise<ReplaceCommercialPaymentProofResponse> {
return replaceCommercialPaymentProof(
await getRequiredCommercialCredentials(),
paymentProofId,
payload,
);
}

export async function revalidateBusinessCartAfterRemoteConflict(
cart: BusinessCart,
): Promise<RevalidateBusinessCartLinesResult> {
const settled = await Promise.allSettled(
cart.lines.map(async (line) => {
const response = await loadPublicCommercialOffer(
line.commercialOfferId,
);

return {
line,
offer: response.offer,
};
}),
);

const updates: RevalidateBusinessCartLineInput[] = [];
const removedLineIds: string[] = [];

settled.forEach((result, index) => {
const line = cart.lines[index];

if (result.status === 'fulfilled') {
const { offer } = result.value;

const isUnavailable = (
offer.offer_kind !== 'product'
|| offer.commercial_profile_id !== cart.commercialProfileId
);

if (isUnavailable) {
removedLineIds.push(line.id);
return;
}

updates.push({
lineId: line.id,
title: offer.title,
pricingStrategy: offer.pricing_strategy,
unitPriceAmount: offer.base_price_amount,
requestedModality: (
cart.requestedModality
&& offer.modalities.includes(cart.requestedModality)
? cart.requestedModality
: offer.modalities[0] || null
),
imageUrl: (
offer.images.find((image) => image.is_primary)?.url
|| offer.images[0]?.url
|| null
),
});
return;
}

if (
result.reason instanceof ApiRequestError
&& [400, 404, 409, 422].includes(result.reason.status)
) {
removedLineIds.push(line.id);
}
});

return revalidateBusinessCartLines(
updates,
removedLineIds,
);
}

