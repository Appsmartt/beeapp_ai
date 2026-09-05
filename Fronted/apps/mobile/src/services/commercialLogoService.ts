import {
  uploadStorageFile,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  StorageFile,
} from '@beeapp/shared-types';

export const MAX_COMMERCIAL_LOGO_SIZE_BYTES =
5 * 1024 * 1024;

const COMMERCIAL_LOGO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface LocalCommercialLogo {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number | null;
}

function getFileExtension(
  name: string,
): string {
  const normalizedName = name.trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf('.');

  if (
    lastDotIndex < 0
    || lastDotIndex === normalizedName.length - 1
  ) {
    return '';
  }

  return normalizedName.slice(lastDotIndex + 1);
}

function normalizeLogoMimeType(
  mimeType: string | null | undefined,
  name: string,
): string {
  const normalizedMimeType = mimeType
    ?.trim()
    .toLowerCase();

  if (normalizedMimeType) {
    return normalizedMimeType;
  }

  const extension = getFileExtension(name);

  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg';
  }

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return '';
}

function validateLocalCommercialLogo(
  logo: LocalCommercialLogo,
): void {
  const mimeType = normalizeLogoMimeType(
    logo.mimeType,
    logo.name,
  );

  if (!COMMERCIAL_LOGO_MIME_TYPES.has(mimeType)) {
    throw new Error(
      'Selecciona un logo JPG, PNG o WebP.',
    );
  }

  if (
    logo.sizeBytes !== null
    && logo.sizeBytes !== undefined
    && logo.sizeBytes > MAX_COMMERCIAL_LOGO_SIZE_BYTES
  ) {
    throw new Error(
      'El logo debe pesar máximo 5 MB.',
    );
  }
}

function createLogoFormData(
  logo: LocalCommercialLogo,
): FormData {
  const mimeType = normalizeLogoMimeType(
    logo.mimeType,
    logo.name,
  );

  const formData = new FormData();

  formData.append(
    'file',
    {
      uri: logo.uri,
      name: logo.name,
      type: mimeType,
    } as unknown as Blob,
  );

  return formData;
}

export async function uploadCommercialLogo(
  credentials: AuthCredentials,
  logo: LocalCommercialLogo,
): Promise<StorageFile> {
  validateLocalCommercialLogo(logo);

  const uploadResult = await uploadStorageFile(
    credentials,
    createLogoFormData(logo),
  );

  const uploadedFile = uploadResult.files[0];

  if (uploadedFile) {
    return uploadedFile;
  }

  const failedFile = uploadResult.failed_files[0];

  throw new Error(
    failedFile?.detail
    || 'No fue posible subir el logo comercial.',
  );
}
