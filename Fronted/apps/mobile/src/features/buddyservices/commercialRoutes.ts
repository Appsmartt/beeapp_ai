import type { Href } from 'expo-router';

function requireId(
  value: string,
  label: string,
): string {
  const normalized = String(value || '').trim();

  if (!normalized) {
    throw new Error(
      `No fue posible identificar ${label}.`,
    );
  }

  return normalized;
}

export function buddyServicesHomeRoute(): Href {
  return '/(main)/beeservices';
}

export function buddyServicesResultsRoute(
  params: {
    countryCode: string;
    city: string;
    categoryId?: string;
    search?: string;
  },
): Href {
  return {
    pathname: '/(main)/beeservices/results',
    params: {
      countryCode: requireId(params.countryCode, 'el país'),
      city: requireId(params.city, 'la ciudad'),
      ...(params.categoryId
        ? {
          categoryId: requireId(
            params.categoryId,
            'la categoría',
          ),
        }
        : {}),
      ...(params.search?.trim()
        ? {
          search: params.search.trim(),
        }
        : {}),
    },
  };
}

export function buddyServicesPublicProfileRoute(
  profileId: string,
): Href {
  return {
    pathname: '/(main)/beeservices/profile/[profileId]',
    params: {
      profileId: requireId(profileId, 'el negocio'),
    },
  };
}

export function buddyServicesPublicOfferRoute(
  offerId: string,
): Href {
  return {
    pathname: '/(main)/beeservices/offer/[offerId]',
    params: {
      offerId: requireId(offerId, 'la oferta'),
    },
  };
}

export function buddyServicesMyBusinessesRoute(): Href {
  return '/(main)/beeservices/my-businesses';
}

export function buddyServicesCreateBusinessRoute(): Href {
  return '/(main)/beeservices/create-business';
}

export function buddyServicesMyPurchasesRoute(): Href {
  return '/(main)/beeservices/my-purchases';
}
