import {
  getStorageFileAccess,
  removeProfileAvatar,
  updateProfileAvatar,
  uploadStorageFile,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  CurrentUserProfile,
} from '@beeapp/shared-types';


export const MAX_PROFILE_AVATAR_SIZE_BYTES =
  5 * 1024 * 1024;

const PROFILE_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface LocalProfileAvatar {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number | null;
}

export interface ProfileAvatarResult {
  profile: CurrentUserProfile;
  avatarUrl: string;
  expiresInSeconds: number;
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

function normalizeAvatarMimeType(
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

function validateLocalProfileAvatar(
  avatar: LocalProfileAvatar,
): void {
  const mimeType = normalizeAvatarMimeType(
    avatar.mimeType,
    avatar.name,
  );

  if (!PROFILE_AVATAR_MIME_TYPES.has(mimeType)) {
    throw new Error(
      'Selecciona una imagen JPG, PNG o WebP.',
    );
  }

  if (
    avatar.sizeBytes !== null
    && avatar.sizeBytes !== undefined
    && avatar.sizeBytes > MAX_PROFILE_AVATAR_SIZE_BYTES
  ) {
    throw new Error(
      'La foto de perfil debe pesar máximo 5 MB.',
    );
  }
}

function createAvatarFormData(
  avatar: LocalProfileAvatar,
): FormData {
  const mimeType = normalizeAvatarMimeType(
    avatar.mimeType,
    avatar.name,
  );

  const formData = new FormData();

  formData.append(
    'file',
    {
      uri: avatar.uri,
      name: avatar.name,
      type: mimeType,
    } as unknown as Blob,
  );

  return formData;
}

export async function getProfileAvatarUrl(
  credentials: AuthCredentials,
  avatarFileId: string,
): Promise<{
  url: string;
  expiresInSeconds: number;
}> {
  const access = await getStorageFileAccess(
    credentials,
    avatarFileId,
  );

  return {
    url: access.url,
    expiresInSeconds: access.expires_in_seconds,
  };
}

export async function uploadAndAssignProfileAvatar(
  credentials: AuthCredentials,
  avatar: LocalProfileAvatar,
): Promise<ProfileAvatarResult> {
  validateLocalProfileAvatar(avatar);

  const uploadResult = await uploadStorageFile(
    credentials,
    createAvatarFormData(avatar),
  );

  const uploadedFile = uploadResult.files[0];

  if (!uploadedFile) {
    const failedFile = uploadResult.failed_files[0];

    throw new Error(
      failedFile?.detail
      || 'No fue posible subir la foto de perfil.',
    );
  }

  const avatarResponse = await updateProfileAvatar(
    credentials,
    {
      avatar_file_id: uploadedFile.id,
    },
  );

  const access = await getProfileAvatarUrl(
    credentials,
    uploadedFile.id,
  );

  return {
    profile: avatarResponse.profile,
    avatarUrl: access.url,
    expiresInSeconds: access.expiresInSeconds,
  };
}

export async function removeCurrentProfileAvatar(
  credentials: AuthCredentials,
): Promise<CurrentUserProfile> {
  const response = await removeProfileAvatar(credentials);

  return response.profile;
}
