import {
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  getNoteAttachmentAccess,
} from '@beeapp/api-client';
import type {
  NoteAttachment,
} from '@beeapp/shared-types';

import {
  saveFileToAndroidDownloads,
  saveImageToAndroidGallery,
} from './androidMediaSave';
import {
  getValidSessionCredentials,
} from './authSession';
import {
  withExternalActivity,
} from './locationPermissionAppLockGuard';

export function isNoteAttachmentImage(
  attachment: NoteAttachment,
): boolean {
  return (
    attachment.attachment_type === 'image'
    || attachment.file.kind === 'image'
  );
}

function extensionForAttachment(
  attachment: NoteAttachment,
): string {
  const mime = String(
    attachment.file.mime_type || '',
  ).toLowerCase();

  if (mime === 'image/png') {
    return 'png';
  }

  if (mime === 'image/webp') {
    return 'webp';
  }

  if (mime === 'image/gif') {
    return 'gif';
  }

  if (
    mime === 'image/heic'
    || mime === 'image/heif'
  ) {
    return 'heic';
  }

  const fromName = attachment.file.display_name
    .match(/\.([a-z0-9]+)$/i)?.[1];

  if (fromName) {
    return fromName.toLowerCase();
  }

  return isNoteAttachmentImage(attachment)
    ? 'jpg'
    : 'bin';
}

function mimeTypeForAttachment(
  attachment: NoteAttachment,
): string {
  const fromFile = String(
    attachment.file.mime_type || '',
  ).trim();

  if (fromFile) {
    return fromFile;
  }

  if (!isNoteAttachmentImage(attachment)) {
    return 'application/octet-stream';
  }

  const extension = extensionForAttachment(attachment);

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  if (extension === 'gif') {
    return 'image/gif';
  }

  if (
    extension === 'heic'
    || extension === 'heif'
  ) {
    return 'image/heic';
  }

  return 'image/jpeg';
}

function fileNameForAttachment(
  attachment: NoteAttachment,
): string {
  const raw = String(
    attachment.file.display_name || 'imagen',
  )
    .replace(/[\/\\\x00-\x1f]/g, '_')
    .trim()
    .slice(0, 255);

  if (/\.[a-z0-9]+$/i.test(raw)) {
    return raw || 'imagen.jpg';
  }

  const extension = extensionForAttachment(attachment);

  return `${raw || 'imagen'}.${extension}`;
}

export type NoteAttachmentDownloadResult =
  | 'gallery'
  | 'downloads'
  | 'shared';

async function assertDownloadedFile(
  localUri: string,
): Promise<void> {
  const info = await FileSystem.getInfoAsync(localUri);

  if (
    !info.exists
    || !('size' in info)
    || !info.size
  ) {
    throw new Error(
      'El archivo descargado está vacío o no es válido.',
    );
  }
}

async function saveImageToGallery(
  localUri: string,
  attachment: NoteAttachment,
): Promise<NoteAttachmentDownloadResult> {
  const fileName = fileNameForAttachment(attachment);
  const mimeType = mimeTypeForAttachment(attachment);

  if (
    Platform.OS === 'android'
    && Number(Platform.Version) >= 29
  ) {
    return saveImageToAndroidGallery(
      localUri,
      fileName,
      mimeType,
    );
  }

  const permission = await withExternalActivity(
    () => MediaLibrary.requestPermissionsAsync(
      true,
      ['photo'],
    ),
  );

  if (!permission.granted) {
    throw new Error(
      'Permite guardar fotos en la configuración del dispositivo.',
    );
  }

  const asset = await MediaLibrary.createAssetAsync(
    localUri,
  );

  if (!asset?.id) {
    throw new Error(
      'No se pudo registrar la imagen en la galería.',
    );
  }

  return 'gallery';
}

export async function downloadNoteAttachment(
  noteId: string,
  attachment: NoteAttachment,
): Promise<NoteAttachmentDownloadResult> {
  const auth =
    await getValidSessionCredentials();

  if (!auth) {
    throw new Error(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
  }

  const response = await getNoteAttachmentAccess(
    auth,
    noteId,
    attachment.id,
    true,
  );

  const url = String(response.url || '').trim();

  if (
    !/^https?:\/\//i.test(url)
    || !FileSystem.cacheDirectory
  ) {
    throw new Error(
      'No fue posible obtener el archivo para descargarlo.',
    );
  }

  const extension = extensionForAttachment(attachment);
  const safeId = attachment.id.replace(
    /[^a-zA-Z0-9-]/g,
    '',
  );
  const temporaryUri = (
    `${FileSystem.cacheDirectory}`
    + `beeapp-note-${safeId}-${Date.now()}.${extension}`
  );

  const download = await FileSystem.downloadAsync(
    url,
    temporaryUri,
  );

  if (
    download.status < 200
    || download.status >= 300
  ) {
    throw new Error(
      'La descarga no se completó.',
    );
  }

  await assertDownloadedFile(download.uri);

  try {
    if (isNoteAttachmentImage(attachment)) {
      return await saveImageToGallery(
        download.uri,
        attachment,
      );
    }

    if (
      Platform.OS === 'android'
      && Number(Platform.Version) >= 29
    ) {
      await saveFileToAndroidDownloads(
        download.uri,
        fileNameForAttachment(attachment),
        mimeTypeForAttachment(attachment),
      );

      return 'downloads';
    }

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error(
        'No hay una app disponible para guardar este archivo.',
      );
    }

    await Sharing.shareAsync(download.uri, {
      mimeType: mimeTypeForAttachment(attachment),
      dialogTitle: attachment.file.display_name,
    });

    return 'shared';
  } finally {
    await FileSystem.deleteAsync(
      temporaryUri,
      { idempotent: true },
    ).catch(() => undefined);
  }
}
