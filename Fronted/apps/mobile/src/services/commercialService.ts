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
updateOwnedCommercialCatalog,
getPublicCommercialProfiles,
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
CommercialOfferType,
  CreateCommercialCatalogResponse,
CreateCommercialProfileResponse,
GetCommercialCategoriesResponse,
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
PublicCommercialOffersQuery,
  UpdateCommercialCatalogResponse,
UpdateCommercialProfileResponse,
PublicCommercialProfilesQuery,
} from '@beeapp/shared-types';

import {
  getValidSessionCredentials,
} from './authSession';

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
  query: {
    country_code?: string;
    city?: string;
    offer_type?: CommercialOfferType;
  } = {},
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
