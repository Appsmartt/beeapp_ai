import {
  ApiRequestError,
} from '@beeapp/api-client';

export type CommercialUiError = {
  title: string;
  message: string;
  retryable: boolean;
};

export function toCommercialUiError(
  error: unknown,
): CommercialUiError {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return {
        title: 'Sesión vencida',
        message: (
          'Tu sesión venció. Inicia sesión nuevamente '
          + 'para continuar.'
        ),
        retryable: false,
      };
    }

    if (error.status === 403) {
      return {
        title: 'Sin acceso',
        message: (
          'No tienes permiso para ver este contenido '
          + 'comercial.'
        ),
        retryable: false,
      };
    }

    if (error.status === 404) {
      return {
        title: 'No disponible',
        message: (
          'Este negocio, catálogo u oferta ya no está '
          + 'disponible.'
        ),
        retryable: false,
      };
    }

    if (error.status === 409) {
      return {
        title: 'Información actualizada',
        message: (
          'Otra persona cambió este contenido. '
          + 'Actualiza e inténtalo nuevamente.'
        ),
        retryable: true,
      };
    }

    return {
      title: 'No fue posible cargar BuddyServices',
      message: error.message,
      retryable: error.status >= 500,
    };
  }

  if (error instanceof Error) {
    return {
      title: 'No fue posible cargar BuddyServices',
      message: error.message,
      retryable: true,
    };
  }

  return {
    title: 'No fue posible cargar BuddyServices',
    message: (
      'Ocurrió un error inesperado. Revisa tu conexión '
      + 'e inténtalo nuevamente.'
    ),
    retryable: true,
  };
}
