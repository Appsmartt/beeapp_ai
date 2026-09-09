import type {
  CommercialReservation,
} from '@beeapp/shared-types';

import {
  COMMERCIAL_RESERVATION_PENDING_NOTICE,
  formatCommercialReservationDateTime,
  getCommercialReservationHoldInfo,
} from './commercialReservationDateTime';

export type CommercialReservationStatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger';

export type CommercialReservationPresentation = {
  statusLabel: string;
  statusTone: CommercialReservationStatusTone;
  startsAtLabel: string;
  endsAtLabel: string;
  holdExpiresAtLabel: string | null;
  holdRemainingSeconds: number | null;
  isHoldActive: boolean;
  pendingNotice: string | null;
};

export function getCommercialReservationStatusLabel(
  status: CommercialReservation['status'],
): string {
  const labels: Record<CommercialReservation['status'], string> = {
    proposed: 'Fecha propuesta',
    hold: 'Hold activo',
    payment_pending: 'Pago pendiente',
    confirmed: 'Reserva confirmada',
    completed: 'Reserva completada',
    cancelled: 'Reserva cancelada',
    rejected: 'Reserva rechazada',
    expired: 'Reserva expirada',
    no_show: 'No asistió',
  };

  return labels[status];
}

export function getCommercialReservationStatusTone(
  status: CommercialReservation['status'],
): CommercialReservationStatusTone {
  if (status === 'confirmed' || status === 'completed') {
    return 'success';
  }

  if (
    status === 'cancelled'
    || status === 'rejected'
    || status === 'expired'
    || status === 'no_show'
  ) {
    return 'danger';
  }

  if (status === 'hold' || status === 'payment_pending') {
    return 'warning';
  }

  return 'neutral';
}

export function presentCommercialReservation(
  reservation: CommercialReservation,
  now: Date = new Date(),
): CommercialReservationPresentation {
  const holdInfo = getCommercialReservationHoldInfo(
    reservation.hold_expires_at,
    now,
  );

  return {
    statusLabel: getCommercialReservationStatusLabel(
      reservation.status,
    ),
    statusTone: getCommercialReservationStatusTone(
      reservation.status,
    ),
    startsAtLabel: formatCommercialReservationDateTime(
      reservation.starts_at,
      reservation.timezone,
    ),
    endsAtLabel: formatCommercialReservationDateTime(
      reservation.ends_at,
      reservation.timezone,
    ),
    holdExpiresAtLabel: holdInfo.expiresAtLabel
      ? formatCommercialReservationDateTime(
        holdInfo.expiresAtLabel,
        reservation.timezone,
      )
      : null,
    holdRemainingSeconds: (
      reservation.status === 'hold' && holdInfo.isActive
        ? holdInfo.remainingSeconds
        : null
    ),
    isHoldActive: reservation.status === 'hold' && holdInfo.isActive,
    pendingNotice: (
      reservation.status === 'proposed' || reservation.status === 'hold'
        ? COMMERCIAL_RESERVATION_PENDING_NOTICE
        : null
    ),
  };
}
