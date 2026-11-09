import { useCallback, useRef, useState } from 'react';
import type {
  CommercialOfferDeletionStatus,
  CommercialOfferKind,
} from '@beeapp/shared-types';

import { appAlert } from '../../components/feedback/appAlert';
import {
  deleteOwnedOffer,
  loadOwnedOfferDeletionStatus,
} from '../../services/commercialService';
import { toCommercialUiError } from './commercialErrors';

export type OwnedOfferDeleteState =
  | 'idle'
  | 'checking'
  | 'allowed'
  | 'blocked'
  | 'error';

export interface DeletableOffer {
  id: string;
  commercial_profile_id: string;
  title: string;
  offer_kind: CommercialOfferKind;
}

interface UseDeleteOwnedOfferOptions {
  onDeleted: (offerId: string) => void;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Motivo legible por el que un producto o servicio no se puede eliminar. */
export function describeOfferDeleteBlockers(
  status: CommercialOfferDeletionStatus,
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

export const OWNED_OFFER_DELETE_DESCRIPTIONS = {
  checking: 'Verificando si se puede eliminar…',
  allowed: 'Borra este ítem de forma permanente',
  error: 'No se pudo verificar. Toca para reintentar',
} as const;

/**
 * Flujo de eliminación de un producto o servicio propio: consulta si nunca se usó
 * en chats, ventas o solicitudes, confirma con el dueño y elimina.
 */
export function useDeleteOwnedOffer({
  onDeleted,
}: UseDeleteOwnedOfferOptions) {
  const [state, setState] = useState<OwnedOfferDeleteState>('idle');
  const [status, setStatus] = useState<CommercialOfferDeletionStatus | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const latestCheckRef = useRef(0);
  const checkedOfferIdRef = useRef<string | null>(null);

  const description = state === 'blocked' && status
    ? `${describeOfferDeleteBlockers(status)} Puedes pausarlo o desactivarlo en su lugar.`
    : state === 'checking' || state === 'idle'
      ? OWNED_OFFER_DELETE_DESCRIPTIONS.checking
      : state === 'error'
        ? OWNED_OFFER_DELETE_DESCRIPTIONS.error
        : OWNED_OFFER_DELETE_DESCRIPTIONS.allowed;

  const reset = useCallback(() => {
    latestCheckRef.current += 1;
    checkedOfferIdRef.current = null;
    setState('idle');
    setStatus(null);
  }, []);

  const checkStatus = useCallback(async (
    businessId: string,
    offerId: string,
  ): Promise<CommercialOfferDeletionStatus | null> => {
    const checkId = latestCheckRef.current + 1;

    latestCheckRef.current = checkId;
    checkedOfferIdRef.current = offerId;
    setState('checking');

    try {
      const response = await loadOwnedOfferDeletionStatus(
        businessId,
        offerId,
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

  const confirmAndDelete = useCallback((offer: DeletableOffer) => {
    const kindWord = offer.offer_kind === 'product' ? 'producto' : 'servicio';
    const kindCapitalized = offer.offer_kind === 'product' ? 'Producto' : 'Servicio';

    appAlert(
      `Eliminar ${kindWord}`,
      `Se eliminará "${offer.title}" junto con sus fotos y configuración. `
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
                await deleteOwnedOffer(
                  offer.commercial_profile_id,
                  offer.id,
                );
                onDeleted(offer.id);
                appAlert(
                  `${kindCapitalized} eliminado`,
                  `"${offer.title}" fue eliminado.`,
                );
              } catch (error) {
                const uiError = toCommercialUiError(error);

                appAlert(
                  `No fue posible eliminar el ${kindWord}`,
                  uiError.message,
                );
                void checkStatus(offer.commercial_profile_id, offer.id);
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  }, [checkStatus, onDeleted]);

  const requestDelete = useCallback(async (offer: DeletableOffer) => {
    if (deleting || state === 'checking') {
      return;
    }

    const kindWord = offer.offer_kind === 'product' ? 'producto' : 'servicio';
    const isSameOfferChecked = (
      checkedOfferIdRef.current === offer.id
      && (state === 'allowed' || state === 'blocked')
      && status !== null
    );
    const current = isSameOfferChecked
      ? status
      : await checkStatus(offer.commercial_profile_id, offer.id);

    if (!current) {
      appAlert(
        'No fue posible verificar',
        `No pudimos comprobar si el ${kindWord} se puede eliminar. `
          + 'Inténtalo nuevamente.',
      );
      return;
    }

    if (!current.can_delete) {
      appAlert(
        'No se puede eliminar',
        `${describeOfferDeleteBlockers(current)} Un ${kindWord} que ya se usó en chats, `
          + 'ventas o solicitudes no se puede eliminar para conservar el historial, '
          + 'pero puedes pausarlo o desactivarlo para que deje de estar disponible.',
      );
      return;
    }

    confirmAndDelete(offer);
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
