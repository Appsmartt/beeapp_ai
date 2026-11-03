import {
  useEffect,
  useState,
} from 'react';
import {
  Image,
  type ImageErrorEventData,
  type ImageProps,
  type NativeSyntheticEvent,
} from 'react-native';

import {
  ensureCachedImage,
  hasCachedImage,
  hydrateImageDiskCache,
  imageCacheUri,
  invalidateCachedImage,
  remoteImageCacheKey,
} from '../services/imageDiskCache';

type CachedImageProps = Omit<ImageProps, 'source'> & {
  uri?: string | null;
  cacheKey?: string | null;
};

export default function CachedImage({
  uri,
  cacheKey,
  onError,
  ...rest
}: CachedImageProps) {
  const stableKey = remoteImageCacheKey({
    fileId: cacheKey,
    url: uri,
  });
  const remoteUri = uri?.trim() || '';
  const [sourceUri, setSourceUri] = useState<string | null>(() => {
    if (stableKey && hasCachedImage(stableKey)) {
      return imageCacheUri(stableKey);
    }
    return remoteUri || null;
  });

  useEffect(() => {
    let cancelled = false;

    if (stableKey && hasCachedImage(stableKey)) {
      setSourceUri(imageCacheUri(stableKey));
    } else if (remoteUri) {
      setSourceUri(remoteUri);
    } else {
      setSourceUri(null);
    }

    void (async () => {
      await hydrateImageDiskCache();
      if (cancelled) {
        return;
      }

      if (stableKey && hasCachedImage(stableKey)) {
        setSourceUri(imageCacheUri(stableKey));
        if (!remoteUri || remoteUri.startsWith('file:')) {
          return;
        }
      }

      if (!stableKey || !remoteUri || remoteUri.startsWith('file:')) {
        return;
      }

      const localUri = await ensureCachedImage(stableKey, remoteUri);
      if (!cancelled && localUri) {
        setSourceUri(localUri);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [remoteUri, stableKey]);

  if (!sourceUri) {
    return null;
  }

  const handleError = (
    event: NativeSyntheticEvent<ImageErrorEventData>,
  ) => {
    if (
      stableKey
      && remoteUri
      && sourceUri !== remoteUri
    ) {
      setSourceUri(remoteUri);
      void invalidateCachedImage(stableKey).then(() => (
        ensureCachedImage(stableKey, remoteUri)
      )).then((localUri) => {
        if (localUri) {
          setSourceUri(localUri);
        }
      });
      return;
    }

    onError?.(event);
  };

  return (
    <Image
      {...rest}
      source={{ uri: sourceUri }}
      onError={handleError}
    />
  );
}
