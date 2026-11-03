import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  readRequestCache,
} from '@beeapp/api-client';

interface UseCachedResourceOptions<T> {
  cacheKey: string;
  ttlMs: number;
  enabled?: boolean;
  load: () => Promise<T>;
}

interface UseCachedResourceResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  reload: () => Promise<void>;
}

export async function paintCachedValue<T>(
  cacheKey: string,
  ttlMs: number,
  apply: (value: T) => void,
): Promise<boolean> {
  const cached = await readRequestCache<T>(cacheKey, {
    ttlMs,
    allowStale: true,
  });

  if (cached === null) {
    return false;
  }

  apply(cached);

  return true;
}

export function useCachedResource<T>({
  cacheKey,
  ttlMs,
  enabled = true,
  load,
}: UseCachedResourceOptions<T>): UseCachedResourceResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const loadRef = useRef(load);
  const requestIdRef = useRef(0);
  const hasDataRef = useRef(false);

  loadRef.current = load;

  const reload = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const cached = await readRequestCache<T>(cacheKey, {
      ttlMs,
      allowStale: true,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (cached !== null) {
      hasDataRef.current = true;
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else if (!hasDataRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const fresh = await loadRef.current();

      if (requestId !== requestIdRef.current) {
        return;
      }

      hasDataRef.current = true;
      setData(fresh);
      setError(null);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(loadError);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [cacheKey, ttlMs]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void reload();
  }, [enabled, reload]);

  return {
    data,
    loading,
    refreshing,
    error,
    reload,
  };
}
