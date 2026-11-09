import { useCallback, useRef, useState } from 'react';
import type {
  CommercialProfileDeletionStatus,
} from '@beeapp/shared-types';

import { appAlert } from '../../components/feedback/appAlert';
import {
  deleteOwnedCommercialProfile,
  loadOwnedCommercialProfileDeletionStatus,
} from '../../services/commercialService';
import { toCommercialUiError } from './commercialErrors';

export type OwnedBusinessDeleteState =
  | 'idle'
  | 'checking'
  | 'allowed'
  | 'blocked'
  | 'error';

interface DeletableBusiness {
  id: string;
  display_name: string;
}

interface UseDeleteOwnedBusinessOptions {
  onDeleted: (businessId: string) => void;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Motivo legible por el que un negocio no se puede eliminar. */
export function describeDeleteBlockers(
  status: CommercialProfileDeletionStatus,
): string {
  const parts: string[] = [];

  if (status.chats > 0) {
    parts.push(plural(status.chats, 'chat', 'chats'));
  }

  if (status.orders > 0) {
    parts.push(
      plural(status.orders, 'compra o solicitud', 'compras o solicitudes'),
    );
  }

  return `Tiene ${parts.join(' y ')}.`;
}

export const OWNED_BUSINESS_DELETE_DESCRIPTIONS = {
  checking: 'Verificando si se puede eliminar…',
  allowed: 'Borra el negocio y todos sus datos',
  error: 'No se pudo verificar. Toca para reintentar',
} as const;

/**
 * Flujo de eliminación de un negocio propio: consulta si nunca se usó,
 * confirma con el dueño y elimina. La regla definitiva vive en la base
 * de datos; aquí solo se muestra el motivo cuando está bloqueado.
 */
export function useDeleteOwnedBusiness({
  onDeleted,
}: UseDeleteOwnedBusinessOptions) {
  const [state, setState] = useState<OwnedBusinessDeleteState>('idle');
  const [status, setStatus] = useState<CommercialProfileDeletionStatus | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const latestCheckRef = useRef(0);

  const description = state === 'blocked' && status
    ? `${describeDeleteBlockers(status)} Puedes desactivarlo en su lugar.`
    : state === 'checking' || state === 'idle'
      ? OWNED_BUSINESS_DELETE_DESCRIPTIONS.checking
      : state === 'error'
        ? OWNED_BUSINESS_DELETE_DESCRIPTIONS.error
        : OWNED_BUSINESS_DELETE_DESCRIPTIONS.allowed;

  const reset = useCallback(() => {
    latestCheckRef.current += 1;
    setState('idle');
    setStatus(null);
  }, []);

  const checkStatus = useCallback(async (
    businessId: string,
  ): Promise<CommercialProfileDeletionStatus | null> => {
    const checkId = latestCheckRef.current + 1;

    latestCheckRef.current = checkId;
    setState('checking');

    try {
      const response = await loadOwnedCommercialProfileDeletionStatus(
        businessId,
      );

      if (latestCheckRef.current === checkId) {
        setStatus(response);
        setState(response.can_delete ? 'allowed' : 'blocked');
      }

      return response;
    } catch {
      if (latestCheckRef.current === checkId) {
        setStatus(null);
        setState('error');
      }

      return null;
    }
  }, []);

  const confirmAndDelete = useCallback((business: DeletableBusiness) => {
    appAlert(
      'Eliminar negocio',
      `Se eliminará "${business.display_name}" junto con sus catálogos, `
        + 'productos y servicios, horarios y métodos de pago. '
        + 'Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);

              try {
                await deleteOwnedCommercialProfile(business.id);
                onDeleted(business.id);
                appAlert(
                  'Negocio eliminado',
                  `"${business.display_name}" fue eliminado.`,
                );
              } catch (error) {
                const uiError = toCommercialUiError(error);

                appAlert('No fue posible eliminar el negocio', uiError.message);
                void checkStatus(business.id);
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  }, [checkStatus, onDeleted]);

  const requestDelete = useCallback(async (business: DeletableBusiness) => {
    if (deleting || state === 'checking') {
      return;
    }

    const current = state === 'allowed' || state === 'blocked'
      ? status
      : await checkStatus(business.id);

    if (!current) {
      appAlert(
        'No fue posible verificar',
        'No pudimos comprobar si el negocio se puede eliminar. '
          + 'Inténtalo nuevamente.',
      );
      return;
    }

    if (!current.can_delete) {
      appAlert(
        'No se puede eliminar',
        `${describeDeleteBlockers(current)} Un negocio con chats, compras o `
          + 'solicitudes no se puede eliminar, pero puedes desactivarlo '
          + 'para que deje de estar disponible para los clientes.',
      );
      return;
    }

    confirmAndDelete(business);
  }, [checkStatus, confirmAndDelete, deleting, state, status]);

  return {
    state,
    status,
    description,
    deleting,
    checkStatus,
    requestDelete,
    reset,
  };
}

