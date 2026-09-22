export type StatusVideoDiagnosticStage =
  | 'camera_capture_started'
  | 'camera_capture_completed'
  | 'gallery_selection_started'
  | 'gallery_selection_completed'
  | 'preparation_started'
  | 'source_metadata_loaded'
  | 'compression_started'
  | 'compression_completed'
  | 'compressed_metadata_loaded'
  | 'preparation_completed'
  | 'upload_started'
  | 'upload_completed'
  | 'failed';

export type StatusVideoDiagnosticContext = {
  traceId: string;
  stage: StatusVideoDiagnosticStage;
  source?: 'camera' | 'gallery' | 'unknown';
  name?: string | null;
  mimeType?: string | null;
  extension?: string | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  error?: unknown;
};

function sanitizeFileName(name: string | null | undefined): string | null {
  const normalizedName = String(name || '').trim();

  if (!normalizedName) {
    return null;
  }

  return normalizedName.slice(0, 160);
}

function normalizeNumber(value: unknown): number | null {
  return (
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : null
  );
}

function serializeError(error: unknown): Record<string, string | null> | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || null,
      stack: error.stack ? error.stack.slice(0, 1200) : null,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error).slice(0, 1200),
    stack: null,
  };
}

export function createStatusVideoTraceId(): string {
  return `status-video-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function logStatusVideoDiagnostic(
  context: StatusVideoDiagnosticContext,
): void {
  console.info('[status-video]', {
    traceId: context.traceId,
    stage: context.stage,
    source: context.source || 'unknown',
    name: sanitizeFileName(context.name),
    mimeType: String(context.mimeType || '').trim().toLowerCase() || null,
    extension: String(context.extension || '').trim().toLowerCase() || null,
    sizeBytes: normalizeNumber(context.sizeBytes),
    durationSeconds: normalizeNumber(context.durationSeconds),
    width: normalizeNumber(context.width),
    height: normalizeNumber(context.height),
    error: serializeError(context.error),
  });
}
