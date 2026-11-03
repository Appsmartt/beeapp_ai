import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ResizeMode,
  Video,
} from 'expo-av';
import { Video as VideoIcon } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import {
  useStorageFileAccessUrl,
} from '../../hooks/useStorageFileAccessUrl';

type StorageFileVideoPlayerProps = {
  fileId: string;
};

export default function StorageFileVideoPlayer({
  fileId,
}: StorageFileVideoPlayerProps) {
  const {
    url,
    loading,
    failed,
  } = useStorageFileAccessUrl(fileId, true);

  const [playbackFailed, setPlaybackFailed] =
    useState(false);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color={colors.brand.primary}
        />
      </View>
    );
  }

  if (failed || !url || playbackFailed) {
    return (
      <View style={styles.fallback}>
        <VideoIcon
          size={52}
          color={colors.brand.primary}
        />

        <Text style={styles.fallbackText}>
          {playbackFailed
            ? 'No se pudo reproducir este video en la app.'
            : 'No se pudo cargar el video. Usa “Descargar” o “Abrir”.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <Video
        key={fileId}
        source={{ uri: url }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        shouldPlay={false}
        onError={() => setPlaybackFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    minHeight: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#29263F',
  },
  video: {
    width: '100%',
    height: '100%',
    minHeight: 280,
  },
  loader: {
    flex: 1,
    width: '100%',
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    width: '100%',
    maxWidth: 360,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    gap: 16,
  },
  fallbackText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.neutral.gray600,
  },
});
