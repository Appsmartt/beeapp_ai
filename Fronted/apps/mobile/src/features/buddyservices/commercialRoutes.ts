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

export function buddyServicesManageBusinessRoute(
businessId: string,
): Href {
return {
pathname: '/(main)/beeservices/manage/[businessId]',
params: {
businessId: requireId(businessId, 'el negocio'),
},
};
}

export function buddyServicesManageOfferRoute(
businessId: string,
offerId: string,
): Href {
return {
pathname: '/(main)/beeservices/manage/[businessId]/offers/[offerId]',
params: {
businessId: requireId(businessId, 'el negocio'),
offerId: requireId(offerId, 'la oferta'),
},
};
}

export function buddyServicesManagePaymentMethodsRoute(
businessId: string,
): Href {
return {
pathname: '/(main)/beeservices/manage/[businessId]/payment-methods',
params: {
businessId: requireId(businessId, 'el negocio'),
},
};
}

export function buddyServicesManageOffersRoute(
businessId: string,
): Href {
return {
pathname: '/(main)/beeservices/manage/[businessId]/offers',
params: {
businessId: requireId(businessId, 'el negocio'),
},
};
}

export function buddyServicesManageCatalogsRoute(
businessId: string,
): Href {
return {
pathname: '/(main)/beeservices/manage/[businessId]/catalogs',
params: {
businessId: requireId(businessId, 'el negocio'),
},
};
}

export function buddyServicesManageProfileRoute(
businessId: string,
): Href {
return {
pathname: '/(main)/beeservices/manage/[businessId]/profile',
params: {
businessId: requireId(businessId, 'el negocio'),
},
};
}

export function buddyServicesManageOperationRoute(
businessId: string,
): Href {
return {
pathname: '/(main)/beeservices/manage/[businessId]/operation',
params: {
businessId: requireId(businessId, 'el negocio'),
},
};
}

export function buddyServicesMyPurchasesRoute(): Href {
  return '/(main)/beeservices/my-purchases';
}
