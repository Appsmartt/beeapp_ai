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

export function createStatusVideoTraceId(): string {
  return `status-video-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function logStatusVideoDiagnostic(
  context: StatusVideoDiagnosticContext,
): void {
  void context;
}
