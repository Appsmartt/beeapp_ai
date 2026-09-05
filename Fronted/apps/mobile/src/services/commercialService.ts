import {
  getCommercialCities,
  getCommercialCountries,
  getOwnedCommercialProfiles,
  getPublicCommercialCategories,
  getPublicCommercialCatalogs,
  getPublicCommercialOffer,
  getPublicCommercialOffers,
  getPublicCommercialProfile,
  getPublicCommercialProfiles,
} from '@beeapp/api-client';

import type {
  CommercialOfferType,
  GetCommercialCategoriesResponse,
  GetCommercialCitiesResponse,
  GetCommercialCountriesResponse,
  GetOwnedCommercialProfilesResponse,
  GetPublicCommercialCatalogsResponse,
  GetPublicCommercialOfferResponse,
  GetPublicCommercialOffersResponse,
  GetPublicCommercialProfileResponse,
  GetPublicCommercialProfilesResponse,
  PublicCommercialOffersQuery,
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
