import assert from 'node:assert/strict';

import {
  ApiRequestError,
} from '@beeapp/api-client';

import {
  isCommercialInventoryInsufficientError,
  toCommercialUiError,
} from '../src/features/buddyservices/commercialErrors';

function run(): void {
  const insufficientStockError = new ApiRequestError(
    'Insufficient available stock.',
    409,
    '/api/commercial/requests/',
    {
      code: 'COMMERCE_INSUFFICIENT_STOCK',
      detail: 'Insufficient available stock.',
    },
  );

  assert.equal(
    isCommercialInventoryInsufficientError(
      insufficientStockError,
    ),
    true,
  );

  const insufficientStockUiError = toCommercialUiError(
    insufficientStockError,
  );

  assert.equal(
    insufficientStockUiError.title,
    'Inventario no disponible',
  );
  assert.match(
    insufficientStockUiError.message,
    /unidades suficientes/i,
  );

  const insufficientInventoryError = new ApiRequestError(
    'Insufficient inventory.',
    409,
    '/api/commercial/requests/',
    {
      code: 'COMMERCE_INSUFFICIENT_INVENTORY',
      detail: 'Insufficient inventory.',
    },
  );

  assert.equal(
    isCommercialInventoryInsufficientError(
      insufficientInventoryError,
    ),
    true,
  );

  assert.equal(
    toCommercialUiError(insufficientInventoryError).title,
    'Inventario no disponible',
  );

  const genericConflictError = new ApiRequestError(
    'Commercial offer changed; review the request.',
    409,
    '/api/commercial/requests/',
    {
      code: 'COMMERCE_OFFER_CHANGED',
      detail: 'Commercial offer changed; review the request.',
    },
  );

  assert.equal(
    isCommercialInventoryInsufficientError(
      genericConflictError,
    ),
    false,
  );

  assert.equal(
    toCommercialUiError(genericConflictError).title,
    'Información actualizada',
  );

  console.log(
    'OK: el stock insuficiente muestra la alerta correcta y no se clasifica como conflicto genérico.',
  );
}

run();
