import * as FileSystem from 'expo-file-system';
import {
  getVideoMetaData,
  Image as ImageCompressor,
  Video as VideoCompressor,
} from 'react-native-compressor';

export type StatusMediaKind = 'image' | 'gif' | 'video';

export type StatusMediaPreparationInput = {
  uri: string;
  name: string;
  mimeType: string;
  kind: StatusMediaKind;
  durationSeconds: number | null;
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
const STATUS_VIDEO_MAX_DIMENSION = 720;

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
  const durationSeconds = validateVideoDuration(
    input.durationSeconds,
  );
  const compressedUri = await VideoCompressor.compress(
    input.uri,
    {
      compressionMethod: 'manual',
      maxSize: STATUS_VIDEO_MAX_DIMENSION,
      minimumFileSizeForCompress: 0,
    },
  );
  const [
    sizeBytes,
    compressedMetadata,
  ] = await Promise.all([
    getFileSizeBytes(compressedUri),
    getVideoMetaData(compressedUri),
  ]);

  const normalizedExtension = (
    compressedMetadata.extension
    .trim()
    .toLowerCase()
    .replace(/^\./, '')
  );

  if (
    normalizedExtension !== 'mp4'
    || compressedMetadata.duration <= 0
    || compressedMetadata.width <= 0
    || compressedMetadata.height <= 0
  ) {
    throw new Error(
      'No fue posible preparar un video MP4 compatible para el estado.',
    );
  }

  if (sizeBytes > MAX_STATUS_VIDEO_SIZE_BYTES) {
    throw new Error(
      'No fue posible reducir el video a un máximo de 40 MiB. Recorta el video o selecciona uno más liviano.',
    );
  }

  return {
    uri: compressedUri,
    name: getCompressedVideoName(input.name),
    mimeType: 'video/mp4',
    sizeBytes,
    kind: 'video',
    durationSeconds: normalizeDurationSeconds(
      compressedMetadata.duration > 0
        ? compressedMetadata.duration / 1000
        : durationSeconds,
    ),
  };
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
