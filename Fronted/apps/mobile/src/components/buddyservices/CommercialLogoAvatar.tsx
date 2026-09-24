import {
  Image,
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

import {
  getValidSessionCredentials,
} from '../../services/authSession';

interface CommercialLogoAvatarProps {
  displayName: string;
  logoFileId: string | null;
  logoUrl?: string | null;
  size?: number;
  shape?: "circle" | "rectangle";
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
}: CommercialLogoAvatarProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (providedLogoUrl) {
      setLogoUrl(providedLogoUrl);

      return () => {
        cancelled = true;
      };
    }

    setLogoUrl(null);

    if (!logoFileId) {
      return () => {
        cancelled = true;
      };
    }

    const loadLogoUrl = async () => {
      try {
        const credentials = await getValidSessionCredentials();

        if (!credentials) {
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
  }, [logoFileId, providedLogoUrl]);

  const avatarStyle = {
    borderRadius: shape === "rectangle" ? 16 : size / 2,
    height: shape === "rectangle" ? Math.round(size * 0.76) : size,
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
        <Image
          accessibilityLabel={`Logo de ${displayName}`}
          source={{ uri: logoUrl }}
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
