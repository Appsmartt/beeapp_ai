import type * as ImagePicker from 'expo-image-picker';

import type {
  SelectedStatusMedia,
} from '../CreateStatusModal';

export type LocalStatusMediaAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  traceId?: string | null;
  source?: 'camera' | 'gallery' | 'unknown';
};

export function inferStatusMediaKind(
  mimeType: string,
  fileName: string,
): SelectedStatusMedia['kind'] {
  const normalizedMimeType = mimeType.toLowerCase();
  const normalizedFileName = fileName.toLowerCase();

  if (
    normalizedMimeType === 'image/gif'
    || normalizedFileName.endsWith('.gif')
  ) {
    return 'gif';
  }

  if (normalizedMimeType.startsWith('video/')) {
    return 'video';
  }

  return 'image';
}

function getStatusVideoDiagnosticMetadata(
  asset: LocalStatusMediaAsset | ImagePicker.ImagePickerAsset,
): {
  traceId: string | null;
  source: 'camera' | 'gallery' | 'unknown';
} {
  if (!('traceId' in asset) && !('source' in asset)) {
    return {
      traceId: null,
      source: 'unknown',
    };
  }

  const diagnosticAsset = asset as LocalStatusMediaAsset;

  return {
    traceId: diagnosticAsset.traceId ?? null,
    source: diagnosticAsset.source ?? 'unknown',
  };
}

export function toSelectedStatusMedia(
  asset: LocalStatusMediaAsset | ImagePicker.ImagePickerAsset,
): SelectedStatusMedia {
  const diagnosticMetadata = getStatusVideoDiagnosticMetadata(asset);
  const provisionalName = asset.fileName?.trim() || 'estado';
  const provisionalMimeType = asset.mimeType?.trim() || '';
  const kind = inferStatusMediaKind(
    provisionalMimeType,
    provisionalName,
  );
  const name = asset.fileName?.trim() || (
    kind === 'video'
      ? 'estado-video.mp4'
      : kind === 'gif'
        ? 'estado.gif'
        : 'estado.jpg'
  );
  const mimeType = asset.mimeType?.trim().toLowerCase() || (
    kind === 'video'
      ? 'video/mp4'
      : kind === 'gif'
        ? 'image/gif'
        : 'image/jpeg'
  );
  const durationSeconds = (
    kind === 'video'
    && typeof asset.duration === 'number'
    && asset.duration > 0
  )
    ? asset.duration / 1000
    : null;

  if (kind === 'video' && durationSeconds === null) {
    throw new Error(
      'No fue posible obtener la duración del video seleccionado.',
    );
  }

  return {
    uri: asset.uri,
    name,
    mimeType,
    sizeBytes: asset.fileSize ?? null,
    kind,
    durationSeconds,
    traceId: diagnosticMetadata.traceId,
    source: diagnosticMetadata.source,
  };
}
