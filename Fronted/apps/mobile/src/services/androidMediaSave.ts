import {
  NativeModules,
  Platform,
} from 'react-native';

type ChatDownloadsNative = {
  saveToDownloads?: (
    sourceUri: string,
    fileName: string,
    mimeType: string,
  ) => Promise<string>;
  saveToGallery?: (
    sourceUri: string,
    fileName: string,
    mimeType: string,
  ) => Promise<string>;
};

function chatDownloadsModule():
  ChatDownloadsNative | undefined {
  return NativeModules.ChatDownloads as
    | ChatDownloadsNative
    | undefined;
}

export function canSaveWithAndroidMediaStore():
  boolean {
  return (
    Platform.OS === 'android'
    && Number(Platform.Version) >= 29
  );
}

export async function saveImageToAndroidGallery(
  localUri: string,
  fileName: string,
  mimeType: string,
): Promise<'gallery' | 'downloads'> {
  const saver = chatDownloadsModule();

  if (!canSaveWithAndroidMediaStore()) {
    throw new Error(
      'Guardar en galería requiere Android 10 o superior.',
    );
  }

  if (saver?.saveToGallery) {
    await saver.saveToGallery(
      localUri,
      fileName,
      mimeType,
    );
    return 'gallery';
  }

  if (saver?.saveToDownloads) {
    await saver.saveToDownloads(
      localUri,
      fileName,
      mimeType,
    );
    return 'downloads';
  }

  throw new Error(
    'Instala la versión actualizada de Buddy para guardar imágenes.',
  );
}

export async function saveFileToAndroidDownloads(
  localUri: string,
  fileName: string,
  mimeType: string,
): Promise<void> {
  const saver = chatDownloadsModule();

  if (!canSaveWithAndroidMediaStore()) {
    throw new Error(
      'Guardar archivos requiere Android 10 o superior.',
    );
  }

  if (!saver?.saveToDownloads) {
    throw new Error(
      'Instala la versión actualizada de Buddy para guardar archivos.',
    );
  }

  await saver.saveToDownloads(
    localUri,
    fileName,
    mimeType,
  );
}
