import {
  useEffect,
  useState,
} from 'react';
import { getStorageFileAccess } from '@beeapp/api-client';

import {
  getValidSessionCredentials,
} from '../services/authSession';
import {
  hasCachedImage,
  hydrateImageDiskCache,
  imageCacheUri,
  remoteImageCacheKey,
} from '../services/imageDiskCache';

export function useStorageFileAccessUrl(
  fileId: string | undefined,
  enabled = true,
) {
  const stableKey = remoteImageCacheKey({
    fileId,
  });

  const [url, setUrl] = useState<string | null>(() => {
    if (stableKey && hasCachedImage(stableKey)) {
      return imageCacheUri(stableKey);
    }

    return null;
  });

  const [loading, setLoading] = useState(() => {
    if (stableKey && hasCachedImage(stableKey)) {
      return false;
    }

    return Boolean(enabled && fileId);
  });

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !fileId) {
      setUrl(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;

    setFailed(false);

    void (async () => {
      await hydrateImageDiskCache();

      if (cancelled) {
        return;
      }

      if (stableKey && hasCachedImage(stableKey)) {
        setUrl(imageCacheUri(stableKey));
        setLoading(false);
        return;
      }

      if (!cancelled) {
        setLoading(true);
      }

      try {
        const auth = await getValidSessionCredentials();

        if (!auth) {
          throw new Error('Sin sesión');
        }

        const access = await getStorageFileAccess(
          auth,
          fileId,
          false,
        );

        if (!cancelled) {
          setUrl(access.url || null);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, fileId, stableKey]);

  return {
    url,
    loading,
    failed,
    cacheKey: fileId,
  };
}
