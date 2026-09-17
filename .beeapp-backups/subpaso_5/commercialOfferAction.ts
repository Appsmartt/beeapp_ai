import type {
CommercialPublicOffer,
} from '@beeapp/shared-types';

export type CommercialOfferAction =
| 'add_to_cart'
| 'request_service'
| 'request_booking';

export function getCommercialOfferAction(
offer: CommercialPublicOffer,
): CommercialOfferAction {
if (offer.requires_booking) {
return 'request_booking';
}

if (offer.offer_kind === 'product') {
return 'add_to_cart';
}

return 'request_service';
}

export function getCommercialOfferActionLabel(
action: CommercialOfferAction,
): string {
if (action === 'add_to_cart') {
return 'Agregar al carrito';
}

if (action === 'request_service') {
return 'Enviar solicitud';
}

return 'Solicitar reserva';
}

export function getDefaultRequestedModality(
offer: CommercialPublicOffer,
): CommercialPublicOffer['modalities'][number] | null {
return offer.modalities[0] || null;
}
