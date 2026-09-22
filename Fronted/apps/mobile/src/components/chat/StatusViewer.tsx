import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  type AVPlaybackStatus,
  ResizeMode,
  Video,
} from 'expo-av';
import { colors, spacing, radii } from '@beeapp/design-system';
import {
  ChevronUp,
  Eye,
  Send,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import StatusProgressPills from './StatusProgressPills';
import StatusViewersSheet from './StatusViewersSheet';
import { StatusItem, StatusViewedBy } from '../../mocks/statuses';
import { formatPrice } from '../../mocks/myServices';
import {
  loadStatusViewers,
  replyToStatus,
} from '../../services/statusesService';
import {
  mapStatusViewerToUi,
} from '../../services/statusesMapper';
import {
  STATUS_DEFAULT_FONT_FAMILY,
} from './status/statusTypography';
import {
  useStatusTypography,
} from './status/useStatusTypography';

const STATUS_DURATION = 6000;

interface StatusViewerProps {
  visible: boolean;
  statuses: StatusItem[];
  index: number;
  senderIdentityId: string | null;
  onChangeIndex: (index: number) => void;
  onStatusViewed: (statusId: string) => void;
  onArchiveStatus: (statusId: string) => Promise<void>;
  onClose: () => void;
}

export default function StatusViewer({
  visible,
  statuses,
  index,
  senderIdentityId,
  onChangeIndex,
  onStatusViewed,
  onArchiveStatus,
  onClose,
}: StatusViewerProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [productHidden, setProductHidden] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewedBy, setViewedBy] = useState<StatusViewedBy[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError, setViewersError] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [archivingStatus, setArchivingStatus] = useState(false);
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const {
    fontsLoaded,
  } = useStatusTypography();
  const insets = useSafeAreaInsets();
  const status = statuses[index];

  const goNext = () => (index < statuses.length - 1 ? onChangeIndex(index + 1) : onClose());
  const goPrev = () => index > 0 && onChangeIndex(index - 1);

  // Lo avanzado del estado actual (0..1), para poder reanudar donde se pausó
  const elapsed = useRef(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      elapsed.current = value;
    });
    return () => progress.removeListener(id);
  }, []);

  // Al cambiar de estado se vuelve a empezar
  useEffect(() => {
    if (!visible || !status) return;
    setProductHidden(false);
    setViewersOpen(false);
    setViewedBy([]);
    setViewersLoading(false);
    setViewersError(null);
    setReplyOpen(false);
    setReplyBody('');
    setReplySending(false);
    setReplyError(null);
    setArchivingStatus(false);
    setArchiveConfirmationOpen(false);
    setArchiveError(null);
    setIsPressing(false);
    setMediaError(null);
    setMediaReady(
      status.type !== 'photo'
      && status.type !== 'gif'
      && status.type !== 'video',
    );
    elapsed.current = 0;
    progress.setValue(0);

  }, [visible, index, onStatusViewed, status?.id]);

  useEffect(() => {
    if (!visible || !status || !mediaReady) {
      return;
    }

    if (!status.isOwn && status.viewedBy === undefined) {
      onStatusViewed(status.id);
    }
  }, [mediaReady, onStatusViewed, status?.id, visible]);

  // Fotos, GIF y texto mantienen el tiempo fijo actual.
  // Los videos avanzan exclusivamente al terminar la reproducción real.
  useEffect(() => {
    if (
      !visible
      || !status
      || status.type === 'video'
      || viewersOpen
      || replyOpen
      || isPressing
      || !mediaReady
    ) {
      return;
    }

    const remaining = STATUS_DURATION * (1 - elapsed.current);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(0, remaining),
      easing: Easing.linear,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });

    return () => animation.stop();
  }, [
    visible,
    index,
    isPressing,
    mediaReady,
    replyOpen,
    status?.id,
    status?.type,
    viewersOpen,
  ]);

  if (!status) return null;

  const isVideo = status.type === 'video';
  const isPhoto = (
    status.type === 'photo'
    || status.type === 'gif'
  );
  const hasMedia = isPhoto || isVideo;
  const isOwnStatus = (
    Boolean(status.isOwn)
    || status.authorId === 'me'
    || status.viewedBy !== undefined
  );
  const background = status.bgColor ?? colors.neutral.text;
  const onDark = hasMedia || background !== colors.neutral.white;
  const product = status.linkedProduct;

  const loadViewers = async () => {
    if (!isOwnStatus || viewersLoading) {
      return;
    }

    if (status.viewedBy?.length) {
      setViewedBy(status.viewedBy);
      setViewersError(null);
      return;
    }

    try {
      setViewersLoading(true);
      setViewersError(null);

      const response = await loadStatusViewers(status.id);

      setViewedBy(
        response.viewers.map(mapStatusViewerToUi),
      );
    } catch (loadError) {
      setViewersError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar las vistas.',
      );
    } finally {
      setViewersLoading(false);
    }
  };

  const openArchiveConfirmation = () => {
    if (!isOwnStatus || archivingStatus) {
      return;
    }

    setArchiveError(null);
    setArchiveConfirmationOpen(true);
  };

  const handleArchiveStatus = async () => {
    if (archivingStatus) {
      return;
    }

    try {
      setArchivingStatus(true);
      setArchiveError(null);
      await onArchiveStatus(status.id);
      setArchiveConfirmationOpen(false);
    } catch (archiveError) {
      setArchiveError(
        archiveError instanceof Error
          ? archiveError.message
          : 'No fue posible eliminar el estado. Inténtalo nuevamente.',
      );
    } finally {
      setArchivingStatus(false);
    }
  };

  const openViewersFromSwipe = () => {
    if (!isOwnStatus) {
      return;
    }

    setViewersOpen(true);
    void loadViewers();
  };

  const openReplyFromSwipe = () => {
    if (isOwnStatus) {
      return;
    }

    setReplyError(null);
    setReplyOpen(true);
  };

  const handleSendReply = async () => {
    const body = replyBody.trim();

    if (!body || replySending) {
      return;
    }

    if (!senderIdentityId) {
      setReplyError(
        'No fue posible identificar tu cuenta. Inténtalo nuevamente.',
      );
      return;
    }

    try {
      setReplySending(true);
      setReplyError(null);

      await replyToStatus(
        status.id,
        {
          sender_identity_id: senderIdentityId,
          body,
        },
      );

      setReplyBody('');
      setReplyOpen(false);
    } catch (sendError) {
      setReplyError(
        sendError instanceof Error
          ? sendError.message
          : 'No fue posible enviar la respuesta.',
      );
    } finally {
      setReplySending(false);
    }
  };

  const dismissGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-80, 80])
    .onEnd((event) => {
      if (event.translationY > 120) {
        runOnJS(onClose)();
        return;
      }

      if (event.translationY < -90) {
        if (isOwnStatus) {
          runOnJS(openViewersFromSwipe)();
        } else {
          runOnJS(openReplyFromSwipe)();
        }
      }
    });

  const hideProductGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .onEnd((event) => {
      if (event.translationY > 40) {
        runOnJS(setProductHidden)(true);
      }
    });

  const fallbackTextLayers = [{
    id: 'status_text',
    content: status.text,
    x: status.textPosition.x,
    y: status.textPosition.y,
    scale: 1,
    rotation: 0,
    fontSize: status.textSize,
    fontWeight: status.textWeight,
    color: status.textColor,
    fontFamily: status.textFontFamily
      || STATUS_DEFAULT_FONT_FAMILY,
  }];

  const textLayers = (
    status.textLayers
    && status.textLayers.length > 0
  )
    ? status.textLayers
    : fallbackTextLayers;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={dismissGesture}>
          <View style={[styles.screen, { backgroundColor: background }]}>
            {isPhoto ? (
              <>
                <Image
                  source={{ uri: status.photoUrl ?? undefined }}
                  style={styles.blurLayer}
                  resizeMode="cover"
                  blurRadius={30}
                />
                <View style={styles.blurTint} />
              </>
            ) : isVideo ? (
              <View style={styles.videoBackground} />
            ) : (
              <View style={styles.softShade} />
            )}

            <TouchableOpacity style={styles.tapLeft} onPress={goPrev} activeOpacity={1} />
            <TouchableOpacity
              style={styles.holdArea}
              onPressIn={() => {
                setIsPressing(true);
              }}
              onPressOut={() => {
                setIsPressing(false);
              }}
              activeOpacity={1}
              accessible={false}
            />
            <TouchableOpacity style={styles.tapRight} onPress={goNext} activeOpacity={1} />

            <ScreenSafeArea style={styles.overlay} pointerEvents="box-none">
              <View
                style={[
                  styles.topRow,
                  {
                    marginTop: (insets.top / 2) + spacing.sm,
                  },
                ]}
              >
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={22} color={onDark ? colors.neutral.white : colors.neutral.text} />
                </TouchableOpacity>
                <View style={[styles.avatar, { backgroundColor: status.authorColor }]}>
                  <Text style={styles.avatarText}>{status.authorInitials}</Text>
                </View>
                <View style={styles.authorTexts}>
                  <Text
                    style={[
                      styles.authorName,
                      onDark && styles.onDarkText,
                    ]}
                    numberOfLines={1}
                  >
                    {status.authorName}
                  </Text>
                  <Text
                    style={[
                      styles.timestamp,
                      onDark && styles.onDarkMuted,
                    ]}
                  >
                    {status.timestamp}
                  </Text>
                </View>

              </View>

              <StatusProgressPills count={statuses.length} index={index} progress={progress} onDark={onDark} />

              <View style={styles.stage} pointerEvents="none">
                {isVideo && status.photoUrl ? (
                  <Video
                    key={status.id}
                    source={{ uri: status.photoUrl }}
                    style={styles.photoCard}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={
                      visible
                      && !isPressing
                      && !viewersOpen
                      && !replyOpen
                    }
                    progressUpdateIntervalMillis={100}
                    onReadyForDisplay={() => {
                      setMediaError(null);
                      setMediaReady(true);
                    }}
                    onPlaybackStatusUpdate={(
                      playbackStatus: AVPlaybackStatus,
                    ) => {
                      if (!playbackStatus.isLoaded) {
                        return;
                      }

                      const fallbackDurationMillis = (
                        typeof status.durationSeconds === 'number'
                        && status.durationSeconds > 0
                      )
                        ? status.durationSeconds * 1000
                        : null;
                      const resolvedDurationMillis = (
                        typeof playbackStatus.durationMillis === 'number'
                        && playbackStatus.durationMillis > 0
                      )
                        ? playbackStatus.durationMillis
                        : fallbackDurationMillis;

                      if (
                        resolvedDurationMillis
                        && typeof playbackStatus.positionMillis === 'number'
                      ) {
                        const normalizedProgress = Math.min(
                          1,
                          Math.max(
                            0,
                            playbackStatus.positionMillis
                              / resolvedDurationMillis,
                          ),
                        );

                        elapsed.current = normalizedProgress;
                        progress.setValue(normalizedProgress);
                      }

                      if (playbackStatus.didJustFinish) {
                        progress.setValue(1);
                        goNext();
                      }
                    }}
                    onError={(error) => {
                      setMediaReady(false);
                      setMediaError(
                        error
                        || 'No fue posible reproducir este video.',
                      );
                    }}
                    isLooping={false}
                    isMuted={false}
                    useNativeControls={false}
                  />
                ) : null}

                {mediaError ? (
                  <View style={styles.mediaErrorCard}>
                    <Text style={styles.mediaErrorTitle}>
                      No fue posible reproducir el video
                    </Text>
                    <Text style={styles.mediaErrorMessage}>
                      {mediaError}
                    </Text>
                  </View>
                ) : null}

                {isPhoto ? (
                  <Image
                    source={{ uri: status.photoUrl ?? undefined }}
                    style={styles.photoCard}
                    resizeMode="cover"
                    onLoadEnd={() => {
                      setMediaReady(true);
                    }}
                    onError={() => {
                      setMediaReady(true);
                    }}
                  />
                ) : null}
                {textLayers.map((layer) => {
                  const fontFamily = fontsLoaded
                    ? layer.fontFamily
                    : STATUS_DEFAULT_FONT_FAMILY;

                  return (
                    <View
                      key={layer.id}
                      style={[
                        styles.textLayer,
                        {
                          top: `${layer.y}%`,
                          left: `${layer.x}%`,
                          transform: [
                            {
                              translateY: -(
                                layer.fontSize * 0.65
                              ),
                            },
                            {
                              rotate: `${layer.rotation}deg`,
                            },
                            {
                              scale: layer.scale,
                            },
                          ],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: layer.color,
                            fontFamily,
                            fontSize: layer.fontSize,
                            fontWeight: layer.fontWeight,
                            lineHeight: layer.fontSize * 1.3,
                          },
                        ]}
                      >
                        {layer.content}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {!isOwnStatus && !replyOpen ? (
                <View
                  style={styles.replyHint}
                  pointerEvents="none"
                >
                  <ChevronUp
                    size={16}
                    color={colors.neutral.white}
                    strokeWidth={2.4}
                  />
                  <Text style={styles.replyHintText}>
                    Desliza hacia arriba para responder
                  </Text>
                </View>
              ) : null}

              {isOwnStatus && (
                <View style={styles.ownStatusActions}>
                  <TouchableOpacity
                    style={styles.viewedByBar}
                    onPress={() => {
                      setViewersOpen(true);
                      void loadViewers();
                    }}
                    activeOpacity={0.8}
                  >
                    <Eye size={16} color={colors.neutral.white} />
                    <Text style={styles.viewedByText}>
                      Visto por {
                        status.viewerCount
                        ?? status.viewedBy?.length
                        ?? 0
                      }
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewerArchiveStatusButton}
                    onPress={openArchiveConfirmation}
                    disabled={archivingStatus}
                    activeOpacity={0.8}
                    accessibilityLabel="Eliminar este estado"
                  >
                    {archivingStatus ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.semantic.error}
                      />
                    ) : (
                      <Trash2
                        size={19}
                        color={colors.semantic.error}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {!!product && !productHidden && (
                <GestureDetector gesture={hideProductGesture}>
                  <View style={styles.productCard}>
                    <View style={styles.productThumb}><ShoppingBag size={20} color={colors.brand.primary} /></View>
                    <View style={styles.productTexts}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price !== null ? formatPrice(product.price) : 'Cotización'}</Text>
                    </View>
                    <TouchableOpacity style={styles.contactBtn} onPress={() => {}} activeOpacity={0.8}><Text style={styles.contactBtnText}>Solicitar</Text></TouchableOpacity>
                  </View>
                </GestureDetector>
              )}
            </ScreenSafeArea>
          </View>
        </GestureDetector>

        {replyOpen ? (
          <KeyboardAvoidingView
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : 'height'
            }
            keyboardVerticalOffset={
              Platform.OS === 'ios'
                ? 0
                : 12
            }
            style={styles.replyOverlay}
          >
            <TouchableOpacity
              style={styles.replyBackdrop}
              activeOpacity={1}
              onPress={() => {
                if (!replySending) {
                  setReplyOpen(false);
                }
              }}
            />

            <View style={styles.replySheet}>
              <View style={styles.replyHeader}>
                <Text style={styles.replyTitle}>
                  Responder a {status.authorName}
                </Text>

                <TouchableOpacity
                  style={styles.replyCloseBtn}
                  onPress={() => {
                    if (!replySending) {
                      setReplyOpen(false);
                    }
                  }}
                  disabled={replySending}
                  activeOpacity={0.7}
                >
                  <X
                    size={20}
                    color={colors.neutral.text}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.replyComposer}>
                <TextInput
                  autoFocus
                  value={replyBody}
                  onChangeText={setReplyBody}
                  placeholder="Escribe una respuesta..."
                  placeholderTextColor={colors.neutral.gray500}
                  style={styles.replyInput}
                  editable={!replySending}
                  multiline
                  maxLength={2000}
                />

                <TouchableOpacity
                  style={[
                    styles.replySendBtn,
                    (
                      !replyBody.trim()
                      || replySending
                    )
                      && styles.replySendBtnDisabled,
                  ]}
                  onPress={() => {
                    void handleSendReply();
                  }}
                  disabled={
                    !replyBody.trim()
                    || replySending
                  }
                  activeOpacity={0.8}
                  accessibilityLabel="Enviar respuesta"
                >
                  {replySending ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.neutral.white}
                    />
                  ) : (
                    <Send
                      size={18}
                      color={colors.neutral.white}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {replyError ? (
                <Text style={styles.replyError}>
                  {replyError}
                </Text>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        ) : null}

        {archiveConfirmationOpen ? (
          <View style={styles.archiveConfirmationOverlay}>
            <TouchableOpacity
              style={styles.archiveConfirmationBackdrop}
              activeOpacity={1}
              onPress={() => {
                if (!archivingStatus) {
                  setArchiveConfirmationOpen(false);
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
                    if (!archivingStatus) {
                      setArchiveConfirmationOpen(false);
                    }
                  }}
                  disabled={archivingStatus}
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
                  disabled={archivingStatus}
                  activeOpacity={0.8}
                >
                  {archivingStatus ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.neutral.white}
                    />
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

        <StatusViewersSheet
          visible={viewersOpen}
          viewedBy={viewedBy}
          viewerCount={status.viewerCount}
          loading={viewersLoading}
          error={viewersError}
          onRetry={() => {
            void loadViewers();
          }}
          onClose={() => {
            setViewersOpen(false);
          }}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  blurLayer: StyleSheet.absoluteFillObject,
  blurTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(34, 43, 67, 0.42)' },
  mediaErrorCard: {
    alignSelf: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: `${colors.semantic.error}30`,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
  },
  mediaErrorTitle: {
    color: colors.semantic.error,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  mediaErrorMessage: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  videoBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.neutral.text },
  softShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(34, 43, 67, 0.08)' },
  tapLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '35%' },
  tapRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '35%' },
  holdArea: { position: 'absolute', top: 0, bottom: 0, left: '35%', right: '35%' },
  overlay: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  closeBtn: { padding: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary },
  authorTexts: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  timestamp: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600 },
  onDarkText: { color: colors.neutral.white },
  onDarkMuted: { color: colors.neutral.white, opacity: 0.75 },
  stage: { flex: 1, margin: spacing.lg },
  photoCard: { ...StyleSheet.absoluteFillObject, borderRadius: 20, elevation: 10 },
  textLayer: { position: 'absolute', width: '86%', marginLeft: '-43%' },
  statusText: { textAlign: 'center' },
  replyHint: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(34, 43, 67, 0.62)',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 5,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyHintText: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: '600',
  },
  ownStatusActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  viewedByBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(34,43,67,0.62)',
    borderRadius: 16,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  archiveStatusButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.16)',
    borderColor: 'rgba(220,38,38,0.56)',
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 46,
  },
  viewerArchiveStatusButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.16)',
    borderColor: 'rgba(220,38,38,0.56)',
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 46,
  },
  viewedByText: { fontSize: 13, fontWeight: '600', color: colors.neutral.white },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.neutral.white, borderRadius: radii.xl, padding: 12, elevation: 6 },
  productThumb: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: `${colors.brand.primary}1A`, alignItems: 'center', justifyContent: 'center' },
  productTexts: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  productPrice: { fontSize: 13, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  contactBtn: { backgroundColor: colors.brand.primary, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 9 },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: colors.neutral.white },
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
    borderRadius: radii.xl,
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
    borderRadius: radii.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  archiveCancelButtonText: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '700',
  },
  archiveConfirmButton: {
    alignItems: 'center',
    backgroundColor: colors.semantic.error,
    borderRadius: radii.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  archiveConfirmButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
  replyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  replyBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 43, 67, 0.28)',
  },
  replySheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  replyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  replyTitle: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  replyCloseBtn: {
    padding: 5,
  },
  replyComposer: {
    alignItems: 'flex-end',
    backgroundColor: colors.neutral.gray100,
    borderRadius: radii.lg,
    flexDirection: 'row',
    minHeight: 48,
    paddingLeft: 12,
    paddingRight: 5,
    paddingVertical: 5,
  },
  replyInput: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 14,
    maxHeight: 110,
    minHeight: 38,
    paddingBottom: 8,
    paddingTop: 8,
  },
  replySendBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginLeft: 8,
    width: 38,
  },
  replySendBtnDisabled: {
    backgroundColor: colors.neutral.gray400,
  },
  replyError: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
});
