import * as FileSystem from 'expo-file-system';
import { Image as ImageCompressor } from 'react-native-compressor';
import {
  transcodeStatusVideoToMp4,
  removeTemporaryStatusVideo,
} from './statusVideoTranscoder';
import type { UploadableChatAttachment } from './chatAttachmentService';

export const MAX_CHAT_MEDIA_SIZE_BYTES = 50 * 1024 * 1024;

function compressedName(name: string | null | undefined, kind: 'image' | 'video'): string {
  const base = (name || (kind === 'image' ? 'imagen' : 'video'))
    .trim()
    .replace(/\.[^/.]+$/, '')
    .slice(0, 225) || (kind === 'image' ? 'imagen' : 'video');
  return `${base}-comprimido.${kind === 'image' ? 'jpg' : 'mp4'}`;
}

async function verifiedSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (!info.exists || typeof info.size !== 'number' || !Number.isFinite(info.size) || info.size <= 0) {
    throw new Error('No fue posible verificar el archivo preparado para Chat.');
  }
  if (info.size > MAX_CHAT_MEDIA_SIZE_BYTES) {
    throw new Error('No fue posible reducir la foto o el video a un máximo de 50 MiB. Selecciona un archivo más liviano.');
  }
  return info.size;
}

export async function prepareChatMediaForUpload(
  attachment: UploadableChatAttachment,
): Promise<UploadableChatAttachment> {
  if (attachment.kind === 'image') {
    const uri = await ImageCompressor.compress(attachment.uri, {
      compressionMethod: 'manual',
      maxWidth: 2160,
      maxHeight: 2160,
      quality: 0.82,
      output: 'jpg',
    });
    return {
      uri,
      name: compressedName(attachment.name, 'image'),
      mimeType: 'image/jpeg',
      sizeBytes: await verifiedSize(uri),
      kind: 'image',
    };
  }

  if (attachment.kind === 'video') {
    const converted = await transcodeStatusVideoToMp4(attachment.uri);
    try {
      return {
        uri: converted.uri,
        name: compressedName(attachment.name, 'video'),
        mimeType: 'video/mp4',
        sizeBytes: await verifiedSize(converted.uri),
        kind: 'video',
      };
    } catch (error) {
      await removeTemporaryStatusVideo(converted.uri);
      throw error;
    }
  }

  throw new Error('El preparador de Chat solo admite fotos y videos.');
}
