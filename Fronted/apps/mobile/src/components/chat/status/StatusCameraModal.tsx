import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
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
  Camera,
  RefreshCw,
  CircleStop,
  Image as ImageIcon,
  Video,
  X,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../layout/ScreenSafeArea';

type StatusCameraMode = 'picture' | 'video';

type CapturedStatusMedia = {
  uri: string;
  fileName: string;
  mimeType: string;
  duration: number | null;
};

interface StatusCameraModalProps {
  visible: boolean;
  microphoneGranted: boolean;
  onCapture: (media: CapturedStatusMedia) => void;
  onClose: () => void;
}

const MAX_STATUS_VIDEO_DURATION_SECONDS = 90;

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
  const cameraRef = useRef<CameraView | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const [mode, setMode] = useState<StatusCameraMode>('picture');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      recordingStartedAtRef.current = null;
      setMode('picture');
      setCameraReady(false);
      setCapturing(false);
      setCameraError(null);
      return;
    }

    setCameraError(null);
  }, [visible]);

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

      onCapture({
        uri: recording.uri,
        fileName: getCaptureFileName('video'),
        mimeType: 'video/mp4',
        duration: durationMilliseconds,
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
        <CameraView
          ref={(camera) => {
            cameraRef.current = camera;
          }}
          style={styles.camera}
          facing={facing}
          mode={mode}
          mute={false}
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

        <ScreenSafeArea
          style={styles.overlay}
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

            <Text style={styles.headerTitle}>
              {mode === 'video'
                ? 'Grabar video'
                : 'Tomar foto'}
            </Text>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setFacing((currentFacing) => (
                  currentFacing === 'back'
                    ? 'front'
                    : 'back'
                ));
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
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
