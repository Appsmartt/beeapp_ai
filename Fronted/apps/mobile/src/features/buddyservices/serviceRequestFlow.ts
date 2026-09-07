import type {
CommercialModality,
CommercialPublicOffer,
} from '@beeapp/shared-types';

export function isNonBookableServiceOffer(
offer: CommercialPublicOffer | null | undefined,
): offer is CommercialPublicOffer {
return Boolean(
offer
&& offer.offer_kind === 'service'
&& !offer.requires_booking,
);
}

export function canSubmitServiceRequest(
params: {
offer: CommercialPublicOffer | null | undefined;
requestedModality: CommercialModality | null;
deliveryAddress: string | null | undefined;
submitting: boolean;
},
): boolean {
if (
!isNonBookableServiceOffer(params.offer)
|| !params.requestedModality
|| params.submitting
) {
return false;
}

if (params.requestedModality === 'delivery') {
return Boolean(String(params.deliveryAddress || '').trim());
}

return true;
}

export function getServiceRequestPriceLabel(
offer: CommercialPublicOffer,
formatCurrency: (amount: number | null) => string,
): string {
if (offer.pricing_strategy === 'free') {
return 'Gratis';
}

if (offer.pricing_strategy === 'to_be_confirmed') {
return 'Precio por confirmar';
}

const amount = formatCurrency(offer.base_price_amount);

if (offer.pricing_strategy === 'starting_at') {
return `Desde ${amount}`;
}

return amount;
}

export function getServiceRequestPriceHint(
offer: CommercialPublicOffer,
): string {
if (offer.pricing_strategy === 'starting_at') {
return (
'El precio mostrado es una referencia inicial. '
+ 'No es un total final.'
);
}

if (offer.pricing_strategy === 'to_be_confirmed') {
return (
'El negocio confirmará el valor dentro de la solicitud. '
+ 'No se muestra un total estimado.'
);
}

if (offer.pricing_strategy === 'free') {
return 'El servicio no tiene costo.';
}

return 'El valor final queda sujeto a la revisión de la solicitud.';
}

export function shouldRefreshServiceOfferAfterError(
status: number | null | undefined,
): boolean {
return [400, 404, 409, 422].includes(Number(status));
}
