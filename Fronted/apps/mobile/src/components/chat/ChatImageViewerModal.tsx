import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Download, Minimize2 } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { getChatMessageAttachmentAccess } from '@beeapp/api-client';
import { getValidSessionCredentials } from '../../services/authSession';

type ChatImage = {
  messageId: string;
  url: string;
  caption?: string;
};

type Props = {
  image: ChatImage | null;
  identityId: string | null;
  onClose: () => void;
};

export default function ChatImageViewerModal({
  image,
  identityId,
  onClose,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const close = () => {
    if (!saving) {
      setImageFailed(false);
      onClose();
    }
  };

  const saveImage = async () => {
    if (!image || !identityId || saving) {
      return;
    }

    setSaving(true);
    let temporaryUri: string | null = null;

    try {
      const permission = await MediaLibrary.requestPermissionsAsync(
        true,
        ['photo'],
      );

      if (!permission.granted) {
        throw new Error('Permite guardar fotos en la configuración del dispositivo.');
      }

      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      }

      const access = await getChatMessageAttachmentAccess(
        auth,
        image.messageId,
        identityId,
        true,
      );
      const url = String(access.url || '');

      if (!/^https?:\/\//i.test(url) || !FileSystem.cacheDirectory) {
        throw new Error('No fue posible obtener la imagen para guardarla.');
      }

      const mimeType = String(access.attachment?.mime_type || '').toLowerCase();
      const extension = mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';

      temporaryUri = `${FileSystem.cacheDirectory}beeapp-chat-image-${image.messageId}.${extension}`;
      const result = await FileSystem.downloadAsync(url, temporaryUri);

      if (result.status < 200 || result.status >= 300) {
        throw new Error('La descarga de la imagen no se completó.');
      }

      await MediaLibrary.saveToLibraryAsync(result.uri);
      Alert.alert('Foto guardada', 'La imagen ya está en tu galería.');
    } catch (error) {
      Alert.alert(
        'No se pudo guardar la foto',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      if (temporaryUri) {
        await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => undefined);
      }
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={image !== null}
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>CHAT · FOTO</Text>
            <Text style={styles.title}>Imagen compartida</Text>
          </View>
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={close}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Hacer pequeña la imagen y volver al chat"
          >
            <Minimize2 size={19} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.imageFrame}>
          {image && !imageFailed ? (
            <Image
              key={image.messageId}
              source={{ uri: image.url }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Text style={styles.errorText}>No se pudo mostrar esta imagen.</Text>
          )}
        </View>

        <View style={styles.footer}>
          {image?.caption ? (
            <Text style={styles.caption} numberOfLines={3}>{image.caption}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.savingButton]}
            onPress={() => { void saveImage(); }}
            disabled={saving || !image || !identityId}
            accessibilityRole="button"
            accessibilityLabel="Guardar foto en la galería"
          >
            {saving ? (
              <ActivityIndicator color={colors.neutral.white} />
            ) : (
              <Download size={19} color={colors.neutral.white} />
            )}
            <Text style={styles.saveText}>
              {saving ? 'Guardando foto…' : 'Guardar foto'}
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
  imageFrame: {
    alignItems: 'center',
    backgroundColor: '#EBE7FA',
    borderColor: '#DED8F3',
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 10,
  },
  image: { height: '100%', width: '100%' },
  errorText: { color: '#625A7D', fontSize: 14 },
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
