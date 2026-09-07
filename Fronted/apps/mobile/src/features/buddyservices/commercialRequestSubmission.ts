import {
createCommercialRequest,
} from '@beeapp/api-client';

import type {
AuthCredentials,
CreateCommercialRequestPayload,
CreateCommercialRequestResponse,
} from '@beeapp/shared-types';

export function normalizeCommercialRequestIdempotencyKey(
idempotencyKey: string,
): string {
const normalizedIdempotencyKey = String(
idempotencyKey || '',
).trim();

if (!normalizedIdempotencyKey) {
throw new Error(
'No fue posible preparar la solicitud. Inténtalo nuevamente.',
);
}

return normalizedIdempotencyKey;
}

export async function submitCommercialRequest(
credentials: AuthCredentials,
idempotencyKey: string,
payload: CreateCommercialRequestPayload,
): Promise<CreateCommercialRequestResponse> {
return createCommercialRequest(
credentials,
normalizeCommercialRequestIdempotencyKey(
idempotencyKey,
),
payload,
);
}
