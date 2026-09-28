import * as VideoThumbnails from 'expo-video-thumbnails';

const MAX_CACHED_CHAT_VIDEO_THUMBNAILS = 32;
const MAX_CONCURRENT_CHAT_VIDEO_THUMBNAILS = 2;
const chatVideoThumbnailCache = new Map<string, string | null>();
const chatVideoThumbnailRequests = new Map<string, Promise<string | null>>();
const pendingChatVideoThumbnails: Array<() => void> = [];
let activeChatVideoThumbnails = 0;

function startPendingChatVideoThumbnails(): void {
  while (
    activeChatVideoThumbnails < MAX_CONCURRENT_CHAT_VIDEO_THUMBNAILS
    && pendingChatVideoThumbnails.length > 0
  ) {
    const start = pendingChatVideoThumbnails.shift();
    if (!start) {
      return;
    }
    activeChatVideoThumbnails += 1;
    start();
  }
}

function rememberChatVideoThumbnail(
  messageId: string,
  uri: string | null,
): void {
  chatVideoThumbnailCache.delete(messageId);
  chatVideoThumbnailCache.set(messageId, uri);
  if (chatVideoThumbnailCache.size > MAX_CACHED_CHAT_VIDEO_THUMBNAILS) {
    const oldestMessageId = chatVideoThumbnailCache.keys().next().value;
    if (oldestMessageId) {
      chatVideoThumbnailCache.delete(oldestMessageId);
    }
  }
}

export function getChatVideoThumbnail(
  messageId: string,
  videoUri: string | null | undefined,
): Promise<string | null> {
  const key = messageId.trim();
  const uri = String(videoUri || '').trim();
  if (!key || !/^https:\/\//i.test(uri)) {
    return Promise.resolve(null);
  }

  if (chatVideoThumbnailCache.has(key)) {
    return Promise.resolve(chatVideoThumbnailCache.get(key) || null);
  }

  const existing = chatVideoThumbnailRequests.get(key);
  if (existing) {
    return existing;
  }

  const request = new Promise<string | null>((resolve) => {
    pendingChatVideoThumbnails.push(() => {
      void VideoThumbnails.getThumbnailAsync(uri, {
        time: 1000,
        quality: 0.7,
      }).then(
        (result) => {
          const thumbnail = String(result.uri || '').trim() || null;
          rememberChatVideoThumbnail(key, thumbnail);
          resolve(thumbnail);
        },
        () => {
          resolve(null);
        },
      ).finally(() => {
        chatVideoThumbnailRequests.delete(key);
        activeChatVideoThumbnails -= 1;
        startPendingChatVideoThumbnails();
      });
    });
    startPendingChatVideoThumbnails();
  });

  chatVideoThumbnailRequests.set(key, request);
  return request;
}
