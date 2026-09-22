import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Camera,
  ChevronLeft,
  Eye,
  FileText,
  Play,
  Trash2,
} from 'lucide-react-native';
import {
  colors,
  spacing,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../layout/ScreenSafeArea';
import type {
  StatusItem,
} from '../../../mocks/statuses';
import {
  getStatusVideoThumbnail,
} from '../../../services/statusVideoThumbnail';

interface MyStatusesModalProps {
  visible: boolean;
  statuses: StatusItem[];
  onOpenStatus: (status: StatusItem) => void;
  onCreateText: () => void;
  onOpenCamera: () => void;
  onArchiveStatus: (statusId: string) => Promise<void>;
  onClose: () => void;
}

function VideoStatusPreview({
  videoUri,
}: {
  videoUri: string | null | undefined;
}) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    setThumbnailUri(null);

    void getStatusVideoThumbnail(videoUri).then(
      (resolvedThumbnailUri) => {
        if (isMounted) {
          setThumbnailUri(resolvedThumbnailUri);
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, [
    videoUri,
  ]);

  return (
    <View style={styles.videoPreview}>
      {thumbnailUri ? (
        <Image
          source={{
            uri: thumbnailUri,
          }}
          style={styles.previewImage}
        />
      ) : null}
      <View style={styles.videoPlayOverlay}>
        <Play
          size={22}
          color={colors.neutral.white}
          fill={colors.neutral.white}
        />
      </View>
    </View>
  );
}

function formatPublishedAt(createdAt?: string): string {
  if (!createdAt) {
    return 'Justo ahora';
  }

  const createdAtTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return 'Justo ahora';
  }

  const elapsedMilliseconds = Math.max(
    0,
    Date.now() - createdAtTime,
  );
  const elapsedMinutes = Math.floor(
    elapsedMilliseconds / 60_000,
  );

  if (elapsedMinutes < 1) {
    return 'Justo ahora';
  }

  if (elapsedMinutes < 60) {
    return `Hace ${elapsedMinutes} min`;
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const remainingMinutes = elapsedMinutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `Hace ${hours} h`;
    }

    return `Hace ${hours} h ${remainingMinutes} min`;
  }

  const days = Math.floor(hours / 24);

  return days === 1
    ? 'Hace 1 día'
    : `Hace ${days} días`;
}

export default function MyStatusesModal({
  visible,
  statuses,
  onOpenStatus,
  onCreateText,
  onOpenCamera,
  onArchiveStatus,
  onClose,
}: MyStatusesModalProps) {
  const insets = useSafeAreaInsets();
  const [archivingStatusId, setArchivingStatusId] = useState<string | null>(
    null,
  );
  const [archiveConfirmationStatus, setArchiveConfirmationStatus] = useState<
    StatusItem | null
  >(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const sortedStatuses = useMemo(
    () => [...statuses].sort((first, second) => (
      new Date(second.createdAt || 0).getTime()
      - new Date(first.createdAt || 0).getTime()
    )),
    [statuses],
  );

  const openArchiveConfirmation = (status: StatusItem) => {
    if (archivingStatusId) {
      return;
    }

    setArchiveError(null);
    setArchiveConfirmationStatus(status);
  };

  const handleArchiveStatus = async () => {
    if (!archiveConfirmationStatus || archivingStatusId) {
      return;
    }

    try {
      setArchivingStatusId(archiveConfirmationStatus.id);
      setArchiveError(null);
      await onArchiveStatus(archiveConfirmationStatus.id);
      setArchiveConfirmationStatus(null);
    } catch (archiveError) {
      setArchiveError(
        archiveError instanceof Error
          ? archiveError.message
          : 'No fue posible eliminar el estado. Inténtalo nuevamente.',
      );
    } finally {
      setArchivingStatusId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ScreenSafeArea style={styles.screen}>
        <View
          style={[
            styles.header,
            {
              marginTop: (insets.top / 2) + spacing.sm,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Volver a chats"
          >
            <ChevronLeft
              size={30}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.title}>
            Mi estado
          </Text>
        </View>

        <FlatList
          data={sortedStatuses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMedia = Boolean(item.photoUrl);

            return (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.rowContent}
                  onPress={() => onOpenStatus(item)}
                  activeOpacity={0.78}
                  accessibilityLabel={`Abrir estado publicado ${formatPublishedAt(item.createdAt)}`}
                >
                <View style={styles.previewWrap}>
                  {item.type === 'video' ? (
                    <VideoStatusPreview
                      videoUri={item.photoUrl}
                    />
                  ) : isMedia ? (
                    <Image
                      source={{
                        uri: item.photoUrl || '',
                      }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.textPreview,
                        {
                          backgroundColor: (
                            item.bgColor
                            || colors.brand.primary
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={styles.textPreviewCopy}
                        numberOfLines={3}
                      >
                        {item.text || 'Estado de texto'}
                      </Text>
                    </View>
                  )}

                </View>

                <View style={styles.copy}>
                  <Text style={styles.publishedAt}>
                    {formatPublishedAt(item.createdAt)}
                  </Text>
                  <Text
                    style={styles.statusPreview}
                    numberOfLines={2}
                  >
                    {item.text || (
                      item.type === 'video'
                        ? 'Video'
                        : 'Foto'
                    )}
                  </Text>

                  <View style={styles.viewerCountRow}>
                    <Eye
                      size={14}
                      color={colors.neutral.gray600}
                    />
                    <Text style={styles.viewerCountText}>
                      Visto por {item.viewerCount ?? 0}
                    </Text>
                  </View>
                </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.archiveStatusButton}
                  onPress={() => {
                    openArchiveConfirmation(item);
                  }}
                  disabled={archivingStatusId === item.id}
                  activeOpacity={0.8}
                  accessibilityLabel="Eliminar este estado"
                >
                  <Trash2
                    size={19}
                    color={colors.semantic.error}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={<View style={styles.footerSpace} />}
        />

        {archiveConfirmationStatus ? (
          <View style={styles.archiveConfirmationOverlay}>
            <TouchableOpacity
              style={styles.archiveConfirmationBackdrop}
              activeOpacity={1}
              onPress={() => {
                if (!archivingStatusId) {
                  setArchiveConfirmationStatus(null);
                }
              }}
            />

            <View style={styles.archiveConfirmationCard}>
              <View style={styles.archiveConfirmationIcon}>
                <Trash2
                  size={26}
                  color={colors.semantic.error}
                />
              </View>

              <Text style={styles.archiveConfirmationTitle}>
                ¿Eliminar este estado?
              </Text>

              <Text style={styles.archiveConfirmationDescription}>
                Tu estado dejará de estar visible para otras personas.
              </Text>

              {archiveError ? (
                <Text style={styles.archiveConfirmationError}>
                  {archiveError}
                </Text>
              ) : null}

              <View style={styles.archiveConfirmationActions}>
                <TouchableOpacity
                  style={styles.archiveCancelButton}
                  onPress={() => {
                    if (!archivingStatusId) {
                      setArchiveConfirmationStatus(null);
                    }
                  }}
                  disabled={Boolean(archivingStatusId)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.archiveCancelButtonText}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.archiveConfirmButton}
                  onPress={() => {
                    void handleArchiveStatus();
                  }}
                  disabled={Boolean(archivingStatusId)}
                  activeOpacity={0.8}
                  accessibilityLabel={
                    archivingStatusId
                      ? 'Eliminando estado'
                      : 'Eliminar este estado'
                  }
                >
                  {archivingStatusId ? (
                    <View style={styles.archiveLoadingContent}>
                      <ActivityIndicator
                        size="small"
                        color={colors.neutral.white}
                      />
                      <Text style={styles.archiveConfirmButtonText}>
                        Eliminando...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.archiveConfirmButtonText}>
                      Eliminar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={styles.floatingTextButton}
            onPress={onCreateText}
            activeOpacity={0.8}
            accessibilityLabel="Crear nuevo estado de texto"
          >
            <FileText
              size={24}
              color={colors.neutral.white}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingCameraButton}
            onPress={onOpenCamera}
            activeOpacity={0.8}
            accessibilityLabel="Abrir cámara para un nuevo estado"
          >
            <Camera
              size={28}
              color={colors.neutral.white}
            />
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.neutral.white,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.xs,
    width: 48,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 26,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 88,
    paddingVertical: spacing.sm,
  },
  rowContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  archiveStatusButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.10)',
    borderColor: 'rgba(220,38,38,0.30)',
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    width: 38,
  },
  previewWrap: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 30,
    height: 60,
    overflow: 'hidden',
    width: 60,
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  videoPreview: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray800,
    flex: 1,
    justifyContent: 'center',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    justifyContent: 'center',
  },
  textPreview: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 6,
  },
  textPreviewCopy: {
    color: colors.neutral.white,
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  copy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  publishedAt: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statusPreview: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  viewerCountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
  },
  viewerCountText: {
    color: colors.neutral.gray600,
    fontSize: 12,
    fontWeight: '600',
  },
  footerSpace: {
    height: 112,
  },
  archiveConfirmationOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  archiveConfirmationBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 43, 67, 0.56)',
  },
  archiveConfirmationCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    elevation: 12,
    maxWidth: 360,
    padding: spacing.lg,
    width: '100%',
  },
  archiveConfirmationIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 56,
  },
  archiveConfirmationTitle: {
    color: colors.neutral.text,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  archiveConfirmationDescription: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  archiveConfirmationError: {
    color: colors.semantic.error,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  archiveConfirmationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  archiveCancelButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  archiveCancelButtonText: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '700',
  },
  archiveConfirmButton: {
    alignItems: 'center',
    backgroundColor: colors.semantic.error,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  archiveLoadingContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  archiveConfirmButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
  floatingActions: {
    alignItems: 'flex-end',
    bottom: spacing.xl,
    gap: spacing.md,
    position: 'absolute',
    right: spacing.lg,
  },
  floatingTextButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray700,
    borderRadius: 26,
    elevation: 3,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    width: 52,
  },
  floatingCameraButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 32,
    elevation: 3,
    height: 64,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 64,
  },
});
