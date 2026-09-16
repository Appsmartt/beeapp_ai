import {
  ApiRequestError,
} from '@beeapp/api-client';

export type CommercialUiErrorCode =
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export type CommercialUiError = {
  code?: CommercialUiErrorCode;
  title: string;
  message: string;
  retryable: boolean;
};

function createCommercialUiError(
  code: CommercialUiErrorCode,
  title: string,
  message: string,
  retryable: boolean,
): CommercialUiError {
  return {
    code,
    title,
    message,
    retryable,
  };
}

function isNetworkLikeError(error: Error): boolean {
  const message = error.message.toLowerCase();

  return [
    'network request failed',
    'network error',
    'failed to fetch',
    'fetch failed',
    'timeout',
    'timed out',
    'offline',
    'internet',
    'connection',
  ].some((fragment) => message.includes(fragment));
}

function getCommercialValidationUiError(
  detail: string,
): CommercialUiError {
  const normalizedDetail = detail.toLowerCase();

  if (
    [
      'stock',
      'inventory',
      'insufficient',
      'out of stock',
      'sin inventario',
      'sin stock',
    ].some((fragment) => normalizedDetail.includes(fragment))
  ) {
    return createCommercialUiError(
      'CONFLICT',
      'Inventario no disponible',
      'El negocio ya no tiene unidades suficientes para esta solicitud. Revisa el carrito e inténtalo nuevamente.',
      true,
    );
  }

  if (
    [
      'different business',
      'same business',
      'commercial profile',
      'otro negocio',
    ].some((fragment) => normalizedDetail.includes(fragment))
  ) {
    return createCommercialUiError(
      'CONFLICT',
      'Carrito de otro negocio',
      'Todos los productos y servicios de una solicitud deben pertenecer al mismo negocio.',
      false,
    );
  }

  if (
    [
      'closed',
      'withdrawn',
      'rejected',
      'cannot modify',
      'ítem cerrado',
      'item closed',
    ].some((fragment) => normalizedDetail.includes(fragment))
  ) {
    return createCommercialUiError(
      'CONFLICT',
      'Ítem ya cerrado',
      'Este ítem ya no admite cambios. Para solicitarlo nuevamente, crea una solicitud nueva.',
      false,
    );
  }

  if (
    [
      'offer unavailable',
      'offer inactive',
      'offer not available',
      'oferta no disponible',
    ].some((fragment) => normalizedDetail.includes(fragment))
  ) {
    return createCommercialUiError(
      'NOT_FOUND',
      'Oferta no disponible',
      'Una oferta del carrito ya no está disponible. Revísala o elimínala antes de continuar.',
      false,
    );
  }

  return createCommercialUiError(
    'UNKNOWN_ERROR',
    'Información por revisar',
    'No fue posible enviar la solicitud con la información actual. Revisa el carrito e inténtalo nuevamente.',
    false,
  );
}

export function toCommercialUiError(
  error: unknown,
): CommercialUiError {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return createCommercialUiError(
        'SESSION_EXPIRED',
        'Sesión vencida',
        'Tu sesión venció o ya no es válida. Inicia sesión nuevamente para continuar.',
        false,
      );
    }

    if (error.status === 403) {
      return createCommercialUiError(
        'FORBIDDEN',
        'Sin acceso',
        'No tienes permiso para ver o realizar esta acción comercial.',
        false,
      );
    }

    if (error.status === 404) {
      return createCommercialUiError(
        'NOT_FOUND',
        'Ya no está disponible',
        'Este negocio, catálogo, oferta o solicitud ya no está disponible.',
        false,
      );
    }

    if (error.status === 409) {
      return createCommercialUiError(
        'CONFLICT',
        'Información actualizada',
        'El contenido cambió mientras lo consultabas. Actualiza la información e inténtalo nuevamente.',
        true,
      );
    }

    if (error.status === 429) {
      return createCommercialUiError(
        'RATE_LIMITED',
        'Demasiadas solicitudes',
        'Espera un momento antes de intentarlo nuevamente.',
        true,
      );
    }

    if (error.status >= 500) {
      return createCommercialUiError(
        'SERVER_ERROR',
        'Servicio temporalmente no disponible',
        'No fue posible completar la operación por un problema temporal. Inténtalo nuevamente.',
        true,
      );
    }

    const diagnosticDetail = error.message.trim();

    console.warn(
      '[commercial:create] API error diagnostic',
      {
        status: error.status,
        detail: diagnosticDetail,
      },
    );

    if ([400, 422].includes(error.status)) {
      return getCommercialValidationUiError(diagnosticDetail);
    }

    return createCommercialUiError(
      'UNKNOWN_ERROR',
      'No fue posible completar la operación',
      'Ocurrió un problema al procesar la solicitud. Inténtalo nuevamente.',
      false,
    );
  }

  if (error instanceof Error && isNetworkLikeError(error)) {
    return createCommercialUiError(
      'NETWORK_ERROR',
      'Sin conexión',
      'No pudimos comunicarnos con BeeApp. Revisa tu conexión e inténtalo nuevamente.',
      true,
    );
  }

  return createCommercialUiError(
    'UNKNOWN_ERROR',
    'No fue posible completar la operación',
    'Ocurrió un error inesperado. Inténtalo nuevamente.',
    true,
  );
}
