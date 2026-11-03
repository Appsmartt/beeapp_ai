import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRequestCacheUserId } from '@beeapp/api-client';

const SNAPSHOT_PREFIX = 'beeapp.module-snapshot.v1.';

interface SnapshotEnvelope<T> {
  version: number;
  userId: string;
  data: T;
}

export function createModuleSnapshot<T>(name: string) {
  const version = 1;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: string | null = null;
  let chain: Promise<void> = Promise.resolve();

  function storageKey(userId: string): string {
    return `${SNAPSHOT_PREFIX}${name}.${encodeURIComponent(userId)}`;
  }

  return {
    schedule(data: T): void {
      const userId = getRequestCacheUserId();

      if (!userId) {
        return;
      }

      pending = JSON.stringify({
        version,
        userId,
        data,
      } satisfies SnapshotEnvelope<T>);

      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        timer = null;
        const value = pending;
        const key = storageKey(userId);
        pending = null;

        if (!value) {
          return;
        }

        chain = chain.catch(() => {}).then(async () => {
          await AsyncStorage.setItem(key, value);
        }).catch(() => {
          // La lista en memoria sigue disponible si el disco falla.
        });
      }, 200);
    },

    async read(): Promise<T | null> {
      const userId = getRequestCacheUserId();

      if (!userId) {
        return null;
      }

      try {
        await chain;
        const raw = await AsyncStorage.getItem(storageKey(userId));

        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw) as SnapshotEnvelope<T>;

        if (
          parsed?.version !== version
          || parsed.userId !== userId
        ) {
          return null;
        }

        return parsed.data;
      } catch {
        return null;
      }
    },

    async clear(): Promise<void> {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      pending = null;
      await chain.catch(() => {});
      const keys = await AsyncStorage.getAllKeys();
      const matching = keys.filter((key) => (
        key.startsWith(`${SNAPSHOT_PREFIX}${name}.`)
      ));

      if (matching.length > 0) {
        await AsyncStorage.multiRemove(matching);
      }
    },
  };
}
