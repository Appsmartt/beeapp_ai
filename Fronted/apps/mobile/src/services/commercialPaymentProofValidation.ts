export const MAX_COMMERCIAL_PAYMENT_PROOF_SIZE_BYTES =
52_428_800;

const ALLOWED_COMMERCIAL_PAYMENT_PROOF_MIME_TYPES = new Set([
'application/pdf',
'image/jpeg',
'image/png',
'image/webp',
]);

export interface UploadableCommercialPaymentProof {
uri: string;
name?: string | null;
mimeType?: string | null;
sizeBytes?: number | null;
}

function normalizeMimeType(
mimeType: string | null | undefined,
): string {
const normalized = String(mimeType || '').trim().toLowerCase();
if (normalized === 'image/jpg' || normalized === 'image/pjpeg') {
return 'image/jpeg';
}
return normalized;
}

export function validateCommercialPaymentProof(
proof: UploadableCommercialPaymentProof,
): void {
if (!proof.uri?.trim()) {
throw new Error(
'No fue posible leer el comprobante seleccionado.',
);
}

const mimeType = normalizeMimeType(proof.mimeType);

if (
!ALLOWED_COMMERCIAL_PAYMENT_PROOF_MIME_TYPES.has(mimeType)
) {
throw new Error(
'Selecciona una captura JPG, PNG o WEBP, o un comprobante PDF.',
);
}

if (
proof.sizeBytes !== null
&& proof.sizeBytes !== undefined
&& proof.sizeBytes > MAX_COMMERCIAL_PAYMENT_PROOF_SIZE_BYTES
) {
throw new Error(
'El comprobante debe pesar máximo 50 MB.',
);
}
}
