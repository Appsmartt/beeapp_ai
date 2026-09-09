import type {
  CommercialReservation,
} from '@beeapp/shared-types';

import {
  getCommercialReservationStatusLabel,
  getCommercialReservationStatusTone,
  presentCommercialReservation,
} from '../src/features/buddyservices/commercialReservationPresentation';

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function reservation(
  status: CommercialReservation['status'],
  holdExpiresAt: string | null = null,
): CommercialReservation {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    commerce_request_id: '22222222-2222-4222-8222-222222222222',
    commercial_profile_id: '33333333-3333-4333-8333-333333333333',
    commercial_offer_id: '44444444-4444-4444-8444-444444444444',
    source_proposal_id: null,
    status,
    starts_at: '2026-09-10T14:30:00.000Z',
    ends_at: '2026-09-10T15:30:00.000Z',
    timezone: 'America/Bogota',
    hold_started_at: (
      holdExpiresAt
        ? '2026-09-09T00:00:00.000Z'
        : null
    ),
    hold_expires_at: holdExpiresAt,
    completed_at: null,
    no_show_at: null,
    no_show_marked_by_profile_id: null,
    no_show_reason: null,
    created_at: '2026-09-09T00:00:00.000Z',
    updated_at: '2026-09-09T00:00:00.000Z',
  };
}

const allStatuses: CommercialReservation['status'][] = [
  'proposed',
  'hold',
  'payment_pending',
  'confirmed',
  'completed',
  'cancelled',
  'rejected',
  'expired',
  'no_show',
];

for (const status of allStatuses) {
  assert(
    Boolean(getCommercialReservationStatusLabel(status)),
    `Falta etiqueta para ${status}.`,
  );
  assert(
    Boolean(getCommercialReservationStatusTone(status)),
    `Falta tono para ${status}.`,
  );
}

const now = new Date('2026-09-09T00:00:00.000Z');

const activeHold = presentCommercialReservation(
  reservation('hold', '2026-09-09T00:01:30.000Z'),
  now,
);

assert(
  activeHold.statusLabel === 'Hold activo',
  'La etiqueta de hold es incorrecta.',
);
assert(
  activeHold.isHoldActive
  && activeHold.holdRemainingSeconds === 90
  && activeHold.holdExpiresAtLabel !== null,
  'El hold activo no muestra expiración backend de forma confiable.',
);
assert(
  activeHold.pendingNotice !== null,
  'El hold debe mostrar el aviso de no confirmación.',
);

const expiredHold = presentCommercialReservation(
  reservation('hold', '2026-09-08T23:59:59.000Z'),
  now,
);

assert(
  !expiredHold.isHoldActive
  && expiredHold.holdRemainingSeconds === null,
  'El contador no debe mostrarse para un hold vencido.',
);

const proposed = presentCommercialReservation(
  reservation('proposed'),
  now,
);

assert(
  proposed.pendingNotice !== null,
  'Una propuesta debe mostrar el aviso de no confirmación.',
);

const confirmed = presentCommercialReservation(
  reservation('confirmed'),
  now,
);

assert(
  confirmed.statusTone === 'success'
  && confirmed.pendingNotice === null,
  'La confirmación no se presenta correctamente.',
);

const rejected = presentCommercialReservation(
  reservation('rejected'),
  now,
);

assert(
  rejected.statusTone === 'danger',
  'El rechazo debe representarse como estado de riesgo.',
);

console.log(
  'OK: presentación de estados, hold y expiración backend validada.',
);
