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

interface CommercialLogoAvatarProps {
  displayName: string;
  logoFileId: string | null;
  logoUrl?: string | null;
  size?: number;
  shape?: "circle" | "rectangle";
  /** Solo con `rectangle`: ancho tipo mock (~cuadrado) o bandera. */
  rectangleAspect?: "wide" | "square";
}

function getInitials(value: string): string {
  const result = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return result || 'B';
}

export default function CommercialLogoAvatar({
  displayName,
  logoFileId,
  logoUrl: providedLogoUrl = null,
  size = 56,
  shape = "circle",
  rectangleAspect = "wide",
}: CommercialLogoAvatarProps) {
  const stableKey = remoteImageCacheKey({
    fileId: logoFileId,
    url: providedLogoUrl,
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (stableKey && hasCachedImage(stableKey)) {
      return imageCacheUri(stableKey);
    }
    return providedLogoUrl;
  });

  useEffect(() => {
    let cancelled = false;

    const loadLogoUrl = async () => {
      await hydrateImageDiskCache();
      if (cancelled) {
        return;
      }

      if (stableKey && hasCachedImage(stableKey)) {
        setLogoUrl(imageCacheUri(stableKey));
        return;
      }

      if (providedLogoUrl) {
        setLogoUrl(providedLogoUrl);
        return;
      }

      if (!logoFileId) {
        setLogoUrl(null);
        return;
      }

      try {
        const credentials = await getValidSessionCredentials();

        if (!credentials || cancelled) {
          return;
        }

        const access = await getStorageFileAccess(
          credentials,
          logoFileId,
        );

        if (!cancelled) {
          setLogoUrl(access.url);
        }
      } catch {
        if (!cancelled) {
          setLogoUrl(null);
        }
      }
    };

    void loadLogoUrl();

    return () => {
      cancelled = true;
    };
  }, [logoFileId, providedLogoUrl, stableKey]);

  const avatarStyle = {
    borderRadius: shape === "rectangle" ? 14 : size / 2,
    height:
      shape === "rectangle"
        ? rectangleAspect === "square"
          ? size
          : Math.round(size * 0.76)
        : size,
    width: size,
  };

  return (
    <View
      accessibilityLabel={`Logo de ${displayName}`}
      style={[
        styles.container,
        avatarStyle,
      ]}
    >
      {logoUrl ? (
        <CachedImage
          accessibilityLabel={`Logo de ${displayName}`}
          cacheKey={logoFileId}
          uri={logoUrl}
          style={[
            styles.image,
            avatarStyle,
          ]}
        />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.initials,
            {
              fontSize: Math.max(
                13,
                Math.round(size * 0.31),
              ),
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
    backgroundColor: '#F6EAFE',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: '#F6EAFE',
  },
  initials: {
    color: '#7427D5',
    fontWeight: '800',
  },
});
