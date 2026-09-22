import * as FileSystem from 'expo-file-system';
import {
  logStatusVideoDiagnostic,
} from './statusVideoDiagnostics';
import {
  getVideoMetaData,
  Image as ImageCompressor,
} from 'react-native-compressor';
import {
  transcodeStatusVideoToMp4,
} from './statusVideoTranscoder';

export type StatusMediaKind = 'image' | 'gif' | 'video';

export type StatusMediaPreparationInput = {
  uri: string;
  name: string;
  mimeType: string;
  kind: StatusMediaKind;
  durationSeconds: number | null;
  traceId?: string | null;
  source?: 'camera' | 'gallery' | 'unknown';
};

export type PreparedStatusMedia = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  kind: StatusMediaKind;
  durationSeconds: number | null;
};

export const MAX_STATUS_IMAGE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_STATUS_GIF_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_STATUS_VIDEO_SIZE_BYTES = 40 * 1024 * 1024;
export const MAX_STATUS_VIDEO_DURATION_SECONDS = 90;

const STATUS_IMAGE_COMPRESSION_QUALITY = 0.82;
const STATUS_IMAGE_MAX_WIDTH = 2160;
const STATUS_IMAGE_MAX_HEIGHT = 2160;

function normalizeFileName(
  name: string,
  kind: StatusMediaKind,
): string {
  const trimmedName = name.trim();

  if (trimmedName) {
    return trimmedName;
  }

  if (kind === 'video') {
    return 'estado-video.mp4';
  }

  if (kind === 'gif') {
    return 'estado.gif';
  }

  return 'estado-imagen.jpg';
}

function getCompressedImageName(name: string): string {
  const normalizedName = normalizeFileName(name, 'image');
  const lastDotIndex = normalizedName.lastIndexOf('.');
  const baseName = (
    lastDotIndex > 0
      ? normalizedName.slice(0, lastDotIndex)
      : normalizedName
  );

  return `${baseName}-comprimida.jpg`;
}

function getCompressedVideoName(name: string): string {
  const normalizedName = normalizeFileName(name, 'video');
  const lastDotIndex = normalizedName.lastIndexOf('.');
  const baseName = (
    lastDotIndex > 0
      ? normalizedName.slice(0, lastDotIndex)
      : normalizedName
  );

  return `${baseName}-comprimido.mp4`;
}

async function getFileSizeBytes(uri: string): Promise<number> {
  const fileInfo = await FileSystem.getInfoAsync(uri, {
    size: true,
  });

  if (!fileInfo.exists || typeof fileInfo.size !== 'number') {
    throw new Error(
      'No fue posible verificar el archivo preparado para el estado.',
    );
  }

  return fileInfo.size;
}

function normalizeDurationSeconds(
  durationSeconds: number,
): number {
  return Math.round(durationSeconds * 1000) / 1000;
}

function validateVideoDuration(
  durationSeconds: number | null,
): number {
  if (
    typeof durationSeconds !== 'number'
    || !Number.isFinite(durationSeconds)
    || durationSeconds <= 0
  ) {
    throw new Error(
      'No fue posible obtener la duración del video seleccionado.',
    );
  }

  const normalizedDurationSeconds = normalizeDurationSeconds(
    durationSeconds,
  );

  if (
    normalizedDurationSeconds > MAX_STATUS_VIDEO_DURATION_SECONDS
  ) {
    throw new Error(
      `Los videos de estado pueden durar máximo ${MAX_STATUS_VIDEO_DURATION_SECONDS} segundos.`,
    );
  }

  return normalizedDurationSeconds;
}

async function prepareImage(
  input: StatusMediaPreparationInput,
): Promise<PreparedStatusMedia> {
  const compressedUri = await ImageCompressor.compress(
    input.uri,
    {
      compressionMethod: 'manual',
      maxWidth: STATUS_IMAGE_MAX_WIDTH,
      maxHeight: STATUS_IMAGE_MAX_HEIGHT,
      quality: STATUS_IMAGE_COMPRESSION_QUALITY,
      output: 'jpg',
    },
  );
  const sizeBytes = await getFileSizeBytes(compressedUri);

  if (sizeBytes > MAX_STATUS_IMAGE_SIZE_BYTES) {
    throw new Error(
      'No fue posible reducir la imagen a un máximo de 30 MiB. Selecciona una imagen más liviana.',
    );
  }

  return {
    uri: compressedUri,
    name: getCompressedImageName(input.name),
    mimeType: 'image/jpeg',
    sizeBytes,
    kind: 'image',
    durationSeconds: null,
  };
}

async function prepareGif(
  input: StatusMediaPreparationInput,
): Promise<PreparedStatusMedia> {
  const sizeBytes = await getFileSizeBytes(input.uri);

  if (sizeBytes > MAX_STATUS_GIF_SIZE_BYTES) {
    throw new Error(
      'Los GIF de estado deben ocupar máximo 10 MiB.',
    );
  }

  return {
    uri: input.uri,
    name: normalizeFileName(input.name, 'gif'),
    mimeType: 'image/gif',
    sizeBytes,
    kind: 'gif',
    durationSeconds: null,
  };
}

async function prepareVideo(
  input: StatusMediaPreparationInput,
): Promise<PreparedStatusMedia> {
  const traceId = (
    input.traceId?.trim()
    || `status-video-${Date.now()}`
  );
  const source = input.source || 'unknown';

  try {
    logStatusVideoDiagnostic({
      traceId,
      stage: 'preparation_started',
      source,
      name: input.name,
      mimeType: input.mimeType,
      durationSeconds: input.durationSeconds,
    });

    const [
      sourceSizeBytes,
      sourceMetadata,
    ] = await Promise.all([
      getFileSizeBytes(input.uri),
      getVideoMetaData(input.uri),
    ]);

    logStatusVideoDiagnostic({
      traceId,
      stage: 'source_metadata_loaded',
      source,
      name: input.name,
      mimeType: input.mimeType,
      extension: sourceMetadata.extension,
      sizeBytes: sourceSizeBytes,
      durationSeconds: sourceMetadata.duration / 1000,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
    });

    const durationSeconds = validateVideoDuration(
      input.durationSeconds,
    );

    logStatusVideoDiagnostic({
      traceId,
      stage: 'compression_started',
      source,
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: sourceSizeBytes,
      durationSeconds,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
    });

    const transcodedVideo = await transcodeStatusVideoToMp4(
      input.uri,
    );
    const compressedUri = transcodedVideo.uri;
    const sizeBytes = (
      transcodedVideo.sizeBytes
      ?? await getFileSizeBytes(compressedUri)
    );
    const compressedName = getCompressedVideoName(input.name);

    if (sizeBytes <= 0) {
      throw new Error(
        'No fue posible verificar el archivo comprimido para el estado.',
      );
    }

    logStatusVideoDiagnostic({
      traceId,
      stage: 'compressed_metadata_loaded',
      source,
      name: compressedName,
      mimeType: 'video/mp4',
      extension: 'mp4',
      sizeBytes,
      durationSeconds,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
    });

    if (sizeBytes > MAX_STATUS_VIDEO_SIZE_BYTES) {
    throw new Error(
      'No fue posible reducir el video a un máximo de 40 MiB. Recorta el video o selecciona uno más liviano.',
    );
  }

    const preparedMedia = {
      uri: compressedUri,
      name: compressedName,
      mimeType: 'video/mp4',
      sizeBytes,
      kind: 'video' as const,
      durationSeconds,
    };

    logStatusVideoDiagnostic({
      traceId,
      stage: 'preparation_completed',
      source,
      name: preparedMedia.name,
      mimeType: preparedMedia.mimeType,
      extension: 'mp4',
      sizeBytes: preparedMedia.sizeBytes,
      durationSeconds: preparedMedia.durationSeconds,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
    });

    return preparedMedia;
  } catch (error) {
    logStatusVideoDiagnostic({
      traceId,
      stage: 'failed',
      source,
      name: input.name,
      mimeType: input.mimeType,
      durationSeconds: input.durationSeconds,
      error,
    });
    throw error;
  }
}

export async function prepareStatusMediaForUpload(
  input: StatusMediaPreparationInput,
): Promise<PreparedStatusMedia> {
  if (input.kind === 'image') {
    return prepareImage(input);
  }

  if (input.kind === 'gif') {
    return prepareGif(input);
  }

  return prepareVideo(input);
}
