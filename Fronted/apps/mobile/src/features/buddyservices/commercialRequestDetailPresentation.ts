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

if (requestType === 'mixed_request') {
return 'Compra y reserva';
}

if (requestType === 'booking_request') {
return 'Reserva solicitada';
}

return 'Productos solicitados';
}

export function getCommercialRequestItemLifecycleLabel(
status: string | null | undefined,
): string {
const labels: Record<string, string> = {
pending_business: 'Requiere respuesta del comercio',
pending_customer: 'Esperando decisión del cliente',
accepted: 'Términos aceptados',
rejected: 'Ítem rechazado',
withdrawn: 'Ítem retirado',
payment_pending: 'Pendiente de pago',
payment_submitted: 'Comprobante en revisión',
confirmed: 'Confirmado',
preparing: 'Preparando',
ready_for_pickup: 'Listo para recoger',
shipped: 'Enviado',
delivered: 'Entregado',
in_progress: 'En curso',
completed: 'Completado',
no_show: 'No asistió',
cancelled: 'Cancelado',
expired: 'Vencido',
};

return labels[String(status || '')] || 'Estado por confirmar';
}

export function getCommercialRequestItemFinalPriceLabel(
item: CommercialRequestDetailItem,
formatCurrency: (amount: number | null) => string,
): string | null {
if (item.final_line_total_amount === null
|| item.final_line_total_amount === undefined) {
return null;
}

return `Total acordado: ${formatCurrency(
item.final_line_total_amount,
)}`;
}

export function getCommercialRequestItemStockLabel(
item: CommercialRequestDetailItem,
): string | null {
if (!item.track_inventory) {
return null;
}

if (item.stock_quantity === null
|| item.stock_quantity === undefined) {
return 'Inventario controlado';
}

return `Stock al crear solicitud: ${item.stock_quantity}`;
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
