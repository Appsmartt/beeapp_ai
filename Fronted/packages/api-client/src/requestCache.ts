export const LIST_CACHE_TTL = {
  fresh: 30_000,
  standard: 60_000,
  stable: 5 * 60_000,
} as const;

const CACHE_VERSION = 1;
const STORAGE_PREFIX = 'beeapp.request-cache.v1.';
const MAX_ENTRIES = 60;
const MAX_ENTRY_CHARS = 250_000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

const BLOCKED_PREFIXES = [
  '/accounts/',
  '/integrations/',
  '/chat/',
  '/calls/',
];

export interface RequestCacheStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  getAllKeys: () => Promise<readonly string[]>;
  multiRemove: (keys: readonly string[]) => Promise<void>;
  multiSet?: (
    entries: readonly (readonly [string, string])[],
  ) => Promise<void>;
}

export interface RequestCacheHint {
  ttlMs: number;
  key?: string;
}

interface CacheEnvelope {
  version: number;
  userId: string;
  endpoint: string;
  savedAt: number;
  revision: number;
  data: unknown;
}

let revisionClock = 0;

function nextRevision(): number {
  revisionClock += 1;
  return revisionClock;
}

interface ReadRequestCacheOptions {
  ttlMs: number;
  allowStale?: boolean;
}

let storage: RequestCacheStorage | null = null;
let readUserId: () => string | null = () => null;
let generation = 0;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistChain: Promise<void> = Promise.resolve();

const memory = new Map<string, CacheEnvelope>();
const inflight = new Map<string, Promise<unknown>>();
const pendingWrites = new Map<string, string>();
const pendingRemovals = new Set<string>();
const prefixInvalidatedAt = new Map<string, number>();

export function configureRequestCache(options: {
  storage: RequestCacheStorage;
  getUserId: () => string | null;
}): void {
  storage = options.storage;
  readUserId = options.getUserId;
}

export function getRequestCacheUserId(): string | null {
  const userId = String(readUserId() || '').trim();

  return userId || null;
}

function memoryKey(userId: string, endpoint: string): string {
  return `${userId}\n${endpoint}`;
}

function storageKey(userId: string, endpoint: string): string {
  return (
    `${STORAGE_PREFIX}${encodeURIComponent(userId)}.`
    + encodeURIComponent(endpoint)
  );
}

export function isCacheableRequest(endpoint: string): boolean {
  const path = endpoint.split('?')[0];
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (normalized.toLowerCase().includes('pin')) {
    return false;
  }

  return !BLOCKED_PREFIXES.some((prefix) => (
    normalized.startsWith(prefix)
  ));
}

export function requestCacheModulePrefix(
  endpoint: string,
): string | null {
  const path = endpoint.split('?')[0];
  const segment = path.split('/').filter(Boolean)[0];

  return segment ? `/${segment}/` : null;
}

function latestInvalidation(
  userId: string,
  endpoint: string,
): number {
  let latest = 0;

  for (const [key, invalidatedAt] of prefixInvalidatedAt) {
    const separator = key.indexOf('\n');

    if (separator < 0 || key.slice(0, separator) !== userId) {
      continue;
    }

    const prefix = key.slice(separator + 1);

    if (endpoint.startsWith(prefix)) {
      latest = Math.max(latest, invalidatedAt);
    }
  }

  return latest;
}

function isCurrentRecord(record: CacheEnvelope): boolean {
  const invalidated = latestInvalidation(
    record.userId,
    record.endpoint,
  );

  if (invalidated === 0) {
    return true;
  }

  return record.savedAt > invalidated;
}

function isFreshEnough(
  savedAt: number,
  ttlMs: number,
  allowStale: boolean,
): boolean {
  const age = Date.now() - savedAt;

  if (age < 0) {
    return false;
  }

  if (age <= ttlMs) {
    return true;
  }

  return allowStale && age <= MAX_STALE_MS;
}

function remember(record: CacheEnvelope): void {
  memory.set(
    memoryKey(record.userId, record.endpoint),
    record,
  );
  trimMemory(record.userId);
}

function trimMemory(userId: string): void {
  const entries = [...memory.entries()].filter(([, value]) => (
    value.userId === userId
  ));

  if (entries.length <= MAX_ENTRIES) {
    return;
  }

  entries.sort((left, right) => left[1].savedAt - right[1].savedAt);
  const overflow = entries.length - MAX_ENTRIES;

  for (let index = 0; index < overflow; index += 1) {
    const [key, value] = entries[index];
    memory.delete(key);
    const persistedKey = storageKey(value.userId, value.endpoint);
    pendingWrites.delete(persistedKey);
    pendingRemovals.add(persistedKey);
  }
}

export function readRequestCacheSync<T>(
  endpoint: string,
  options: ReadRequestCacheOptions,
): T | null {
  const userId = getRequestCacheUserId();

  if (!userId || !endpoint) {
    return null;
  }

  const record = memory.get(memoryKey(userId, endpoint));

  if (
    !record
    || record.version !== CACHE_VERSION
    || record.userId !== userId
    || record.endpoint !== endpoint
    || !isCurrentRecord(record)
    || !isFreshEnough(
      record.savedAt,
      options.ttlMs,
      options.allowStale === true,
    )
  ) {
    return null;
  }

  return record.data as T;
}

export async function readRequestCache<T>(
  endpoint: string,
  options: ReadRequestCacheOptions,
): Promise<T | null> {
  const cached = readRequestCacheSync<T>(endpoint, options);

  if (cached !== null) {
    return cached;
  }

  const userId = getRequestCacheUserId();

  if (!userId || !endpoint || !storage) {
    return null;
  }

  try {
    await persistChain;
    const raw = await storage.getItem(storageKey(userId, endpoint));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope;

    if (
      parsed?.version !== CACHE_VERSION
      || parsed.userId !== userId
      || parsed.endpoint !== endpoint
      || parsed.data === undefined
      || !isCurrentRecord(parsed)
      || !isFreshEnough(
        parsed.savedAt,
        options.ttlMs,
        options.allowStale === true,
      )
    ) {
      return null;
    }

    remember(parsed);

    return parsed.data as T;
  } catch {
    return null;
  }
}

export function writeRequestCache(
  endpoint: string,
  data: unknown,
): void {
  const userId = getRequestCacheUserId();

  if (
    !userId
    || !endpoint
    || data === undefined
    || !isCacheableRequest(endpoint)
  ) {
    return;
  }

  let serialized = '';

  try {
    serialized = JSON.stringify(data);
  } catch {
    return;
  }

  if (!serialized || serialized.length > MAX_ENTRY_CHARS) {
    return;
  }

  const record: CacheEnvelope = {
    version: CACHE_VERSION,
    userId,
    endpoint,
    savedAt: Date.now(),
    revision: nextRevision(),
    data,
  };

  remember(record);
  const key = storageKey(userId, endpoint);
  pendingRemovals.delete(key);
  pendingWrites.set(key, JSON.stringify(record));
  schedulePersist();
}

function schedulePersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistTimer = null;
    const writeGeneration = generation;
    const writes = [...pendingWrites.entries()];
    const removals = [...pendingRemovals];
    pendingWrites.clear();
    pendingRemovals.clear();

    persistChain = persistChain.catch(() => {}).then(async () => {
      if (
        writeGeneration !== generation
        || !storage
      ) {
        return;
      }

      if (removals.length > 0) {
        await storage.multiRemove(removals);
      }

      if (writes.length === 0) {
        return;
      }

      if (storage.multiSet) {
        await storage.multiSet(writes);
        return;
      }

      await Promise.all(writes.map(([key, value]) => (
        storage?.setItem(key, value)
      )));
    }).catch(() => {
      // El caché no debe interrumpir la lista.
    });
  }, 200);
}

export function invalidateRequestCachePrefix(
  prefix: string,
): void {
  const userId = getRequestCacheUserId();

  if (!userId || !prefix) {
    return;
  }

  prefixInvalidatedAt.set(`${userId}\n${prefix}`, Date.now());

  for (const [key, value] of memory) {
    if (
      value.userId === userId
      && value.endpoint.startsWith(prefix)
    ) {
      memory.delete(key);
      const persistedKey = storageKey(value.userId, value.endpoint);
      pendingWrites.delete(persistedKey);
      pendingRemovals.add(persistedKey);
    }
  }

  schedulePersist();

  if (!storage) {
    return;
  }

  const currentGeneration = generation;
  persistChain = persistChain.catch(() => {}).then(async () => {
    if (currentGeneration !== generation || !storage) {
      return;
    }

    const keys = await storage.getAllKeys();
    const userPrefix = (
      `${STORAGE_PREFIX}${encodeURIComponent(userId)}.`
    );
    const matching = keys.filter((key) => {
      if (!key.startsWith(userPrefix)) {
        return false;
      }

      const encodedEndpoint = key.slice(userPrefix.length);
      let endpoint = encodedEndpoint;

      try {
        endpoint = decodeURIComponent(encodedEndpoint);
      } catch {
        endpoint = encodedEndpoint;
      }

      return endpoint.startsWith(prefix);
    });

    if (matching.length > 0) {
      await storage.multiRemove(matching);
    }
  }).catch(() => {
    // Una invalidación fallida se corrige en el próximo refresh.
  });
}

export async function clearRequestCache(): Promise<void> {
  generation += 1;
  memory.clear();
  inflight.clear();
  pendingWrites.clear();
  pendingRemovals.clear();
  prefixInvalidatedAt.clear();

  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  await persistChain.catch(() => {});

  if (!storage) {
    return;
  }

  const keys = await storage.getAllKeys();
  const matching = keys.filter((key) => key.startsWith(STORAGE_PREFIX));

  if (matching.length > 0) {
    await storage.multiRemove(matching);
  }
}

export function shareInflightRequest<T>(
  endpoint: string,
  loader: () => Promise<T>,
): Promise<T> {
  const userId = getRequestCacheUserId() || 'anonymous';
  const key = `${userId}\n${endpoint}`;
  const existing = inflight.get(key);

  if (existing) {
    return existing as Promise<T>;
  }

  const promise = loader().finally(() => {
    if (inflight.get(key) === promise) {
      inflight.delete(key);
    }
  });

  inflight.set(key, promise);

  return promise;
}
