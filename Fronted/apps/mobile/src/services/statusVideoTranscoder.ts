import {
  NativeModules,
} from 'react-native';

type NativeStatusVideoTranscoderResult = {
  uri?: string | null;
  sizeBytes?: number | null;
};

type NativeStatusVideoTranscoder = {
  transcodeToMp4: (
    sourceUri: string,
  ) => Promise<NativeStatusVideoTranscoderResult>;
  removeTemporaryVideo: (
    uri: string,
  ) => Promise<boolean>;
};

const nativeStatusVideoTranscoder = (
  NativeModules.StatusVideoTranscoder as NativeStatusVideoTranscoder
  | undefined
);

export type TranscodedStatusVideo = {
  uri: string;
  sizeBytes: number | null;
};

export async function transcodeStatusVideoToMp4(
  sourceUri: string,
): Promise<TranscodedStatusVideo> {
  const normalizedSourceUri = sourceUri.trim();

  if (!normalizedSourceUri) {
    throw new Error(
      'No fue posible encontrar el video seleccionado.',
    );
  }

  if (!nativeStatusVideoTranscoder) {
    throw new Error(
      'El conversor de video no está disponible. Actualiza la aplicación e inténtalo nuevamente.',
    );
  }

  const result = await nativeStatusVideoTranscoder.transcodeToMp4(
    normalizedSourceUri,
  );
  const uri = String(result?.uri || '').trim();

  if (!uri) {
    throw new Error(
      'La conversión del video no produjo un archivo compatible.',
    );
  }

  return {
    uri,
    sizeBytes: (
      typeof result?.sizeBytes === 'number'
      && Number.isFinite(result.sizeBytes)
        ? result.sizeBytes
        : null
    ),
  };
}

export async function removeTemporaryStatusVideo(
  uri: string | null | undefined,
): Promise<void> {
  const normalizedUri = String(uri || '').trim();

  if (
    !normalizedUri
    || !nativeStatusVideoTranscoder
  ) {
    return;
  }

  try {
    await nativeStatusVideoTranscoder.removeTemporaryVideo(
      normalizedUri,
    );
  } catch {
    // La limpieza temporal nunca debe bloquear la publicación.
  }
}
