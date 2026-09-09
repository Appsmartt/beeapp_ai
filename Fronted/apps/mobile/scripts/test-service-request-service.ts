import assert from 'node:assert/strict';
import Module from 'node:module';

const calls: {
createCommercialRequest: unknown[];
} = {
createCommercialRequest: [],
};

const originalRequire = Module.prototype.require;

Module.prototype.require = function patchedRequire(
request: string,
) {
if (request === '@beeapp/api-client') {
return {
createCommercialRequest: async (
credentials: unknown,
idempotencyKey: string,
payload: unknown,
) => {
calls.createCommercialRequest.push({
credentials,
idempotencyKey,
payload,
});

return {
request: {
request_id: 'request-1',
code: 'BS-2026-00000001',
status: 'submitted',
idempotent: false,
},
idempotent: false,
};
},
};
}

return originalRequire.apply(this, arguments as never);
};

const {
normalizeCommercialRequestIdempotencyKey,
submitCommercialRequest,
} = require(
'../src/features/buddyservices/commercialRequestSubmission',
) as typeof import(
'../src/features/buddyservices/commercialRequestSubmission'
);

async function run(): Promise<void> {
assert.equal(
normalizeCommercialRequestIdempotencyKey(
' service-request-idempotency-key ',
),
'service-request-idempotency-key',
);

assert.throws(
() => normalizeCommercialRequestIdempotencyKey('   '),
/No fue posible preparar la solicitud/,
);

const credentials = {
scheme: 'Bearer' as const,
token: 'test-access-token',
};

const payload = {
request_type: 'service_request' as const,
commercial_profile_id: 'business-1',
requested_modality: 'at_establishment' as const,
customer_note: 'Necesito el servicio esta semana.',
currency_code: 'COP' as const,
items: [
{
commercial_offer_id: 'service-offer-1',
quantity: 1,
},
],
};

const response = await submitCommercialRequest(
credentials,
' service-request-idempotency-key ',
payload,
);

assert.deepEqual(calls.createCommercialRequest, [
{
credentials,
idempotencyKey: 'service-request-idempotency-key',
payload,
},
]);

assert.equal(response.request.request_id, 'request-1');
assert.equal(response.request.status, 'submitted');

await assert.rejects(
submitCommercialRequest(
credentials,
'',
payload,
),
/No fue posible preparar la solicitud/,
);

assert.equal(
calls.createCommercialRequest.length,
1,
);

console.log(
'OK: submitCommercialRequest valida y delega la solicitud con idempotencia.',
);
}

void run().catch((error: unknown) => {
console.error(
'ERROR: Falló la prueba de submitCommercialRequest.',
);
console.error(error);
process.exitCode = 1;
});
