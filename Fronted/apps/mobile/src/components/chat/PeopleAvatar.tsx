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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (providedAvatarUrl) {
      setAvatarUrl(providedAvatarUrl);

      return () => {
        cancelled = true;
      };
    }

    setAvatarUrl(null);

    if (!avatarFileId) {
      return () => {
        cancelled = true;
      };
    }

    const loadAvatarUrl = async () => {
      try {
        const credentials = await getValidSessionCredentials();

        if (!credentials) {
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
  }, [avatarFileId, providedAvatarUrl]);

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
        <Image
          accessibilityLabel={`Foto de perfil de ${displayName}`}
          source={{ uri: avatarUrl }}
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
