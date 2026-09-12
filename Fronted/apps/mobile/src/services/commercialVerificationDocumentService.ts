import {
  uploadStorageFiles,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  StorageFile,
} from '@beeapp/shared-types';

export const MAX_COMMERCIAL_VERIFICATION_PDF_SIZE_BYTES =
  10 * 1024 * 1024;

export interface UploadableCommercialVerificationPdf {
  uri: string;
  name: string | null;
  mimeType: string | null;
  size: number | null;
}

export function validateCommercialVerificationPdf(
  file: UploadableCommercialVerificationPdf,
): void {
  const normalizedName = String(file.name || "").trim();
  const normalizedMimeType = String(
    file.mimeType || "",
  ).trim().toLowerCase();
  const normalizedUri = String(file.uri || "").trim();

  if (!normalizedUri) {
    throw new Error("No fue posible leer el PDF seleccionado.");
  }

  if (
    normalizedMimeType !== "application/pdf"
    && !normalizedName.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error(
      "El documento de verificación debe ser un archivo PDF.",
    );
  }

  if (
    typeof file.size === "number"
    && file.size > MAX_COMMERCIAL_VERIFICATION_PDF_SIZE_BYTES
  ) {
    throw new Error(
      "El PDF no puede superar 10 MB.",
    );
  }
}

export async function uploadCommercialVerificationPdf(
  auth: AuthCredentials,
  file: UploadableCommercialVerificationPdf,
): Promise<StorageFile> {
  validateCommercialVerificationPdf(file);

  const formData = new FormData();

  formData.append(
    "files",
    {
      uri: file.uri,
      name: String(file.name || "soporte-verificacion.pdf")
        .trim()
        || "soporte-verificacion.pdf",
      type: "application/pdf",
    } as unknown as Blob,
  );

  const response = await uploadStorageFiles(auth, formData);
  const uploadedFile = response.files[0];

  if (uploadedFile?.id) {
    return uploadedFile;
  }

  throw new Error(
    response.failed_files[0]?.detail
    || "No fue posible subir el PDF de verificación.",
  );
}
