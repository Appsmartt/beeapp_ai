import {
uploadStorageFiles,
} from '@beeapp/api-client';
import type {
AuthCredentials,
StorageFile,
} from '@beeapp/shared-types';

import {
validateCommercialPaymentProof,
type UploadableCommercialPaymentProof,
} from './commercialPaymentProofValidation';

export {
MAX_COMMERCIAL_PAYMENT_PROOF_SIZE_BYTES,
validateCommercialPaymentProof,
type UploadableCommercialPaymentProof,
} from './commercialPaymentProofValidation';

export async function uploadCommercialPaymentProof(
auth: AuthCredentials,
proof: UploadableCommercialPaymentProof,
): Promise<StorageFile> {
validateCommercialPaymentProof(proof);

const formData = new FormData();

formData.append(
'files',
{
uri: proof.uri,
name: proof.name?.trim() || 'comprobante',
type: (
proof.mimeType?.trim()
|| 'application/octet-stream'
),
} as unknown as Blob,
);

const response = await uploadStorageFiles(auth, formData);
const uploadedFile = response.files[0];

if (uploadedFile?.id) {
return uploadedFile;
}

throw new Error(
response.failed_files[0]?.detail
|| 'No fue posible subir el comprobante.',
);
}
