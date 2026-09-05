import {
  uploadStorageFile,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  CommercialOfferImage,
  StorageFile,
} from '@beeapp/shared-types';

export const MAX_COMMERCIAL_OFFER_IMAGE_SIZE_BYTES =
5 * 1024 * 1024;

const COMMERCIAL_OFFER_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface LocalCommercialOfferImage {
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

function normalizeImageMimeType(
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

export function validateLocalCommercialOfferImage(
  image: LocalCommercialOfferImage,
): void {
  const mimeType = normalizeImageMimeType(
    image.mimeType,
    image.name,
  );

  if (!COMMERCIAL_OFFER_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(
      'Selecciona una imagen JPG, PNG o WebP.',
    );
  }

  if (
    image.sizeBytes !== null
    && image.sizeBytes !== undefined
    && image.sizeBytes > MAX_COMMERCIAL_OFFER_IMAGE_SIZE_BYTES
  ) {
    throw new Error(
      'Cada imagen debe pesar máximo 5 MB.',
    );
  }
}

function createImageFormData(
  image: LocalCommercialOfferImage,
): FormData {
  const mimeType = normalizeImageMimeType(
    image.mimeType,
    image.name,
  );

  const formData = new FormData();

  formData.append(
    'file',
    {
      uri: image.uri,
      name: image.name,
      type: mimeType,
    } as unknown as Blob,
  );

  return formData;
}

export async function uploadCommercialOfferImageFile(
  credentials: AuthCredentials,
  image: LocalCommercialOfferImage,
): Promise<StorageFile> {
  validateLocalCommercialOfferImage(image);

  const response = await uploadStorageFile(
    credentials,
    createImageFormData(image),
  );

  const uploadedFile = response.files[0];

  if (uploadedFile) {
    return uploadedFile;
  }

  const failureDetail = response.failed_files[0]?.detail;

  throw new Error(
    failureDetail
    || 'No fue posible subir la imagen de la oferta.',
  );
}

export function sortCommercialOfferImages(
  images: CommercialOfferImage[],
): CommercialOfferImage[] {
  return [...images].sort((left, right) => (
    (left.sort_order ?? 0) - (right.sort_order ?? 0)
  ));
}
