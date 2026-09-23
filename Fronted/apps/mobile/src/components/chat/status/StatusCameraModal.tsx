import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CameraView,
  type CameraCapturedPicture,
} from 'expo-camera';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Camera,
  RefreshCw,
  CircleStop,
  Flashlight,
  Image as ImageIcon,
  Video,
  X,
  Zap,
  ZapOff,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../layout/ScreenSafeArea';
import {
  createStatusVideoTraceId,
  logStatusVideoDiagnostic,
} from '../../../services/statusVideoDiagnostics';

type StatusCameraMode = 'picture' | 'video';
type PhotoFlashMode = 'auto' | 'on' | 'off';

type CapturedStatusMedia = {
  uri: string;
  fileName: string;
  mimeType: string;
  duration: number | null;
  traceId?: string | null;
  source?: 'camera';
};

interface StatusCameraModalProps {
  visible: boolean;
  microphoneGranted: boolean;
  onCapture: (media: CapturedStatusMedia) => void;
  onClose: () => void;
}

const MAX_STATUS_VIDEO_DURATION_SECONDS = 90;
const MIN_CAMERA_ZOOM = 0;
const MAX_CAMERA_ZOOM = 1;
const DEFAULT_CAMERA_ZOOM = 0;
const FOCUS_INDICATOR_DURATION_MILLISECONDS = 900;
const FOCUS_LONG_PRESS_DURATION_MILLISECONDS = 4000;
const FOCUS_DOUBLE_TAP_DELAY_MILLISECONDS = 280;
const ZOOM_INDICATOR_HIDE_DELAY_MILLISECONDS = 1200;
const ZOOM_GESTURE_SENSITIVITY = 0.42;
const MIN_DISPLAY_ZOOM = 1;
const MAX_DISPLAY_ZOOM = 5;

function getCaptureFileName(
  mode: StatusCameraMode,
): string {
  const capturedAt = Date.now();

  return mode === 'video'
    ? `estado-video-${capturedAt}.mp4`
    : `estado-imagen-${capturedAt}.jpg`;
}

export default function StatusCameraModal({
  visible,
  microphoneGranted,
  onCapture,
  onClose,
}: StatusCameraModalProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const zoomStartDistanceRef = useRef<number | null>(null);
  const zoomStartValueRef = useRef(DEFAULT_CAMERA_ZOOM);
  const isZoomGestureRef = useRef(false);
  const focusLongPressTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const lastPreviewTapAtRef = useRef(0);
  const didFocusWithLongPressRef = useRef(false);
  const focusIndicatorTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const zoomIndicatorTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const [mode, setMode] = useState<StatusCameraMode>('picture');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_CAMERA_ZOOM);
  const [photoFlashMode, setPhotoFlashMode] = useState<PhotoFlashMode>(
    'auto',
  );
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const zoomIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const zoomIndicatorScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!visible) {
      recordingStartedAtRef.current = null;
      setMode('picture');
      setCameraReady(false);
      setCapturing(false);
      setCameraError(null);
      setZoom(DEFAULT_CAMERA_ZOOM);
      setPhotoFlashMode('auto');
      setTorchEnabled(false);
      setFocusPoint(null);
      setShowZoomIndicator(false);
      zoomIndicatorOpacity.setValue(0);
      zoomIndicatorScale.setValue(0.92);
      lastPreviewTapAtRef.current = 0;
      didFocusWithLongPressRef.current = false;
      return;
    }

    setCameraError(null);
  }, [visible]);

  useEffect(() => {
    const isRecordingVideo = capturing && mode === 'video';

    if (!isRecordingVideo) {
      setRecordingElapsedSeconds(0);
      return;
    }

    const updateRecordingElapsedSeconds = () => {
      const recordingStartedAt = recordingStartedAtRef.current || Date.now();

      setRecordingElapsedSeconds(
        Math.min(
          MAX_STATUS_VIDEO_DURATION_SECONDS,
          Math.max(
            0,
            Math.floor((Date.now() - recordingStartedAt) / 1000),
          ),
        ),
      );
    };

    updateRecordingElapsedSeconds();

    const recordingTimer = setInterval(
      updateRecordingElapsedSeconds,
      1000,
    );

    return () => {
      clearInterval(recordingTimer);
    };
  }, [capturing, mode]);

  const clearZoomIndicatorTimeout = () => {
    if (zoomIndicatorTimeoutRef.current) {
      clearTimeout(zoomIndicatorTimeoutRef.current);
      zoomIndicatorTimeoutRef.current = null;
    }
  };

  const hideZoomIndicator = () => {
    clearZoomIndicatorTimeout();

    Animated.parallel([
      Animated.timing(zoomIndicatorOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(zoomIndicatorScale, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowZoomIndicator(false);
    });
  };

  const revealZoomIndicator = () => {
    clearZoomIndicatorTimeout();
    setShowZoomIndicator(true);
    zoomIndicatorOpacity.setValue(1);

    Animated.spring(zoomIndicatorScale, {
      toValue: 1,
      friction: 7,
      tension: 110,
      useNativeDriver: true,
    }).start();

    zoomIndicatorTimeoutRef.current = setTimeout(
      hideZoomIndicator,
      ZOOM_INDICATOR_HIDE_DELAY_MILLISECONDS,
    );
  };

  const clearFocusLongPress = () => {
    if (focusLongPressTimeoutRef.current) {
      clearTimeout(focusLongPressTimeoutRef.current);
      focusLongPressTimeoutRef.current = null;
    }
  };

  const clearFocusIndicator = () => {
    if (focusIndicatorTimeoutRef.current) {
      clearTimeout(focusIndicatorTimeoutRef.current);
      focusIndicatorTimeoutRef.current = null;
    }

    setFocusPoint(null);
  };

  useEffect(() => {
    return () => {
      clearFocusLongPress();
      clearZoomIndicatorTimeout();

      if (focusIndicatorTimeoutRef.current) {
        clearTimeout(focusIndicatorTimeoutRef.current);
      }
    };
  }, []);

  const showFocusIndicator = (
    locationX: number,
    locationY: number,
  ) => {
    if (capturing || isZoomGestureRef.current) {
      return;
    }

    clearFocusIndicator();

    setFocusPoint({
      x: locationX,
      y: locationY,
    });

    focusIndicatorTimeoutRef.current = setTimeout(() => {
      setFocusPoint(null);
      focusIndicatorTimeoutRef.current = null;
    }, FOCUS_INDICATOR_DURATION_MILLISECONDS);
  };

  const handlePreviewPress = (
    event: {
      nativeEvent: {
        locationX: number;
        locationY: number;
      };
    },
  ) => {
    if (capturing || isZoomGestureRef.current) {
      return;
    }

    if (didFocusWithLongPressRef.current) {
      didFocusWithLongPressRef.current = false;
      lastPreviewTapAtRef.current = 0;
      return;
    }

    const pressedAt = Date.now();
    const isDoubleTap = (
      pressedAt - lastPreviewTapAtRef.current
      <= FOCUS_DOUBLE_TAP_DELAY_MILLISECONDS
    );

    lastPreviewTapAtRef.current = isDoubleTap ? 0 : pressedAt;

    if (isDoubleTap) {
      showFocusIndicator(
        event.nativeEvent.locationX,
        event.nativeEvent.locationY,
      );
    }
  };

  const handlePreviewPressIn = (
    event: {
      nativeEvent: {
        locationX: number;
        locationY: number;
      };
    },
  ) => {
    if (capturing || isZoomGestureRef.current) {
      return;
    }

    didFocusWithLongPressRef.current = false;
    clearFocusLongPress();

    const {
      locationX,
      locationY,
    } = event.nativeEvent;

    focusLongPressTimeoutRef.current = setTimeout(() => {
      didFocusWithLongPressRef.current = true;
      lastPreviewTapAtRef.current = 0;
      showFocusIndicator(locationX, locationY);
      focusLongPressTimeoutRef.current = null;
    }, FOCUS_LONG_PRESS_DURATION_MILLISECONDS);
  };

  const handlePreviewPressOut = () => {
    clearFocusLongPress();
  };

  const getTouchDistance = (
    firstTouch: {
      pageX: number;
      pageY: number;
    },
    secondTouch: {
      pageX: number;
      pageY: number;
    },
  ) => {
    const horizontalDistance = firstTouch.pageX - secondTouch.pageX;
    const verticalDistance = firstTouch.pageY - secondTouch.pageY;

    return Math.sqrt(
      (horizontalDistance * horizontalDistance)
      + (verticalDistance * verticalDistance),
    );
  };

  const handlePreviewTouchStart = (
    event: {
      nativeEvent: {
        touches: Array<{
          pageX: number;
          pageY: number;
        }>;
      };
    },
  ) => {
    const touches = event.nativeEvent.touches;

    if (capturing || touches.length < 2) {
      return;
    }

    isZoomGestureRef.current = true;
    zoomStartDistanceRef.current = getTouchDistance(
      touches[0],
      touches[1],
    );
    zoomStartValueRef.current = zoom;
    clearFocusLongPress();
    clearFocusIndicator();
    revealZoomIndicator();
  };

  const handlePreviewTouchMove = (
    event: {
      nativeEvent: {
        touches: Array<{
          pageX: number;
          pageY: number;
        }>;
      };
    },
  ) => {
    const touches = event.nativeEvent.touches;
    const zoomStartDistance = zoomStartDistanceRef.current;

    if (
      capturing
      || !isZoomGestureRef.current
      || !zoomStartDistance
      || touches.length < 2
    ) {
      return;
    }

    const currentDistance = getTouchDistance(
      touches[0],
      touches[1],
    );
    const distanceRatio = (
      currentDistance - zoomStartDistance
    ) / zoomStartDistance;
    const nextZoom = Math.max(
      MIN_CAMERA_ZOOM,
      Math.min(
        MAX_CAMERA_ZOOM,
        zoomStartValueRef.current
        + (distanceRatio * ZOOM_GESTURE_SENSITIVITY),
      ),
    );

    setZoom(nextZoom);
    revealZoomIndicator();
  };

  const handlePreviewTouchEnd = (
    event: {
      nativeEvent: {
        touches: Array<{
          pageX: number;
          pageY: number;
        }>;
      };
    },
  ) => {
    if (event.nativeEvent.touches.length >= 2) {
      return;
    }

    zoomStartDistanceRef.current = null;

    if (isZoomGestureRef.current) {
      clearFocusLongPress();
      revealZoomIndicator();

      setTimeout(() => {
        isZoomGestureRef.current = false;
      }, 0);
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || !cameraReady || capturing) {
      return;
    }

    try {
      setCapturing(true);
      setCameraError(null);

      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      }) as CameraCapturedPicture | undefined;

      if (!picture?.uri) {
        throw new Error('No fue posible capturar la foto.');
      }

      onCapture({
        uri: picture.uri,
        fileName: getCaptureFileName('picture'),
        mimeType: 'image/jpeg',
        duration: null,
      });
    } catch (captureError) {
      setCameraError(
        captureError instanceof Error
          ? captureError.message
          : 'No fue posible tomar la foto.',
      );
    } finally {
      setCapturing(false);
    }
  };

  const handleStartVideo = async () => {
    if (!cameraRef.current || !cameraReady || capturing) {
      return;
    }

    try {
      setCapturing(true);
      setCameraError(null);
      recordingStartedAtRef.current = Date.now();
      const traceId = createStatusVideoTraceId();

      logStatusVideoDiagnostic({
        traceId,
        stage: 'camera_capture_started',
        source: 'camera',
        mimeType: 'video/mp4',
      });

      const recording = await cameraRef.current.recordAsync({
        maxDuration: MAX_STATUS_VIDEO_DURATION_SECONDS,
      });

      if (!recording?.uri) {
        throw new Error('No fue posible guardar el video.');
      }

      const durationMilliseconds = Math.max(
        1,
        Date.now() - (recordingStartedAtRef.current || Date.now()),
      );

      const fileName = getCaptureFileName('video');

      logStatusVideoDiagnostic({
        traceId,
        stage: 'camera_capture_completed',
        source: 'camera',
        name: fileName,
        mimeType: 'video/mp4',
        durationSeconds: durationMilliseconds / 1000,
      });

      onCapture({
        uri: recording.uri,
        fileName,
        mimeType: 'video/mp4',
        duration: durationMilliseconds,
        traceId,
        source: 'camera',
      });
    } catch (recordingError) {
      setCameraError(
        recordingError instanceof Error
          ? recordingError.message
          : 'No fue posible grabar el video.',
      );
    } finally {
      recordingStartedAtRef.current = null;
      setCapturing(false);
    }
  };

  const handleStopVideo = () => {
    if (!cameraRef.current || !capturing) {
      return;
    }

    cameraRef.current.stopRecording();
  };

  const handleCapture = () => {
    if (mode === 'picture') {
      void handleTakePicture();
      return;
    }

    if (!microphoneGranted) {
      setCameraError(
        'Permite el acceso al micrófono para grabar videos con audio.',
      );
      return;
    }

    if (capturing) {
      handleStopVideo();
      return;
    }

    void handleStartVideo();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.screen}>
        <View
          style={styles.cameraGestureSurface}
          onTouchStart={handlePreviewTouchStart}
          onTouchMove={handlePreviewTouchMove}
          onTouchEnd={handlePreviewTouchEnd}
        >
            <CameraView
              ref={(camera) => {
                cameraRef.current = camera;
              }}
              style={styles.camera}
              facing={facing}
              mode={mode}
              mute={false}
              zoom={zoom}
              flash={mode === 'picture' ? photoFlashMode : 'off'}
              enableTorch={mode === 'video' && torchEnabled}
              autofocus="off"
              videoQuality="720p"
              onCameraReady={() => {
                setCameraReady(true);
              }}
              onMountError={(event) => {
                setCameraError(
                  event.message
                  || 'No fue posible iniciar la cámara.',
                );
              }}
            />

            <Pressable
              style={styles.focusGestureSurface}
              onPress={handlePreviewPress}
              onPressIn={handlePreviewPressIn}
              onPressOut={handlePreviewPressOut}
              disabled={capturing}
              accessibilityRole="button"
              accessibilityLabel="Doble toca o mantén presionado cuatro segundos para enfocar"
            />

            {focusPoint ? (
              <View
                pointerEvents="none"
                style={[
                  styles.focusIndicator,
                  {
                    left: focusPoint.x - 24,
                    top: focusPoint.y - 24,
                  },
                ]}
              />
            ) : null}
          {showZoomIndicator ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.zoomIndicator,
                {
                  opacity: zoomIndicatorOpacity,
                  transform: [{
                    scale: zoomIndicatorScale,
                  }],
                },
              ]}
            >
              <Text style={styles.zoomIndicatorValue}>
                {`${(
                  MIN_DISPLAY_ZOOM
                  + (zoom * (MAX_DISPLAY_ZOOM - MIN_DISPLAY_ZOOM))
                ).toFixed(1)}x`}
              </Text>
              <View style={styles.zoomIndicatorTrack}>
                <View
                  style={[
                    styles.zoomIndicatorProgress,
                    {
                      width: `${Math.max(8, zoom * 100)}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.zoomIndicatorMarkers}>
                {[1, 2, 3, 4, 5].map((zoomMark) => (
                  <Text
                    key={zoomMark}
                    style={[
                      styles.zoomIndicatorMarker,
                      Math.abs(
                        (
                          MIN_DISPLAY_ZOOM
                          + (zoom * (
                            MAX_DISPLAY_ZOOM - MIN_DISPLAY_ZOOM
                          ))
                        ) - zoomMark,
                      ) < 0.45 && styles.zoomIndicatorMarkerActive,
                    ]}
                  >
                    {`${zoomMark}x`}
                  </Text>
                ))}
              </View>
            </Animated.View>
          ) : null}
        </View>

        <ScreenSafeArea
          style={[
            styles.overlay,
            {
              marginTop: (insets.top / 2) + spacing.sm,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onClose}
              disabled={capturing}
              activeOpacity={0.8}
              accessibilityLabel="Cerrar cámara de estado"
            >
              <X
                size={24}
                color={colors.neutral.white}
              />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {mode === 'video'
                  ? 'Grabar video'
                  : 'Tomar foto'}
              </Text>

              {capturing && mode === 'video' ? (
                <View style={styles.recordingTimer}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTimerText}>
                    {`Grabando ${String(
                      Math.floor(recordingElapsedSeconds / 60),
                    ).padStart(2, '0')}:${String(
                      recordingElapsedSeconds % 60,
                    ).padStart(2, '0')}`}
                  </Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setFacing((currentFacing) => (
                  currentFacing === 'back'
                    ? 'front'
                    : 'back'
                ));
                setZoom(DEFAULT_CAMERA_ZOOM);
              }}
              disabled={capturing}
              activeOpacity={0.8}
              accessibilityLabel="Cambiar cámara"
            >
              <RefreshCw
                size={23}
                color={colors.neutral.white}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraUtilityControls}>
            {mode === 'picture' ? (
              <TouchableOpacity
                style={[
                  styles.cameraUtilityButton,
                  photoFlashMode === 'on'
                    && styles.cameraUtilityButtonActive,
                ]}
                onPress={() => {
                  setPhotoFlashMode((currentPhotoFlashMode) => (
                    currentPhotoFlashMode === 'auto'
                      ? 'on'
                      : currentPhotoFlashMode === 'on'
                        ? 'off'
                        : 'auto'
                  ));
                }}
                disabled={capturing}
                activeOpacity={0.8}
                accessibilityLabel={
                  photoFlashMode === 'auto'
                    ? 'Flash automático'
                    : photoFlashMode === 'on'
                      ? 'Flash activado'
                      : 'Flash desactivado'
                }
              >
                {photoFlashMode === 'off' ? (
                  <ZapOff
                    size={20}
                    color={colors.neutral.white}
                  />
                ) : (
                  <Zap
                    size={20}
                    color={colors.neutral.white}
                  />
                )}
                <Text style={styles.cameraUtilityButtonText}>
                  {photoFlashMode === 'auto'
                    ? 'Auto'
                    : photoFlashMode === 'on'
                      ? 'On'
                      : 'Off'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.cameraUtilityButton,
                  torchEnabled && styles.cameraUtilityButtonActive,
                ]}
                onPress={() => {
                  setTorchEnabled((currentTorchEnabled) => (
                    !currentTorchEnabled
                  ));
                }}
                activeOpacity={0.8}
                accessibilityLabel={
                  torchEnabled
                    ? 'Apagar linterna'
                    : 'Encender linterna'
                }
              >
                <Flashlight
                  size={20}
                  color={colors.neutral.white}
                />
                <Text style={styles.cameraUtilityButtonText}>
                  {torchEnabled ? 'On' : 'Off'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.zoomHint}>
              {zoom > 0.01
                ? `${(
                  MIN_DISPLAY_ZOOM
                  + (zoom * (MAX_DISPLAY_ZOOM - MIN_DISPLAY_ZOOM))
                ).toFixed(1)}x`
                : 'Pellizca para acercar'}
            </Text>
          </View>

          {cameraError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                No fue posible usar la cámara
              </Text>
              <Text style={styles.errorMessage}>
                {cameraError}
              </Text>
            </View>
          ) : null}

          <View style={styles.bottomControls}>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === 'picture' && styles.modeButtonActive,
                ]}
                onPress={() => {
                  if (!capturing) {
                    setMode('picture');
                    setTorchEnabled(false);
                    clearFocusIndicator();
                  }
                }}
                disabled={capturing}
                activeOpacity={0.8}
              >
                <ImageIcon
                  size={17}
                  color={
                    mode === 'picture'
                      ? colors.neutral.white
                      : colors.neutral.gray200
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'picture' && styles.modeButtonTextActive,
                  ]}
                >
                  Foto
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  mode === 'video' && styles.modeButtonActive,
                ]}
                onPress={() => {
                  if (!capturing && microphoneGranted) {
                    setMode('video');
                    clearFocusIndicator();
                  }

                  if (!microphoneGranted) {
                    setCameraError(
                      'Permite el acceso al micrófono para grabar videos con audio.',
                    );
                  }
                }}
                disabled={capturing}
                activeOpacity={0.8}
              >
                <Video
                  size={17}
                  color={
                    mode === 'video'
                      ? colors.neutral.white
                      : colors.neutral.gray200
                  }
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === 'video' && styles.modeButtonTextActive,
                  ]}
                >
                  Video
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.captureButton,
                mode === 'video' && styles.captureButtonVideo,
                capturing && styles.captureButtonRecording,
              ]}
              onPress={handleCapture}
              disabled={!cameraReady}
              activeOpacity={0.85}
              accessibilityLabel={
                mode === 'video'
                  ? (
                    capturing
                      ? 'Detener grabación de video'
                      : 'Iniciar grabación de video'
                  )
                  : 'Tomar foto'
              }
            >
              {capturing && mode === 'video' ? (
                <CircleStop
                  size={30}
                  color={colors.neutral.white}
                  fill={colors.neutral.white}
                />
              ) : cameraReady ? (
                <Camera
                  size={30}
                  color={colors.neutral.white}
                />
              ) : (
                <ActivityIndicator
                  size="small"
                  color={colors.neutral.white}
                />
              )}
            </TouchableOpacity>

            <Text style={styles.captureHint}>
              {mode === 'video'
                ? (
                  capturing
                    ? 'Toca para detener'
                    : `Máximo ${MAX_STATUS_VIDEO_DURATION_SECONDS} segundos`
                )
                : 'Toca para tomar la foto'}
            </Text>
          </View>
        </ScreenSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.neutral.text,
    flex: 1,
  },
  cameraGestureSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  focusGestureSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  zoomIndicator: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#F3F0FF',
    borderColor: '#D7DFF2',
    borderRadius: radii.xl,
    borderWidth: 1,
    bottom: '42%',
    elevation: 5,
    minWidth: 212,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    shadowColor: '#9CA9CF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  zoomIndicatorValue: {
    color: '#665AC0',
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  zoomIndicatorTrack: {
    backgroundColor: '#E7ECF7',
    borderRadius: radii.full,
    height: 4,
    marginTop: spacing.xs,
    overflow: 'hidden',
    width: 180,
  },
  zoomIndicatorProgress: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.full,
    height: '100%',
  },
  zoomIndicatorMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    width: 180,
  },
  zoomIndicatorMarker: {
    color: '#687892',
    fontSize: 10,
    fontWeight: '700',
  },
  zoomIndicatorMarkerActive: {
    color: '#A88BC5',
  },
  focusIndicator: {
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderColor: '#facc15',
    borderRadius: radii.full,
    borderWidth: 2,
    height: 48,
    position: 'absolute',
    width: 48,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    borderRadius: radii.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: colors.neutral.white,
    fontSize: 17,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },
  recordingTimer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  recordingDot: {
    backgroundColor: '#ef4444',
    borderRadius: radii.full,
    height: 8,
    width: 8,
  },
  recordingTimerText: {
    color: colors.neutral.white,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  cameraUtilityControls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  cameraUtilityButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  cameraUtilityButtonActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.78)',
  },
  cameraUtilityButtonText: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: '700',
  },
  zoomHint: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },
  errorCard: {
    alignSelf: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: `${colors.semantic.error}30`,
    borderRadius: radii.xl,
    borderWidth: 1,
    maxWidth: 340,
    padding: spacing.md,
  },
  errorTitle: {
    color: colors.semantic.error,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  bottomControls: {
    alignItems: 'center',
  },
  modeSelector: {
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  modeButtonActive: {
    backgroundColor: colors.brand.primary,
  },
  modeButtonText: {
    color: colors.neutral.gray200,
    fontSize: 14,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: colors.neutral.white,
  },
  captureButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderColor: colors.neutral.white,
    borderRadius: radii.full,
    borderWidth: 4,
    height: 72,
    justifyContent: 'center',
    marginTop: spacing.lg,
    width: 72,
  },
  captureButtonVideo: {
    backgroundColor: colors.semantic.error,
  },
  captureButtonRecording: {
    transform: [{
      scale: 0.9,
    }],
  },
  captureHint: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
