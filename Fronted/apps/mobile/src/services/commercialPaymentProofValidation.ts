export const MAX_COMMERCIAL_PAYMENT_PROOF_SIZE_BYTES =
52_428_800;

export interface UploadableCommercialPaymentProof {
uri: string;
name?: string | null;
mimeType?: string | null;
sizeBytes?: number | null;
}

export function validateCommercialPaymentProof(
proof: UploadableCommercialPaymentProof,
): void {
if (!proof.uri?.trim()) {
throw new Error(
'No fue posible leer el comprobante seleccionado.',
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
