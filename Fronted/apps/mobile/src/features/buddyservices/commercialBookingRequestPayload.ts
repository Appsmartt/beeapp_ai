import type {
CommercialModality,
CommercialPublicOffer,
CreateCommercialRequestPayload,
} from '@beeapp/shared-types';

import {
toCommercialReservationStartsAtIso,
} from './commercialReservationDateTime';

export type BuildBookingRequestPayloadInput = {
commercialOfferId: string;
commercialProfileId: string;
requestedModality: CommercialModality;
customerNote?: string | null;
deliveryAddress?: string | null;
deliveryReference?: string | null;
localDate: string;
localTime: string;
timezone: string;
now?: Date;
};

function normalizeRequired(
value: string | null | undefined,
fieldLabel: string,
): string {
const normalizedValue = String(value || '').trim();

if (!normalizedValue) {
throw new Error(`Ingresa ${fieldLabel}.`);
}

return normalizedValue;
}

function normalizeOptional(
value: string | null | undefined,
): string | undefined {
const normalizedValue = String(value || '').trim();

return normalizedValue || undefined;
}

export function isBookableServiceOffer(
offer: CommercialPublicOffer | null | undefined,
): offer is CommercialPublicOffer {
return Boolean(
offer
&& offer.offer_kind === 'service'
&& offer.requires_booking,
);
}

export function buildBookingRequestPayload(
input: BuildBookingRequestPayloadInput,
): CreateCommercialRequestPayload {
const commercialOfferId = normalizeRequired(
input.commercialOfferId,
'el servicio',
);
const commercialProfileId = normalizeRequired(
input.commercialProfileId,
'el negocio',
);
const timezone = normalizeRequired(
input.timezone,
'la zona horaria',
);
const startsAt = toCommercialReservationStartsAtIso({
localDate: input.localDate,
localTime: input.localTime,
timezone,
now: input.now,
});
const customerNote = normalizeOptional(input.customerNote);
const deliveryAddress = normalizeOptional(input.deliveryAddress);
const deliveryReference = normalizeOptional(input.deliveryReference);

if (
input.requestedModality === 'delivery'
&& !deliveryAddress
) {
throw new Error(
'Ingresa la dirección para la entrega a domicilio.',
);
}

return {
request_type: 'booking_request',
commercial_profile_id: commercialProfileId,
requested_modality: input.requestedModality,
...(customerNote ? { customer_note: customerNote } : {}),
...(deliveryAddress ? { delivery_address: deliveryAddress } : {}),
...(deliveryReference
? { delivery_reference: deliveryReference }
: {}),
items: [
{
commercial_offer_id: commercialOfferId,
quantity: 1,
line_comment: (
`Fecha y hora solicitadas: ${startsAt} `
+ `(${timezone}). La fecha queda sujeta a confirmación `
+ 'del negocio.'
),
},
],
};
}
