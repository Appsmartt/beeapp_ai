import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useEffect,
  useState,
} from 'react';
import {
  getStorageFileAccess,
} from '@beeapp/api-client';

import CachedImage from '../CachedImage';
import {
  getValidSessionCredentials,
} from '../../services/authSession';
import {
  hasCachedImage,
  hydrateImageDiskCache,
  imageCacheUri,
  remoteImageCacheKey,
} from '../../services/imageDiskCache';

interface PeopleAvatarProps {
  displayName: string;
  avatarFileId: string | null;
  avatarUrl?: string | null;
  size?: number;
}

function getInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
}

export default function PeopleAvatar({
  displayName,
  avatarFileId,
  avatarUrl: providedAvatarUrl = null,
  size = 44,
}: PeopleAvatarProps) {
  const stableKey = remoteImageCacheKey({
    fileId: avatarFileId,
    url: providedAvatarUrl,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (stableKey && hasCachedImage(stableKey)) {
      return imageCacheUri(stableKey);
    }
    return providedAvatarUrl;
  });

  useEffect(() => {
    let cancelled = false;

    const loadAvatarUrl = async () => {
      await hydrateImageDiskCache();
      if (cancelled) {
        return;
      }

      if (stableKey && hasCachedImage(stableKey)) {
        setAvatarUrl(imageCacheUri(stableKey));
        return;
      }

      if (providedAvatarUrl) {
        setAvatarUrl(providedAvatarUrl);
        return;
      }

      if (!avatarFileId) {
        setAvatarUrl(null);
        return;
      }

      try {
        const credentials = await getValidSessionCredentials();

        if (!credentials || cancelled) {
          return;
        }

        const access = await getStorageFileAccess(
          credentials,
          avatarFileId,
        );

        if (!cancelled) {
          setAvatarUrl(access.url);
        }
      } catch {
        if (!cancelled) {
          setAvatarUrl(null);
        }
      }
    };

    void loadAvatarUrl();

    return () => {
      cancelled = true;
    };
  }, [avatarFileId, providedAvatarUrl, stableKey]);

  return (
    <View
      accessibilityLabel={`Foto de perfil de ${displayName}`}
      style={[
        styles.container,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      {avatarUrl ? (
        <CachedImage
          accessibilityLabel={`Foto de perfil de ${displayName}`}
          cacheKey={avatarFileId}
          uri={avatarUrl}
          style={[
            styles.image,
            {
              borderRadius: size / 2,
              height: size,
              width: size,
            },
          ]}
        />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.initials,
            {
              fontSize: Math.max(13, Math.round(size * 0.3)),
            },
          ]}
        >
          {getInitials(displayName)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#D7DFF2',
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: '#EEF2FF',
  },
  initials: {
    color: '#7427D5',
    fontWeight: '700',
  },
});
