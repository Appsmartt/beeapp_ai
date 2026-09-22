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
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Play,
  X,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../layout/ScreenSafeArea';
import type {
  SelectedStatusMedia,
} from '../CreateStatusModal';
import {
  toSelectedStatusMedia,
} from './statusMedia';
import {
  loadRecentStatusMedia,
  requestRecentStatusMediaPermission,
  resolveRecentStatusMediaUri,
  type RecentStatusMediaAsset,
} from '../../../services/statusMediaLibrary';

interface StatusCreationEntryModalProps {
  visible: boolean;
  cameraRequestId?: number;
  onChooseText: () => void;
  onSelectMedia: (media: SelectedStatusMedia) => void;
  onClose: () => void;
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
      const cameraPermission = (
        await ImagePicker.requestCameraPermissionsAsync()
      );

      if (!cameraPermission.granted) {
        Alert.alert(
          'Permiso requerido',
          'Permite el acceso a la cámara para tomar una foto o video para tu estado.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      onSelectMedia(
        toSelectedStatusMedia(result.assets[0]),
      );
    } catch (cameraError) {
      Alert.alert(
        'No fue posible abrir la cámara',
        cameraError instanceof Error
          ? cameraError.message
          : 'Inténtalo nuevamente.',
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

      const uri = await resolveRecentStatusMediaUri(
        asset.id,
        asset.uri,
      );
      const extension = asset.filename
        .split('.')
        .pop()
        ?.trim()
        .toLowerCase();

      const mimeType = asset.mediaType === 'video'
        ? 'video/mp4'
        : extension === 'gif'
          ? 'image/gif'
          : extension === 'png'
            ? 'image/png'
            : extension === 'webp'
              ? 'image/webp'
              : 'image/jpeg';

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
        }),
      );
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

  const renderAsset = ({
    item,
  }: {
    item: RecentStatusMediaAsset;
  }) => (
    <TouchableOpacity
      style={styles.mediaTile}
      onPress={() => {
        void handleSelectAsset(item);
      }}
      activeOpacity={0.8}
      disabled={Boolean(selectingId)}
      accessibilityLabel={
        item.mediaType === 'video'
          ? `Seleccionar video ${item.filename}`
          : `Seleccionar imagen ${item.filename}`
      }
    >
      <Image
        source={{
          uri: item.uri,
        }}
        style={styles.mediaImage}
      />

      {item.mediaType === 'video' ? (
        <View style={styles.videoBadge}>
          <Play
            size={11}
            color={colors.neutral.white}
            fill={colors.neutral.white}
          />
          <Text style={styles.videoDuration}>
            {formatVideoDuration(item.duration)}
          </Text>
        </View>
      ) : null}

      {selectingId === item.id ? (
        <View style={styles.mediaLoading}>
          <ActivityIndicator
            size="small"
            color={colors.neutral.white}
          />
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ScreenSafeArea style={styles.screen}>
        <View style={styles.header}>
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
            style={styles.actionItem}
            onPress={onChooseText}
            activeOpacity={0.8}
            accessibilityLabel="Crear estado de texto"
          >
            <View
              style={[
                styles.actionIcon,
                styles.textActionIcon,
              ]}
            >
              <FileText
                size={27}
                color={colors.brand.primary}
              />
            </View>
            <Text style={styles.actionLabel}>
              Texto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              void handleOpenCamera();
            }}
            activeOpacity={0.8}
            accessibilityLabel="Abrir cámara para crear estado"
          >
            <View
              style={[
                styles.actionIcon,
                styles.cameraActionIcon,
              ]}
            >
              <Camera
                size={27}
                color={colors.neutral.white}
              />
            </View>
            <Text style={styles.actionLabel}>
              Cámara
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
            data={assets}
            renderItem={renderAsset}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={[
              styles.grid,
              assets.length === 0 && styles.emptyGrid,
            ]}
            columnWrapperStyle={
              assets.length > 0
                ? styles.gridRow
                : undefined
            }
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={styles.stateTitle}>
                  No hay fotos ni videos recientes
                </Text>
                <Text style={styles.stateText}>
                  Toma una foto o video con la cámara para crear tu primer estado.
                </Text>
              </View>
            }
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
              ) : null
            }
          />
        )}
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
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: spacing.sm,
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
    flexDirection: 'row',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  textActionIcon: {
    backgroundColor: `${colors.brand.primary}18`,
  },
  cameraActionIcon: {
    backgroundColor: colors.brand.primary,
  },
  actionLabel: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
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
  emptyGrid: {
    flexGrow: 1,
  },
  gridRow: {
    gap: 2,
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
