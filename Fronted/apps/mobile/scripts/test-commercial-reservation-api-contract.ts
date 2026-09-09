import {
createCommercialRequestProposal,
createCommercialReservationHold,
getCommercialRequestFormalDetail,
transitionCommercialRequest,
} from '@beeapp/api-client';
import type {
AuthCredentials,
} from '@beeapp/shared-types';

type HttpCall = {
method: 'get' | 'post';
path: string;
payload?: unknown;
options?: unknown;
};

const calls: HttpCall[] = [];

const credentials: AuthCredentials = {
scheme: 'Bearer',
token: 'test-commercial-reservation-token',
};

async function main() {
const apiClientModule = await import('@beeapp/api-client');

const candidate = apiClientModule as unknown as {
api?: {
get: (
path: string,
options?: unknown,
) => Promise<unknown>;
post: (
path: string,
payload?: unknown,
options?: unknown,
) => Promise<unknown>;
};
};

if (!candidate.api) {
throw new Error(
'No fue posible acceder al cliente HTTP exportado para validar el contrato.',
);
}

const originalGet = candidate.api.get;
const originalPost = candidate.api.post;

candidate.api.get = async (path, options) => {
calls.push({
method: 'get',
path,
options,
});
return {} as never;
};

candidate.api.post = async (path, payload, options) => {
calls.push({
method: 'post',
path,
payload,
options,
});
return {} as never;
};

try {
await getCommercialRequestFormalDetail(
credentials,
'11111111-1111-4111-8111-111111111111',
);

await transitionCommercialRequest(
credentials,
'22222222-2222-4222-8222-222222222222',
{
action: 'cancel',
reason_code: 'customer_request',
reason_text: 'No puedo asistir en ese horario.',
},
);

await createCommercialRequestProposal(
credentials,
'33333333-3333-4333-8333-333333333333',
{
proposed_starts_at: '2026-09-10T15:00:00.000Z',
proposed_ends_at: '2026-09-10T16:00:00.000Z',
timezone: 'America/Bogota',
note: 'Horario propuesto por el comercio.',
},
);

await createCommercialReservationHold(
credentials,
'44444444-4444-4444-8444-444444444444',
{
starts_at: '2026-09-10T15:00:00.000Z',
timezone: 'America/Bogota',
},
);
} finally {
candidate.api.get = originalGet;
candidate.api.post = originalPost;
}

const expected: HttpCall[] = [
{
method: 'get',
path: (
'/commercial/requests/'
+ '11111111-1111-4111-8111-111111111111/'
+ 'formal-detail/'
),
options: {
auth: credentials,
},
},
{
method: 'post',
path: (
'/commercial/requests/'
+ '22222222-2222-4222-8222-222222222222/'
+ 'transition/'
),
payload: {
action: 'cancel',
reason_code: 'customer_request',
reason_text: 'No puedo asistir en ese horario.',
},
options: {
auth: credentials,
},
},
{
method: 'post',
path: (
'/commercial/requests/'
+ '33333333-3333-4333-8333-333333333333/'
+ 'proposals/'
),
payload: {
proposed_starts_at: '2026-09-10T15:00:00.000Z',
proposed_ends_at: '2026-09-10T16:00:00.000Z',
timezone: 'America/Bogota',
note: 'Horario propuesto por el comercio.',
},
options: {
auth: credentials,
},
},
{
method: 'post',
path: (
'/commercial/requests/'
+ '44444444-4444-4444-8444-444444444444/'
+ 'reservation-hold/'
),
payload: {
starts_at: '2026-09-10T15:00:00.000Z',
timezone: 'America/Bogota',
},
options: {
auth: credentials,
},
},
];

const actualJson = JSON.stringify(calls);
const expectedJson = JSON.stringify(expected);

if (actualJson !== expectedJson) {
throw new Error(
`Contrato API de reservas inválido.\nEsperado: ${expectedJson}\nActual: ${actualJson}`,
);
}

console.log(
'OK: contrato API de reservas validado: detalle formal, transición, propuesta y hold.',
);
}

void main();
