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
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';


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
    if (
      params.download === 'true'
      && fileId
    ) {
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

      if (!fileItem) {
        setFileItem({
          id: access.file.id,
          name: access.file.display_name,
          type: getItemType(access.file.kind),
          parentId: access.file.folder_id,
          size: formatSize(access.file.size_bytes),
          sizeBytes: access.file.size_bytes,
          updatedAt: access.file.updated_at,
          createdAt: access.file.created_at,
          mimeType: access.file.mime_type,
          status: access.file.status,
        });
      }

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
    if (fileItem?.isShared) {
      Alert.alert(
        'Archivo compartido',
        (
          'No puedes mover a la papelera un archivo '
          + 'que otra persona compartió contigo.'
        ),
      );
      return;
    }

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
                  (
                    'Tu sesión expiró. '
                    + 'Inicia sesión nuevamente.'
                  ),
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
            activeOpacity={0.7}
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
            style={styles.backButton}
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
                Toca “Abrir” para visualizarlo mediante
                un enlace seguro.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => {
              void handleOpenFile(false);
            }}
            activeOpacity={0.8}
            disabled={opening}
          >
            <FileText
              size={20}
              color={colors.neutral.white}
            />

            <Text style={styles.primaryActionText}>
              Abrir
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              void handleOpenFile(true);
            }}
            activeOpacity={0.7}
            disabled={opening}
          >
            <Download
              size={20}
              color={colors.neutral.text}
            />

            <Text style={styles.actionText}>
              Descargar
            </Text>
          </TouchableOpacity>

          {!fileItem.isShared && (
            <TouchableOpacity
              style={styles.actionButton}
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
                  styles.actionText,
                  styles.deleteText,
                ]}
              >
                Eliminar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScreenSafeArea>
  );
}


function getItemType(
  kind: string,
): StorageItem['type'] {
  if (kind === 'image') {
    return 'image';
  }

  if (kind === 'video') {
    return 'video';
  }

  if (kind === 'audio') {
    return 'audio';
  }

  if (kind === 'archive') {
    return 'archive';
  }

  return 'doc';
}


function formatSize(
  bytes: number,
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(
    exponent === 0 ? 0 : 1,
  )} ${units[exponent]}`;
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.neutral.text,
  },
  headerSpacer: {
    width: 24,
  },
  previewBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  previewContent: {
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
  },
  previewTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.neutral.text,
  },
  previewSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: colors.neutral.gray600,
  },
  previewHint: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.neutral.gray600,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  primaryActionButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  deleteText: {
    color: colors.semantic.error,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '700',
    color: colors.brand.primary,
  },
});