import {
  useEffect,
  useState,
} from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from 'lucide-react-native';

import {
  getStorageFileAccess,
  moveStorageFileToTrash,
} from '@beeapp/api-client';
import { colors } from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import {
  getItems,
  type StorageItem,
} from '../../../src/stores/storageStore';
import { getValidSessionCredentials } from '../../../src/services/authSession';

export default function FilePreviewScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const fileId = params.id as string;

  const [fileItem, setFileItem] =
    useState<StorageItem | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const item = getItems().find(
      (candidate) => candidate.id === fileId,
    );

    if (item) {
      setFileItem(item);
    }
  }, [fileId]);

  useEffect(() => {
    if (params.download === 'true' && fileId) {
      void handleOpenFile(true);
    }
  }, [fileId, params.download]);

  const handleOpenFile = async (
    download = false,
  ) => {
    try {
      setOpening(true);

      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const access = await getStorageFileAccess(
        auth,
        fileId,
        download,
      );

      const supported = await Linking.canOpenURL(
        access.url,
      );

      if (!supported) {
        throw new Error(
          'No fue posible abrir este tipo de archivo.',
        );
      }

      await Linking.openURL(access.url);
    } catch (error) {
      Alert.alert(
        'No fue posible abrir el archivo',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setOpening(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Mover a papelera',
      'El archivo podrá restaurarse durante 30 días.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: async () => {
            try {
              const auth =
                await getValidSessionCredentials();

              if (!auth) {
                throw new Error(
                  'Tu sesión expiró. Inicia sesión nuevamente.',
                );
              }

              await moveStorageFileToTrash(
                auth,
                fileId,
              );

              Alert.alert(
                'Archivo movido',
                'El archivo está en la papelera.',
                [
                  {
                    text: 'Entendido',
                    onPress: () => router.back(),
                  },
                ],
              );
            } catch (error) {
              Alert.alert(
                'No fue posible mover el archivo',
                error instanceof Error
                  ? error.message
                  : 'Intenta nuevamente.',
              );
            }
          },
        },
      ],
    );
  };

  if (!fileItem) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Archivo no encontrado
          </Text>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  const isImage = fileItem.type === 'image';

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {fileItem.name}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.previewBox}>
          {opening ? (
            <View style={styles.previewContent}>
              <Loader2
                size={38}
                color={colors.brand.primary}
              />
              <Text style={styles.previewTitle}>
                Preparando acceso seguro...
              </Text>
            </View>
          ) : (
            <View style={styles.previewContent}>
              {isImage ? (
                <ImageIcon
                  size={52}
                  color={colors.brand.primary}
                />
              ) : (
                <FileText
                  size={52}
                  color={colors.brand.primary}
                />
              )}

              <Text style={styles.previewTitle}>
                {fileItem.name}
              </Text>

              <Text style={styles.previewSubtitle}>
                {fileItem.size || 'Archivo'}
              </Text>

              <Text style={styles.previewHint}>
                Toca “Abrir” para visualizarlo
                mediante un enlace seguro.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => handleOpenFile(false)}
            activeOpacity={0.8}
            disabled={opening}
          >
            <FileText
              size={20}
              color={colors.neutral.white}
            />
            <Text style={styles.primaryActionLabel}>
              Abrir
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenFile(true)}
            activeOpacity={0.7}
            disabled={opening}
          >
            <Download
              size={20}
              color={colors.neutral.text}
            />
            <Text style={styles.actionLabel}>
              Descargar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={opening}
          >
            <Trash2
              size={20}
              color={colors.semantic.error}
            />
            <Text
              style={[
                styles.actionLabel,
                styles.deleteLabel,
              ]}
            >
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 24,
  },
  previewBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewContent: {
    width: '100%',
    maxWidth: 360,
    minHeight: 260,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
    marginTop: 16,
  },
  previewSubtitle: {
    fontSize: 12,
    color: colors.neutral.gray600,
    marginTop: 6,
  },
  previewHint: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  primaryActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  deleteLabel: {
    color: colors.semantic.error,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: '700',
  },
});