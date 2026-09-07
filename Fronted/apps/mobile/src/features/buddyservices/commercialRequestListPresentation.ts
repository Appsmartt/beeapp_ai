import type {
CommercialRequestListItem,
} from '@beeapp/shared-types';

export type CommercialRequestListStatusTone =
| 'neutral'
| 'success'
| 'warning'
| 'danger';

export function getCommercialRequestListTypeLabel(
requestType: CommercialRequestListItem['request_type'],
): string {
if (requestType === 'service_request') {
return 'Servicio';
}

if (requestType === 'booking_request') {
return 'Reserva';
}

return 'Compra';
}

export function getCommercialRequestListStatusLabel(
status: CommercialRequestListItem['status'],
): string {
const labels: Record<string, string> = {
draft: 'Borrador',
submitted: 'Solicitud enviada',
under_review: 'En revisión',
proposal_sent: 'Propuesta recibida',
accepted: 'Aceptada',
payment_pending: 'Pago pendiente',
payment_submitted: 'Pago enviado',
confirmed: 'Confirmada',
completed: 'Completada',
rejected: 'Rechazada',
cancelled: 'Cancelada',
expired: 'Vencida',
disputed: 'En disputa',
};

return labels[status] || status;
}

export function getCommercialRequestListStatusTone(
status: CommercialRequestListItem['status'],
): CommercialRequestListStatusTone {
if (
status === 'confirmed'
|| status === 'completed'
) {
return 'success';
}

if (
status === 'rejected'
|| status === 'cancelled'
|| status === 'expired'
) {
return 'danger';
}

if (
status === 'payment_pending'
|| status === 'payment_submitted'
|| status === 'proposal_sent'
) {
return 'warning';
}

return 'neutral';
}

export function getCommercialRequestListItemCountLabel(
itemCount: number,
): string {
return itemCount === 1
? '1 ítem'
: `${itemCount} ítems`;
}

export function formatCommercialRequestListAmount(
amount: number | null,
currencyCode: string,
): string {
if (amount === null) {
return 'Pendiente de confirmación';
}

return new Intl.NumberFormat(
'es-CO',
{
currency: currencyCode || 'COP',
maximumFractionDigits: 0,
style: 'currency',
},
).format(amount);
}

export function formatCommercialRequestListDate(
value: string,
): string {
const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return 'Fecha no disponible';
}

return new Intl.DateTimeFormat(
'es-CO',
{
day: 'numeric',
month: 'short',
year: 'numeric',
},
).format(date);
}
