import * as FileSystem from 'expo-file-system';

import type {
  ChatConversation,
} from '@beeapp/shared-types';

const CHAT_AVATAR_CACHE_DIRECTORY = (
  `${FileSystem.cacheDirectory || ''}beeapp-chat-avatars/`
);

function createStableHash(
  value: string,
): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getAvatarCacheDirectory(
  userId: string,
): string {
  return (
    `${CHAT_AVATAR_CACHE_DIRECTORY}`
    + `${createStableHash(userId)}/`
  );
}

function getAvatarCacheUri(
  userId: string,
  conversationId: string,
  avatarUrl: string,
): string {
  const cacheKey = createStableHash(
    `${conversationId}:${avatarUrl}`,
  );

  return (
    `${getAvatarCacheDirectory(userId)}`
    + `${cacheKey}.avatar`
  );
}

async function ensureDirectoryExists(
  directory: string,
): Promise<void> {
  const directoryInfo = await FileSystem.getInfoAsync(
    directory,
  );

  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(
      directory,
      {
        intermediates: true,
      },
    );
  }
}

async function getCachedAvatarUri(
  userId: string,
  conversationId: string,
  avatarUrl: string,
): Promise<string | null> {
  const cacheUri = getAvatarCacheUri(
    userId,
    conversationId,
    avatarUrl,
  );

  const fileInfo = await FileSystem.getInfoAsync(cacheUri);

  return fileInfo.exists
    ? cacheUri
    : null;
}

async function cacheAvatar(
  userId: string,
  conversationId: string,
  avatarUrl: string,
): Promise<string> {
  const cachedUri = await getCachedAvatarUri(
    userId,
    conversationId,
    avatarUrl,
  );

  if (cachedUri) {
    return cachedUri;
  }

  const directory = getAvatarCacheDirectory(userId);

  await ensureDirectoryExists(directory);

  const cacheUri = getAvatarCacheUri(
    userId,
    conversationId,
    avatarUrl,
  );

  const downloadResult = await FileSystem.downloadAsync(
    avatarUrl,
    cacheUri,
  );

  if (downloadResult.status < 200 || downloadResult.status >= 300) {
    throw new Error(
      `No fue posible descargar el avatar: ${downloadResult.status}.`,
    );
  }

  return downloadResult.uri;
}

export async function removeSupersededChatAvatar(
  userId: string,
  previousUri: string | null | undefined,
  currentUri: string | null | undefined,
): Promise<void> {
  if (
    !FileSystem.cacheDirectory
    || !previousUri
    || previousUri === currentUri
    || !previousUri.startsWith(getAvatarCacheDirectory(userId))
  ) return;

  await FileSystem.deleteAsync(previousUri, { idempotent: true });
}

export async function clearChatAvatarCache(): Promise<void> {
  if (!FileSystem.cacheDirectory) return;
  await FileSystem.deleteAsync(CHAT_AVATAR_CACHE_DIRECTORY, {
    idempotent: true,
  });
}

export async function cacheChatConversationAvatars(
  userId: string,
  conversations: ChatConversation[],
): Promise<ChatConversation[]> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return conversations;
  }

  const cachedConversations: ChatConversation[] = [];

  for (let index = 0; index < conversations.length; index += 4) {
    const batch = await Promise.all(
      conversations.slice(index, index + 4).map(async (conversation) => {
        const avatarUrl = conversation.avatar_url?.trim();
        if (!avatarUrl) return conversation;

        try {
          const cachedAvatarUri = await cacheAvatar(
            normalizedUserId,
            conversation.id,
            avatarUrl,
          );
          return {
            ...conversation,
            avatar_url: avatarUrl,
            cached_avatar_url: cachedAvatarUri,
            direct_profile: conversation.direct_profile
              ? { ...conversation.direct_profile, avatar_url: avatarUrl }
              : conversation.direct_profile,
          };
        } catch {
          return conversation;
        }
      }),
    );
    cachedConversations.push(...batch);
  }

  return cachedConversations;
}
