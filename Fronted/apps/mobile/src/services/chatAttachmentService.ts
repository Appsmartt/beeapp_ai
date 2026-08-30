import {
  uploadStorageFiles,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  StorageFile,
} from '@beeapp/shared-types';

const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 52_428_800;

export type ChatAttachmentKind =
  | 'image'
  | 'file';

export interface PendingChatAttachment {
  localId: string;
  fileId: string;
  kind: ChatAttachmentKind;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  localUri: string;
}

export interface UploadableChatAttachment {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  kind: ChatAttachmentKind;
}

function createLocalAttachmentId(): string {
  return [
    'chat-attachment',
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join('-');
}

function getFallbackName(
  kind: ChatAttachmentKind,
): string {
  return kind === 'image'
    ? 'imagen.jpg'
    : 'archivo';
}

function getFallbackMimeType(
  kind: ChatAttachmentKind,
): string {
  return kind === 'image'
    ? 'image/jpeg'
    : 'application/octet-stream';
}

function getChatAttachmentKind(
  file: StorageFile,
  fallback: ChatAttachmentKind,
): ChatAttachmentKind {
  if (
    file.kind === 'image'
    || file.mime_type?.startsWith('image/')
  ) {
    return 'image';
  }

  return fallback;
}

export function validateChatAttachment(
  attachment: UploadableChatAttachment,
): void {
  const sizeBytes = attachment.sizeBytes;

  if (
    sizeBytes !== null
    && sizeBytes !== undefined
    && sizeBytes > MAX_CHAT_ATTACHMENT_SIZE_BYTES
  ) {
    throw new Error(
      'Cada archivo adjunto debe pesar máximo 50 MB.',
    );
  }

  if (!attachment.uri?.trim()) {
    throw new Error(
      'No fue posible leer el archivo seleccionado.',
    );
  }
}

export async function uploadChatAttachment(
  auth: AuthCredentials,
  attachment: UploadableChatAttachment,
): Promise<PendingChatAttachment> {
  validateChatAttachment(attachment);

  const formData = new FormData();

  formData.append(
    'files',
    {
      uri: attachment.uri,
      name: attachment.name?.trim() || getFallbackName(
        attachment.kind,
      ),
      type: attachment.mimeType?.trim() || getFallbackMimeType(
        attachment.kind,
      ),
    } as unknown as Blob,
  );

  const response = await uploadStorageFiles(
    auth,
    formData,
  );

  const uploadedFile = response.files[0];

  if (!uploadedFile?.id) {
    const failureDetail = response.failed_files[0]?.detail;

    throw new Error(
      failureDetail
      || 'No fue posible subir el archivo adjunto.',
    );
  }

  return {
    localId: createLocalAttachmentId(),
    fileId: uploadedFile.id,
    kind: getChatAttachmentKind(
      uploadedFile,
      attachment.kind,
    ),
    name: (
      uploadedFile.display_name
      || uploadedFile.original_name
      || attachment.name?.trim()
      || getFallbackName(attachment.kind)
    ),
    mimeType: (
      uploadedFile.mime_type
      || attachment.mimeType?.trim()
      || getFallbackMimeType(attachment.kind)
    ),
    sizeBytes: (
      uploadedFile.size_bytes
      ?? attachment.sizeBytes
      ?? null
    ),
    localUri: attachment.uri,
  };
}
