import type {
CommercialRequestDetail,
CommercialRequestDetailItem,
} from '@beeapp/shared-types';

export type CommercialRequestTotalState =
| 'confirmed'
| 'estimated'
| 'pending_confirmation';

export function getCommercialRequestItemsTitle(
requestType: CommercialRequestDetail['request_type'],
): string {
if (requestType === 'service_request') {
return 'Servicio solicitado';
}

if (requestType === 'booking_request') {
return 'Reserva solicitada';
}

return 'Productos solicitados';
}

export function getCommercialRequestItemLabel(
item: CommercialRequestDetailItem,
): string {
if (item.offer_kind === 'service') {
return item.requires_booking
? 'Reserva'
: 'Servicio';
}

return 'Producto';
}

export function getCommercialRequestItemPriceLabel(
item: CommercialRequestDetailItem,
formatCurrency: (amount: number | null) => string,
): string {
if (item.pricing_strategy === 'free') {
return 'Gratis';
}

if (item.pricing_strategy === 'starting_at') {
return `Desde ${formatCurrency(item.unit_price_amount)}`;
}

if (item.pricing_strategy === 'to_be_confirmed') {
return 'Precio por confirmar';
}

return formatCurrency(item.line_total_amount);
}

export function getCommercialRequestLineComment(
item: CommercialRequestDetailItem,
): string | null {
const value = item.original_terms?.line_comment;

if (typeof value !== 'string') {
return null;
}

const normalized = value.trim();

return normalized || null;
}

export function getCommercialRequestTotalState(
requestDetail: CommercialRequestDetail,
): CommercialRequestTotalState {
if (
requestDetail.items.some(
(item) => item.pricing_strategy === 'to_be_confirmed',
)
|| requestDetail.total_amount === null
) {
return 'pending_confirmation';
}

if (
requestDetail.items.some(
(item) => item.pricing_strategy === 'starting_at',
)
) {
return 'estimated';
}

return 'confirmed';
}

export function getCommercialRequestTotalLabel(
state: CommercialRequestTotalState,
): string {
if (state === 'estimated') {
return 'Total estimado';
}

if (state === 'pending_confirmation') {
return 'Total pendiente de confirmación';
}

return 'Total confirmado';
}
