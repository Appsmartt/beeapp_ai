import {
  uploadStorageFile,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
} from '@beeapp/shared-types';

export const MAX_GROUP_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

const GROUP_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface LocalGroupPhoto {
  uri: string;
  name: string;
  mimeType: string | null | undefined;
  sizeBytes?: number | null;
}

function getFileExtension(name: string): string {
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

function normalizeGroupPhotoMimeType(
  mimeType: string | null | undefined,
  name: string,
): string {
  const normalizedMimeType = mimeType?.trim().toLowerCase();

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

function validateLocalGroupPhoto(
  photo: LocalGroupPhoto,
): string {
  const mimeType = normalizeGroupPhotoMimeType(
    photo.mimeType,
    photo.name,
  );

  if (!GROUP_PHOTO_MIME_TYPES.has(mimeType)) {
    throw new Error(
      'Selecciona una imagen JPG, PNG o WebP.',
    );
  }

  if (
    photo.sizeBytes !== null
    && photo.sizeBytes !== undefined
    && (
      !Number.isFinite(photo.sizeBytes)
      || photo.sizeBytes <= 0
      || photo.sizeBytes > MAX_GROUP_PHOTO_SIZE_BYTES
    )
  ) {
    throw new Error(
      'La foto del grupo debe pesar máximo 5 MB.',
    );
  }

  if (!photo.uri.trim()) {
    throw new Error(
      'No fue posible leer la imagen seleccionada.',
    );
  }

  return mimeType;
}

export async function uploadGroupPhoto(
  credentials: AuthCredentials,
  photo: LocalGroupPhoto,
): Promise<string> {
  const mimeType = validateLocalGroupPhoto(photo);
  const formData = new FormData();

  formData.append(
    'file',
    {
      uri: photo.uri.trim(),
      name: photo.name.trim() || 'foto-grupo.jpg',
      type: mimeType,
    } as unknown as Blob,
  );

  const uploadResult = await uploadStorageFile(
    credentials,
    formData,
  );

  const uploadedFile = uploadResult.files[0];

  if (!uploadedFile) {
    const failedFile = uploadResult.failed_files[0];

    throw new Error(
      failedFile?.detail
      || 'No fue posible subir la foto del grupo.',
    );
  }

  return uploadedFile.id;
}
