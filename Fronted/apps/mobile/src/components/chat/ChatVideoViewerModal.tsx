import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { ResizeMode, Video } from 'expo-av';
import { Download, Minimize2 } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { getChatMessageAttachmentAccess } from '@beeapp/api-client';
import { getValidSessionCredentials } from '../../services/authSession';

type ChatVideo = {
  messageId: string;
  url: string;
  caption?: string;
};

type Props = {
  video: ChatVideo | null;
  identityId: string | null;
  onClose: () => void;
};

export default function ChatVideoViewerModal({
  video,
  identityId,
  onClose,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  const close = () => {
    if (!saving) {
      setPlaybackFailed(false);
      onClose();
    }
  };

  const saveVideo = async () => {
    if (!video || !identityId || saving) {
      return;
    }
    setSaving(true);
    let temporaryUri: string | null = null;
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(
        true,
        ['video'],
      );
      if (!permission.granted) {
        throw new Error('Permite guardar videos en la configuración del dispositivo.');
      }
      const auth = await getValidSessionCredentials();
      if (!auth) {
        throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      }
      const access = await getChatMessageAttachmentAccess(
        auth,
        video.messageId,
        identityId,
        true,
      );
      const url = String(access.url || '').trim();
      if (
        !/^https:\/\//i.test(url)
        || String(access.attachment?.mime_type || '').toLowerCase() !== 'video/mp4'
        || !FileSystem.cacheDirectory
      ) {
        throw new Error('No fue posible obtener el video MP4 para guardarlo.');
      }
      temporaryUri = `${FileSystem.cacheDirectory}beeapp-chat-video-${video.messageId}.mp4`;
      const result = await FileSystem.downloadAsync(url, temporaryUri);
      if (result.status < 200 || result.status >= 300) {
        throw new Error('La descarga del video no se completó.');
      }
      await MediaLibrary.saveToLibraryAsync(result.uri);
      Alert.alert('Video guardado', 'El video ya está en tu galería.');
    } catch (error) {
      Alert.alert(
        'No se pudo guardar el video',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      if (temporaryUri) {
        await FileSystem.deleteAsync(temporaryUri, { idempotent: true })
          .catch(() => undefined);
      }
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={video !== null}
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>CHAT · VIDEO</Text>
            <Text style={styles.title}>Video compartido</Text>
          </View>
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={close}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Cerrar video y volver al chat"
          >
            <Minimize2 size={19} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.videoFrame}>
          {video && !playbackFailed ? (
            <Video
              key={video.messageId}
              source={{ uri: video.url }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              onError={() => setPlaybackFailed(true)}
            />
          ) : (
            <Text style={styles.errorText}>No se pudo reproducir este video.</Text>
          )}
        </View>
        <View style={styles.footer}>
          {video?.caption ? (
            <Text style={styles.caption} numberOfLines={3}>{video.caption}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.savingButton]}
            onPress={() => { void saveVideo(); }}
            disabled={saving || !video || !identityId}
            accessibilityRole="button"
            accessibilityLabel="Guardar video en la galería"
          >
            {saving ? (
              <ActivityIndicator color={colors.neutral.white} />
            ) : (
              <Download size={19} color={colors.neutral.white} />
            )}
            <Text style={styles.saveText}>
              {saving ? 'Guardando video…' : 'Guardar video'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Toca el botón superior para volver al chat</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F5FF',
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 18,
  },
  heading: { flex: 1 },
  eyebrow: {
    color: '#8C80B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  title: { color: '#302B4D', fontSize: 20, fontWeight: '700' },
  minimizeButton: {
    alignItems: 'center',
    backgroundColor: '#EAE5FB',
    borderColor: '#DDD4F7',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  videoFrame: {
    alignItems: 'center',
    backgroundColor: '#29263F',
    borderRadius: 24,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  video: { height: '100%', width: '100%' },
  errorText: { color: colors.neutral.white, fontSize: 14 },
  footer: { paddingTop: 18 },
  caption: {
    color: '#443C63',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
  },
  savingButton: { opacity: 0.65 },
  saveText: { color: colors.neutral.white, fontSize: 15, fontWeight: '700' },
  hint: {
    color: '#8C80B8',
    fontSize: 11,
    marginTop: 12,
    textAlign: 'center',
  },
});
