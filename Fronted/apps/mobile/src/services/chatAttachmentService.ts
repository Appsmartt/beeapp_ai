import {
  uploadChatAttachment,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  ChatMessage,
} from '@beeapp/shared-types';

const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 52_428_800;

export type ChatAttachmentKind =
  | 'image'
  | 'document'
  | 'audio';

export interface UploadableChatAttachment {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  kind: ChatAttachmentKind;
  durationSeconds?: number | null;
}

function getFallbackName(
  kind: ChatAttachmentKind,
): string {
  if (kind === 'image') {
    return 'imagen.jpg';
  }

  if (kind === 'audio') {
    return 'nota-de-voz.m4a';
  }

  return 'archivo';
}

function getFallbackMimeType(
  kind: ChatAttachmentKind,
): string {
  if (kind === 'image') {
    return 'image/jpeg';
  }

  if (kind === 'audio') {
    return 'audio/m4a';
  }

  return 'application/octet-stream';
}

export function validateChatAttachment(
  attachment: UploadableChatAttachment,
): void {
  const sizeBytes = attachment.sizeBytes;

  if (
    sizeBytes !== null
    && sizeBytes !== undefined
    && (
      !Number.isFinite(sizeBytes)
      || sizeBytes <= 0
      || sizeBytes > MAX_CHAT_ATTACHMENT_SIZE_BYTES
    )
  ) {
    throw new Error(
      'Cada archivo adjunto debe pesar entre 1 byte y 50 MB.',
    );
  }

  if (!String(attachment.uri || '').trim()) {
    throw new Error(
      'No fue posible leer el archivo seleccionado.',
    );
  }
}

export async function uploadChatAttachmentMessage(
  auth: AuthCredentials,
  conversationId: string,
  senderIdentityId: string,
  attachment: UploadableChatAttachment,
  options: {
    body?: string | null;
  } = {},
): Promise<ChatMessage> {
  validateChatAttachment(attachment);

  const normalizedConversationId = String(
    conversationId || '',
  ).trim();

  const normalizedSenderIdentityId = String(
    senderIdentityId || '',
  ).trim();

  if (!normalizedConversationId || !normalizedSenderIdentityId) {
    throw new Error(
      'No fue posible identificar el chat o la identidad remitente.',
    );
  }

  const message = await uploadChatAttachment(
    auth,
    normalizedConversationId,
    {
      sender_identity_id: normalizedSenderIdentityId,
      message_type: attachment.kind,
      body: options.body?.trim() || null,
      metadata: {
        ...(attachment.kind === 'audio'
          && typeof attachment.durationSeconds === 'number'
          && Number.isFinite(attachment.durationSeconds)
          ? {
              duration_seconds: Math.max(
                0,
                Math.round(attachment.durationSeconds),
              ),
            }
          : {}),
      },
      file: {
        uri: attachment.uri.trim(),
        name: attachment.name?.trim() || getFallbackName(
          attachment.kind,
        ),
        type: attachment.mimeType?.trim() || getFallbackMimeType(
          attachment.kind,
        ),
      },
    },
  );

  return message.message;
}
