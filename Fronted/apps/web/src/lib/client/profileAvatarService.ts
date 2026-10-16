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

export const MAX_PROFILE_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const PROFILE_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface ProfileAvatarResult {
  profile: CurrentUserProfile;
  avatarUrl: string;
  expiresInSeconds: number;
}

function normalizeAvatarMimeType(
  mimeType: string,
  fileName: string,
): string {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  if (normalizedMimeType) {
    return normalizedMimeType;
  }

  const extension = fileName.trim().toLowerCase().split('.').pop() ?? '';

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

export function validateProfileAvatarFile(file: File): void {
  const mimeType = normalizeAvatarMimeType(file.type, file.name);

  if (!PROFILE_AVATAR_MIME_TYPES.has(mimeType)) {
    throw new Error('Selecciona una imagen JPG, PNG o WebP.');
  }

  if (file.size > MAX_PROFILE_AVATAR_SIZE_BYTES) {
    throw new Error('La foto de perfil debe pesar máximo 5 MB.');
  }
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

export async function resolveProfileAvatarUrl(
  profile: Pick<CurrentUserProfile, 'avatar_url' | 'avatar_file_id'>,
  credentials: AuthCredentials,
): Promise<string | null> {
  const directUrl = profile.avatar_url?.trim();

  if (directUrl) {
    return directUrl;
  }

  if (!profile.avatar_file_id) {
    return null;
  }

  try {
    const access = await getProfileAvatarUrl(
      credentials,
      profile.avatar_file_id,
    );

    return access.url;
  } catch {
    return null;
  }
}

export async function uploadAndAssignProfileAvatar(
  credentials: AuthCredentials,
  file: File,
): Promise<ProfileAvatarResult> {
  validateProfileAvatarFile(file);

  const formData = new FormData();
  formData.append('file', file, file.name);

  const uploadResult = await uploadStorageFile(
    credentials,
    formData,
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
