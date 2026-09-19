import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
} from 'react-native-agora';
import {
  cancelCallJoinAttempt,
  confirmCallJoined,
  endCall,
  refreshCallToken,
  type AgoraCallCredentials,
} from '@beeapp/api-client';
import { colors } from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  clearActiveCallCredentials,
  getActiveCallCredentials,
} from '../../../src/stores/activeCallStore';

type RtcState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'ending'
  | 'ended'
  | 'error';

function getParam(
  value: string | string[] | undefined,
): string {
  return Array.isArray(value)
    ? String(value[0] || '').trim()
    : String(value || '').trim();
}

function safeFailureReason(
  error: unknown,
): string {
  const message = error instanceof Error
    ? error.message
    : 'RTC_JOIN_FAILED';

  return message
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 160);
}

export default function AgoraTestCallScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const engineRef = useRef<IRtcEngine | null>(null);
  const endingRef = useRef(false);
  const mountedRef = useRef(true);

  const [rtcState, setRtcState] = useState<RtcState>('idle');
  const [statusText, setStatusText] = useState(
    'Preparando prueba RTC...',
  );
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const callId = getParam(params.callId);
  const actorIdentityId = getParam(params.actorIdentityId);
  const callType = (
    getParam(params.callType) === 'video'
      ? 'video'
      : 'voice'
  );
  const isVideo = callType === 'video';

  const updateStatus = useCallback((
    nextState: RtcState,
    nextText: string,
  ) => {
    if (!mountedRef.current) {
      return;
    }

    setRtcState(nextState);
    setStatusText(nextText);
  }, []);

  const destroyEngine = useCallback(() => {
    try {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
    } catch {
      // La limpieza local no debe impedir cerrar la pantalla.
    } finally {
      engineRef.current = null;

      if (mountedRef.current) {
        setRemoteUid(null);
      }
    }
  }, []);

  const closeWithCallEnd = useCallback(async () => {
    if (endingRef.current) {
      return;
    }

    endingRef.current = true;
    updateStatus('ending', 'Finalizando llamada...');
    destroyEngine();

    try {
      const auth = await getValidSessionCredentials();

      if (auth && callId && actorIdentityId) {
        await endCall(auth, callId, {
          actor_identity_id: actorIdentityId,
        });
      }
    } catch {
      // La sesión será conciliada por las reglas del backend.
    } finally {
      clearActiveCallCredentials(callId);

      if (mountedRef.current) {
        updateStatus('ended', 'Llamada finalizada.');
        router.back();
      }

      endingRef.current = false;
    }
  }, [
    actorIdentityId,
    callId,
    destroyEngine,
    router,
    updateStatus,
  ]);

  const connectToAgora = useCallback(async (
    credentials: AgoraCallCredentials,
  ) => {
    const engine = createAgoraRtcEngine();

    engine.initialize({
      appId: credentials.app_id,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });

    engine.registerEventHandler({
      onJoinChannelSuccess: () => {
        updateStatus(
          'connected',
          'Conectado a Agora. Confirmando sesión...',
        );

        void getValidSessionCredentials()
          .then((auth) => {
            if (!auth || !callId || !actorIdentityId) {
              throw new Error('No hay sesión activa.');
            }

            return confirmCallJoined(auth, callId, {
              actor_identity_id: actorIdentityId,
            });
          })
          .then(() => {
            updateStatus(
              'connected',
              'Esperando al otro participante...',
            );
          })
          .catch(() => {
            updateStatus(
              'connected',
              'Conectado a Agora; no se pudo confirmar la sesión.',
            );
          });
      },

      onUserJoined: (_connection, joinedUid) => {
        if (!mountedRef.current) {
          return;
        }

        setRemoteUid(Number(joinedUid));
        updateStatus('connected', 'Llamada conectada.');
      },

      onUserOffline: () => {
        if (!mountedRef.current) {
          return;
        }

        setRemoteUid(null);
        updateStatus(
          'connected',
          'El otro participante salió de la llamada.',
        );
      },

      onTokenPrivilegeWillExpire: () => {
        void getValidSessionCredentials()
          .then((auth) => {
            if (!auth || !callId || !actorIdentityId) {
              throw new Error('No hay sesión activa.');
            }

            return refreshCallToken(auth, callId, {
              actor_identity_id: actorIdentityId,
            });
          })
          .then((response) => {
            engine.renewToken(response.agora.token);
          })
          .catch(() => {
            updateStatus(
              'error',
              'No se pudo renovar el token de llamada.',
            );
          });
      },

      onError: (errorCode, message) => {
        updateStatus(
          'error',
          (
            `Error RTC: ${String(errorCode)} `
            + String(message || '')
          ).trim(),
        );
      },
    });

    if (isVideo) {
      engine.enableVideo();
      engine.startPreview();
    } else {
      engine.enableAudio();
    }

    engine.joinChannel(
      credentials.token,
      credentials.channel_name,
      credentials.uid,
      {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      },
    );

    engineRef.current = engine;
  }, [
    actorIdentityId,
    callId,
    isVideo,
    updateStatus,
  ]);

  const initializeRtc = useCallback(async () => {
    if (!callId || !actorIdentityId) {
      updateStatus(
        'error',
        'Faltan datos de llamada para iniciar la prueba.',
      );
      return;
    }

    updateStatus('connecting', 'Solicitando credenciales RTC...');

    try {
      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const cachedCredentials = getActiveCallCredentials();

      const credentials = (
        cachedCredentials?.call.id === callId
        && cachedCredentials.participant.identity_id === actorIdentityId
          ? cachedCredentials.agora
          : (
              await refreshCallToken(auth, callId, {
                actor_identity_id: actorIdentityId,
              })
            ).agora
      );

      if (!mountedRef.current) {
        return;
      }

      updateStatus('connecting', 'Conectando con Agora...');
      await connectToAgora(credentials);
    } catch (error) {
      updateStatus(
        'error',
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar Agora.',
      );

      try {
        const auth = await getValidSessionCredentials();

        if (auth && callId && actorIdentityId) {
          await cancelCallJoinAttempt(auth, callId, {
            actor_identity_id: actorIdentityId,
            failure_reason: safeFailureReason(error),
          });
        }
      } catch {
        // El error original es más útil para la pantalla.
      }
    }
  }, [
    actorIdentityId,
    callId,
    connectToAgora,
    updateStatus,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    void initializeRtc();

    return () => {
      mountedRef.current = false;
      destroyEngine();
      clearActiveCallCredentials(callId);
    };
  }, [
    destroyEngine,
    initializeRtc,
  ]);

  const toggleMute = () => {
    const nextValue = !isMuted;

    engineRef.current?.muteLocalAudioStream(nextValue);
    setIsMuted(nextValue);
  };

  const toggleVideo = () => {
    if (!isVideo) {
      return;
    }

    const nextValue = !isVideoMuted;

    engineRef.current?.muteLocalVideoStream(nextValue);
    setIsVideoMuted(nextValue);
  };

  if (!callId || !actorIdentityId) {
    return (
      <ScreenSafeArea style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            Esta prueba requiere una llamada creada por BeeApp.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Prueba técnica Agora
        </Text>

        <Text style={styles.subtitle}>
          {isVideo ? 'Videollamada' : 'Llamada de voz'} · {callId}
        </Text>

        {rtcState === 'connecting' ? (
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />
        ) : null}

        {isVideo && rtcState === 'connected' ? (
          <View style={styles.videoArea}>
            {remoteUid !== null ? (
              <RtcSurfaceView
                style={styles.remoteVideo}
                canvas={{
                  uid: remoteUid,
                }}
              />
            ) : (
              <View style={styles.waitingVideo}>
                <Text style={styles.waitingText}>
                  Esperando video remoto...
                </Text>
              </View>
            )}

            <RtcSurfaceView
              style={styles.localVideo}
              canvas={{
                uid: 0,
              }}
            />
          </View>
        ) : (
          <View style={styles.voiceState}>
            <Text style={styles.voiceStateText}>
              {remoteUid === null
                ? 'Esperando participante'
                : 'Participante conectado'}
            </Text>
          </View>
        )}

        <Text style={[
          styles.status,
          rtcState === 'error' && styles.errorText,
        ]}>
          {statusText}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleMute}
            disabled={rtcState !== 'connected'}
          >
            <Text style={styles.controlButtonText}>
              {isMuted
                ? 'Activar micrófono'
                : 'Silenciar micrófono'}
            </Text>
          </TouchableOpacity>

          {isVideo ? (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleVideo}
              disabled={rtcState !== 'connected'}
            >
              <Text style={styles.controlButtonText}>
                {isVideoMuted
                  ? 'Activar cámara'
                  : 'Apagar cámara'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.endButton}
            onPress={() => {
              void closeWithCallEnd();
            }}
            disabled={rtcState === 'ending'}
          >
            <Text style={styles.endButtonText}>
              Finalizar prueba
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Plataforma: {Platform.OS}. Prueba temporal para validar unión RTC,
          confirmación backend y renovación de token.
        </Text>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#11101E',
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 18,
    padding: 20,
  },
  title: {
    color: colors.neutral.white,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.neutral.gray300,
    fontSize: 12,
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 20,
    justifyContent: 'center',
    padding: 24,
  },
  status: {
    color: colors.neutral.white,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#FCA5A5',
  },
  voiceState: {
    alignItems: 'center',
    backgroundColor: '#242236',
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    minHeight: 220,
  },
  voiceStateText: {
    color: colors.neutral.white,
    fontSize: 17,
    fontWeight: '700',
  },
  videoArea: {
    backgroundColor: '#242236',
    borderRadius: 20,
    flex: 1,
    minHeight: 280,
    overflow: 'hidden',
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
  },
  waitingVideo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  waitingText: {
    color: colors.neutral.gray300,
    fontSize: 14,
  },
  localVideo: {
    bottom: 14,
    height: 150,
    position: 'absolute',
    right: 14,
    width: 104,
  },
  controls: {
    gap: 10,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: '#403C5F',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
  },
  controlButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
  endButton: {
    alignItems: 'center',
    backgroundColor: colors.semantic.error,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
  },
  endButtonText: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '800',
  },
  note: {
    color: colors.neutral.gray400,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
