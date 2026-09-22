import {
  ActivityIndicator,
  Alert,
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
  useRef,
  useState,
} from 'react';
import {
  Camera as ExpoCamera,
} from 'expo-camera';
import {
  Camera,
  Image as ImageIcon,
  Pencil,
  Play,
  X,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenSafeArea from '../../layout/ScreenSafeArea';
import StatusCameraModal from './StatusCameraModal';
import type {
  SelectedStatusMedia,
} from '../CreateStatusModal';
import {
  toSelectedStatusMedia,
} from './statusMedia';
import {
  createStatusVideoTraceId,
  logStatusVideoDiagnostic,
} from '../../../services/statusVideoDiagnostics';
import {
  loadRecentStatusMedia,
  requestRecentStatusMediaPermission,
  type RecentStatusMediaAsset,
} from '../../../services/statusMediaLibrary';

interface StatusCreationEntryModalProps {
  visible: boolean;
  cameraRequestId?: number;
  onChooseText: () => void;
  onSelectMedia: (media: SelectedStatusMedia) => void;
  onClose: () => void;
}

type StatusCreationGridItem =
  | {
      type: 'camera';
      id: 'camera';
    }
  | {
      type: 'media';
      asset: RecentStatusMediaAsset;
      id: string;
    };

const MAX_STATUS_VIDEO_DURATION_MILLISECONDS = 90 * 1000;

function validateStatusVideoDuration(
  durationMilliseconds: number | null | undefined,
): void {
  if (
    typeof durationMilliseconds !== 'number'
    || !Number.isFinite(durationMilliseconds)
    || durationMilliseconds <= 0
  ) {
    throw new Error(
      'No fue posible obtener la duración del video seleccionado.',
    );
  }

  if (durationMilliseconds > MAX_STATUS_VIDEO_DURATION_MILLISECONDS) {
    throw new Error(
      'Los videos de estado pueden durar máximo 90 segundos.',
    );
  }
}

function formatVideoDuration(durationMilliseconds: number): string {
  const totalSeconds = Math.max(
    0,
    Math.floor(durationMilliseconds / 1000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function StatusCreationEntryModal({
  visible,
  cameraRequestId = 0,
  onChooseText,
  onSelectMedia,
  onClose,
}: StatusCreationEntryModalProps) {
  const insets = useSafeAreaInsets();
  const [assets, setAssets] = useState<RecentStatusMediaAsset[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [statusCameraOpen, setStatusCameraOpen] = useState(false);
  const [microphoneGranted, setMicrophoneGranted] = useState(false);
  const handledCameraRequestIdRef = useRef(0);

  const loadAssets = async (
    options: {
      after?: string;
      append?: boolean;
    } = {},
  ) => {
    const isAppending = Boolean(options.append);

    try {
      if (isAppending) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const granted = await requestRecentStatusMediaPermission();

      if (!granted) {
        setPermissionDenied(true);
        setAssets([]);
        setEndCursor(undefined);
        setHasNextPage(false);
        return;
      }

      setPermissionDenied(false);

      const page = await loadRecentStatusMedia(options.after);

      setAssets((currentAssets) => (
        isAppending
          ? [...currentAssets, ...page.assets]
          : page.assets
      ));
      setEndCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar tus fotos y videos recientes.',
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      handledCameraRequestIdRef.current = 0;
      return;
    }

    setAssets([]);
    setError(null);
    setPermissionDenied(false);
    setEndCursor(undefined);
    setHasNextPage(false);
    setSelectingId(null);
    void loadAssets();
  }, [visible]);

  const handleOpenCamera = async () => {
    try {
      const [
        cameraPermission,
        microphonePermission,
      ] = await Promise.all([
        ExpoCamera.requestCameraPermissionsAsync(),
        ExpoCamera.requestMicrophonePermissionsAsync(),
      ]);

      if (!cameraPermission.granted) {
        setError(
          'Permite el acceso a la cámara para tomar fotos o grabar videos para tu estado.',
        );
        return;
      }

      setMicrophoneGranted(microphonePermission.granted);
      setError(null);
      setStatusCameraOpen(true);
    } catch (cameraError) {
      setError(
        cameraError instanceof Error
          ? cameraError.message
          : 'No fue posible abrir la cámara.',
      );
    }
  };

  useEffect(() => {
    if (
      !visible
      || cameraRequestId === 0
      || handledCameraRequestIdRef.current === cameraRequestId
    ) {
      return;
    }

    handledCameraRequestIdRef.current = cameraRequestId;
    void handleOpenCamera();
  }, [
    cameraRequestId,
    visible,
  ]);

  const handleSelectAsset = async (
    asset: RecentStatusMediaAsset,
  ) => {
    if (selectingId) {
      return;
    }

    try {
      setSelectingId(asset.id);

      const uri = asset.uri;
      const traceId = createStatusVideoTraceId();

      logStatusVideoDiagnostic({
        traceId,
        stage: 'gallery_selection_started',
        source: 'gallery',
        name: asset.filename,
        durationSeconds: asset.duration / 1000,
      });

      const extension = asset.filename
        .split('.')
        .pop()
        ?.trim()
        .toLowerCase();

      const mimeType = asset.mediaType === 'video'
        ? extension === 'mov'
          ? 'video/quicktime'
          : extension === 'mp4'
            ? 'video/mp4'
            : 'video/*'
        : extension === 'gif'
          ? 'image/gif'
          : extension === 'png'
            ? 'image/png'
            : extension === 'webp'
              ? 'image/webp'
              : 'image/jpeg';

      if (asset.mediaType === 'video') {
        validateStatusVideoDuration(asset.duration);
      }

      onSelectMedia(
        toSelectedStatusMedia({
          uri,
          fileName: asset.filename,
          mimeType,
          duration: (
            asset.mediaType === 'video'
              ? asset.duration
              : null
          ),
          traceId,
          source: 'gallery',
        }),
      );

      logStatusVideoDiagnostic({
        traceId,
        stage: 'gallery_selection_completed',
        source: 'gallery',
        name: asset.filename,
        mimeType,
        extension,
        durationSeconds: asset.duration / 1000,
      });
    } catch (selectionError) {
      Alert.alert(
        'No fue posible abrir el archivo',
        selectionError instanceof Error
          ? selectionError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setSelectingId(null);
    }
  };

  const gridItems: StatusCreationGridItem[] = [
    {
      type: 'camera',
      id: 'camera',
    },
    ...assets.map((asset) => ({
      type: 'media' as const,
      asset,
      id: asset.id,
    })),
  ];

  const renderGridItem = ({
    item,
  }: {
    item: StatusCreationGridItem;
  }) => {
    if (item.type === 'camera') {
      return (
        <TouchableOpacity
          style={styles.cameraGridTile}
          onPress={() => {
            void handleOpenCamera();
          }}
          activeOpacity={0.8}
          accessibilityLabel="Abrir cámara para crear estado"
        >
          <Camera
            size={30}
            color={colors.neutral.white}
          />
          <Text style={styles.cameraGridLabel}>
            Cámara
          </Text>
        </TouchableOpacity>
      );
    }

    const { asset } = item;

    return (
      <TouchableOpacity
        style={styles.mediaTile}
        onPress={() => {
          void handleSelectAsset(asset);
        }}
        activeOpacity={0.8}
        disabled={Boolean(selectingId)}
        accessibilityLabel={
          asset.mediaType === 'video'
            ? `Seleccionar video ${asset.filename}`
            : `Seleccionar imagen ${asset.filename}`
        }
      >
        <Image
          source={{
            uri: asset.uri,
          }}
          style={styles.mediaImage}
        />

        {asset.mediaType === 'video' ? (
          <View style={styles.videoBadge}>
            <Play
              size={11}
              color={colors.neutral.white}
              fill={colors.neutral.white}
            />
            <Text style={styles.videoDuration}>
              {formatVideoDuration(asset.duration)}
            </Text>
          </View>
        ) : null}

        {selectingId === asset.id ? (
          <View style={styles.mediaLoading}>
            <ActivityIndicator
              size="small"
              color={colors.neutral.white}
            />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusCameraModal
        visible={statusCameraOpen}
        microphoneGranted={microphoneGranted}
        onCapture={(capturedMedia) => {
          if (
            capturedMedia.duration !== null
            && capturedMedia.duration > 0
          ) {
            validateStatusVideoDuration(capturedMedia.duration);
          }

          setStatusCameraOpen(false);
          onSelectMedia(
            toSelectedStatusMedia(capturedMedia),
          );
        }}
        onClose={() => {
          setStatusCameraOpen(false);
          setMicrophoneGranted(false);
        }}
      />

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
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Cerrar selector de estado"
          >
            <X
              size={26}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.title}>
            Añade un estado
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.textActionButton}
            onPress={onChooseText}
            activeOpacity={0.8}
            accessibilityLabel="Crear estado de texto"
          >
            <Pencil
              size={20}
              color={colors.brand.primary}
            />
            <Text style={styles.textActionLabel}>
              Texto
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>
            Recientes
          </Text>
          <ImageIcon
            size={18}
            color={colors.neutral.gray500}
          />
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />
            <Text style={styles.stateText}>
              Cargando recientes...
            </Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>
              Permite el acceso a tu galería
            </Text>
            <Text style={styles.stateText}>
              Necesitamos acceso a fotos y videos para mostrar tus elementos recientes.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                void loadAssets();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                Intentar nuevamente
              </Text>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>
              No fue posible cargar recientes
            </Text>
            <Text style={styles.stateText}>
              {error}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                void loadAssets();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={gridItems}
            renderItem={renderGridItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            ListFooterComponent={
              hasNextPage ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={() => {
                    if (!loadingMore && endCursor) {
                      void loadAssets({
                        after: endCursor,
                        append: true,
                      });
                    }
                  }}
                  disabled={loadingMore}
                  activeOpacity={0.8}
                >
                  {loadingMore ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.brand.primary}
                    />
                  ) : (
                    <Text style={styles.loadMoreText}>
                      Cargar más
                    </Text>
                  )}
                </TouchableOpacity>
              ) : assets.length === 0 ? (
                <View style={styles.emptyGalleryState}>
                  <Text style={styles.stateTitle}>
                    No hay fotos ni videos recientes
                  </Text>
                  <Text style={styles.stateText}>
                    Toma una foto o video con la cámara para crear tu primer estado.
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </ScreenSafeArea>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.neutral.white,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    borderRadius: radii.xl,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.sm,
    shadowColor: colors.neutral.gray500,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 9,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 22,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  actions: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  textActionButton: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.primary}18`,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textActionLabel: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  recentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  recentTitle: {
    color: colors.neutral.text,
    fontSize: 18,
    fontWeight: '700',
  },
  grid: {
    gap: 2,
    paddingBottom: spacing.xl,
  },
  gridRow: {
    gap: 2,
  },
  emptyGalleryState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  cameraGridTile: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.brand.primary,
    flex: 1,
    justifyContent: 'center',
  },
  cameraGridLabel: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  mediaTile: {
    aspectRatio: 1,
    backgroundColor: colors.neutral.gray100,
    flex: 1,
    overflow: 'hidden',
  },
  mediaImage: {
    height: '100%',
    width: '100%',
  },
  videoBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    borderRadius: radii.sm,
    bottom: 6,
    flexDirection: 'row',
    gap: 3,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
  },
  videoDuration: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '700',
  },
  mediaLoading: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.36)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  stateTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadMoreText: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
