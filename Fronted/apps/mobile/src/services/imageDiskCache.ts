import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const INDEX_KEY = 'beeapp.image-cache-index.v1';
const IMAGE_CACHE_DIRECTORY = (
  `${FileSystem.cacheDirectory || ''}beeapp-images/`
);

const knownKeys = new Set<string>();
const inflight = new Map<string, Promise<string | null>>();
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function createStableHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function isLocalUri(uri: string): boolean {
  return (
    uri.startsWith('file:')
    || uri.startsWith('content:')
    || uri.startsWith('ph:')
    || uri.startsWith('assets-library:')
    || uri.startsWith('data:')
  );
}

export function remoteImageCacheKey(options: {
  fileId?: string | null;
  url?: string | null;
}): string | null {
  const fileId = options.fileId?.trim();
  if (fileId) {
    return `file:${fileId}`;
  }

  const url = options.url?.trim();
  if (!url || isLocalUri(url)) {
    return null;
  }

  const withoutQuery = url.split('?')[0]?.trim();
  return withoutQuery ? `url:${withoutQuery}` : null;
}

export function imageCacheUri(stableKey: string): string {
  return `${IMAGE_CACHE_DIRECTORY}${createStableHash(stableKey)}.img`;
}

export function hasCachedImage(stableKey: string): boolean {
  return knownKeys.has(stableKey);
}

function rememberKey(stableKey: string): void {
  if (knownKeys.has(stableKey)) {
    return;
  }

  knownKeys.add(stableKey);
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void AsyncStorage.setItem(
      INDEX_KEY,
      JSON.stringify([...knownKeys]),
    );
  }, 200);
}

function forgetKey(stableKey: string): void {
  if (!knownKeys.delete(stableKey)) {
    return;
  }

  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void AsyncStorage.setItem(
      INDEX_KEY,
      JSON.stringify([...knownKeys]),
    );
  }, 200);
}

export async function hydrateImageDiskCache(): Promise<void> {
  if (hydrated) {
    return;
  }

  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(INDEX_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          parsed.forEach((key) => {
            if (typeof key === 'string' && key.trim()) {
              knownKeys.add(key);
            }
          });
        }
      } catch {
        // Un índice dañado no debe impedir mostrar las imágenes remotas.
      } finally {
        hydrated = true;
      }
    })();
  }

  await hydratePromise;
}

export async function ensureCachedImage(
  stableKey: string,
  remoteUrl: string,
): Promise<string | null> {
  const key = stableKey.trim();
  const url = remoteUrl.trim();

  if (!key || !url || !FileSystem.cacheDirectory) {
    return null;
  }

  if (isLocalUri(url)) {
    return url;
  }

  if (knownKeys.has(key)) {
    const cachedUri = imageCacheUri(key);
    const info = await FileSystem.getInfoAsync(cachedUri);
    if (info.exists) {
      return cachedUri;
    }
    forgetKey(key);
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  const task = (async () => {
    const destination = imageCacheUri(key);
    const temporary = `${destination}.${Date.now()}.download`;

    try {
      await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIRECTORY, {
        intermediates: true,
      });

      const download = await FileSystem.downloadAsync(url, temporary);
      if (download.status < 200 || download.status >= 300) {
        return null;
      }

      const existing = await FileSystem.getInfoAsync(destination);
      if (existing.exists) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
      }

      await FileSystem.moveAsync({
        from: temporary,
        to: destination,
      });
      rememberKey(key);
      return destination;
    } catch {
      return null;
    } finally {
      await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

export async function invalidateCachedImage(
  stableKey: string,
): Promise<void> {
  const key = stableKey.trim();
  if (!key) {
    return;
  }

  forgetKey(key);
  inflight.delete(key);
  await FileSystem.deleteAsync(imageCacheUri(key), {
    idempotent: true,
  }).catch(() => {});
}

export async function clearImageDiskCache(): Promise<void> {
  knownKeys.clear();
  inflight.clear();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  await AsyncStorage.removeItem(INDEX_KEY);
  if (FileSystem.cacheDirectory) {
    await FileSystem.deleteAsync(IMAGE_CACHE_DIRECTORY, {
      idempotent: true,
    });
  }
}
