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
  query: {
    country_code?: string;
    city?: string;
    offer_type?: CommercialOfferType;
  } = {},
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
