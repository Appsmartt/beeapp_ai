import {
MAX_COMMERCIAL_PAYMENT_PROOF_SIZE_BYTES,
validateCommercialPaymentProof,
} from '../src/services/commercialPaymentProofValidation';

function expectThrows(
callback: () => void,
message: string,
): void {
let didThrow = false;

try {
callback();
} catch {
didThrow = true;
}

if (!didThrow) {
throw new Error(message);
}
}

validateCommercialPaymentProof({
uri: 'file:///tmp/comprobante.pdf',
name: 'comprobante.pdf',
mimeType: 'application/pdf',
sizeBytes: MAX_COMMERCIAL_PAYMENT_PROOF_SIZE_BYTES,
});

expectThrows(
() => validateCommercialPaymentProof({
uri: '',
name: 'comprobante.pdf',
mimeType: 'application/pdf',
sizeBytes: 100,
}),
'Debe rechazar comprobantes sin URI.',
);

expectThrows(
() => validateCommercialPaymentProof({
uri: 'file:///tmp/comprobante.pdf',
name: 'comprobante.pdf',
mimeType: 'application/pdf',
sizeBytes: MAX_COMMERCIAL_PAYMENT_PROOF_SIZE_BYTES + 1,
}),
'Debe rechazar comprobantes mayores a 50 MB.',
);

console.log('commercial payment proof service: OK');
