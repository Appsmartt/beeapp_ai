import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  PermissionsAndroid,
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
  confirmCallJoined,
  endCall,
  getCallDetail,
  refreshCallToken,
  type AgoraCallCredentials,
} from '@beeapp/api-client';
import { colors } from '@beeapp/design-system';
import {
  Mic,
  MicOff,
  PhoneOff,
  RotateCw,
  Video as VideoIcon,
  VideoOff,
  Volume2,
} from 'lucide-react-native';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RtcState =
  | 'idle'
  | 'requesting_permissions'
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

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

async function requestRequiredPermissions(
  isVideo: boolean,
): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const requiredPermissions = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ...(isVideo
      ? [PermissionsAndroid.PERMISSIONS.CAMERA]
      : []),
  ];

  const result = await PermissionsAndroid.requestMultiple(
    requiredPermissions,
  );

  const deniedPermissions = requiredPermissions.filter(
    (permission) => (
      result[permission]
      !== PermissionsAndroid.RESULTS.GRANTED
    ),
  );

  if (deniedPermissions.length > 0) {
    throw new Error(
      isVideo
        ? (
            'Debes permitir cámara y micrófono para iniciar '
            + 'la videollamada.'
          )
        : (
            'Debes permitir el micrófono para iniciar '
            + 'la llamada de voz.'
          ),
    );
  }
}

export default function CallScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const engineRef = useRef<IRtcEngine | null>(null);
  const mountedRef = useRef(true);
  const endingRef = useRef(false);
  const joinedRef = useRef(false);

  const callId = getParam(params.callId);
  const actorIdentityId = getParam(params.actorIdentityId);
  const conversationId = getParam(params.conversationId);
  const callType = (
    getParam(params.callType) === 'video'
      ? 'video'
      : 'voice'
  );
  const isVideo = callType === 'video';

  const callerName = (
    getParam(params.name)
    || 'Contacto'
  );

  const [rtcState, setRtcState] = useState<RtcState>('idle');
  const [statusText, setStatusText] = useState(
    'Preparando llamada...',
  );
  const [hasJoinedChannel, setHasJoinedChannel] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(
    null,
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(isVideo);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

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
    const engine = engineRef.current;

    engineRef.current = null;
    joinedRef.current = false;

    if (mountedRef.current) {
      setHasJoinedChannel(false);
    }

    try {
      engine?.leaveChannel();
    } catch {
      // La pantalla debe poder cerrarse aunque Agora falle al salir.
    }

    try {
      engine?.release();
    } catch {
      // La liberación es una limpieza de mejor esfuerzo.
    }

    if (mountedRef.current) {
      setRemoteUid(null);
    }
  }, []);

  const closeCall = useCallback(async (
    options: {
      notifyBackend: boolean;
      statusText: string;
    },
  ) => {
    if (endingRef.current) {
      return;
    }

    endingRef.current = true;
    updateStatus('ending', options.statusText);
    destroyEngine();

    try {
      if (
        options.notifyBackend
        && callId
        && actorIdentityId
      ) {
        const auth = await getValidSessionCredentials();

        if (auth) {
          await endCall(auth, callId, {
            actor_identity_id: actorIdentityId,
          });
        }
      }
    } catch (error) {
      console.warn(
        '[VOX] No fue posible finalizar la llamada en backend.',
        error,
      );
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

    engineRef.current = engine;

    engine.initialize({
      appId: credentials.app_id,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });

    engine.registerEventHandler({
      onJoinChannelSuccess: () => {
        joinedRef.current = true;

        if (mountedRef.current) {
          setHasJoinedChannel(true);
        }

        console.log(
          '[VOX] onJoinChannelSuccess',
          {
            callId,
            channelName: credentials.channel_name,
            uid: credentials.uid,
          },
        );

        updateStatus(
          'connected',
          'Conectado. Esperando al otro participante...',
        );

        void getValidSessionCredentials()
          .then((auth) => {
            if (!auth || !callId || !actorIdentityId) {
              throw new Error(
                'No se pudo confirmar la sesión de llamada.',
              );
            }

            return confirmCallJoined(auth, callId, {
              actor_identity_id: actorIdentityId,
            });
          })
          .then(() => {
            console.log(
              '[VOX] Llamada confirmada en backend.',
              { callId },
            );
          })
          .catch((error) => {
            console.warn(
              '[VOX] No se pudo confirmar llamada en backend.',
              error,
            );
          });
      },

      onUserJoined: (_connection, joinedUid) => {
        console.log(
          '[VOX] onUserJoined',
          {
            callId,
            remoteUid: Number(joinedUid),
          },
        );

        if (!mountedRef.current) {
          return;
        }

        setRemoteUid(Number(joinedUid));
        updateStatus('connected', 'Llamada conectada.');
      },

      onUserOffline: (_connection, offlineUid, reason) => {
        console.log(
          '[VOX] onUserOffline',
          {
            callId,
            remoteUid: Number(offlineUid),
            reason,
          },
        );

        if (!mountedRef.current || endingRef.current) {
          return;
        }

        setRemoteUid(null);

        /*
         * El otro participante abandonó el canal RTC. Cerramos solo
         * localmente: quien colgó ya notificó al backend mediante /end/.
         */
        void closeCall({
          notifyBackend: false,
          statusText: 'El otro participante finalizó la llamada.',
        });
      },

      onTokenPrivilegeWillExpire: () => {
        console.log(
          '[VOX] onTokenPrivilegeWillExpire',
          { callId },
        );

        void getValidSessionCredentials()
          .then((auth) => {
            if (!auth || !callId || !actorIdentityId) {
              throw new Error(
                'No hay sesión activa para renovar el token.',
              );
            }

            return refreshCallToken(auth, callId, {
              actor_identity_id: actorIdentityId,
            });
          })
          .then((response) => {
            engine.renewToken(response.agora.token);

            console.log(
              '[VOX] Token de Agora renovado.',
              { callId },
            );
          })
          .catch((error) => {
            console.warn(
              '[VOX] No se pudo renovar token de Agora.',
              error,
            );

            updateStatus(
              'error',
              'No se pudo renovar la conexión de llamada.',
            );
          });
      },

      onError: (errorCode, message) => {
        console.warn(
          '[VOX] onError',
          {
            callId,
            errorCode,
            message,
          },
        );

        updateStatus(
          'error',
          (
            `Error RTC: ${String(errorCode)} `
            + String(message || '')
          ).trim(),
        );
      },
    });

    engine.enableAudio();
    engine.enableLocalAudio(true);
    engine.muteLocalAudioStream(false);

    if (isVideo) {
      engine.enableVideo();
      engine.enableLocalVideo(true);
      engine.muteLocalVideoStream(false);
      engine.startPreview();
    }

    try {
      engine.setEnableSpeakerphone(isVideo);
    } catch (error) {
      console.warn(
        '[VOX] No se pudo configurar altavoz inicial.',
        error,
      );
    }

    console.log(
      '[VOX] joinChannel',
      {
        callId,
        channelName: credentials.channel_name,
        uid: credentials.uid,
        isVideo,
      },
    );

    engine.joinChannel(
      credentials.token,
      credentials.channel_name,
      credentials.uid,
      {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
        autoSubscribeVideo: isVideo,
      },
    );
  }, [
    actorIdentityId,
    callId,
    isVideo,
    updateStatus,
  ]);

  const initializeCall = useCallback(async () => {
    if (!callId || !actorIdentityId) {
      updateStatus(
        'error',
        (
          'Esta pantalla necesita callId y actorIdentityId. '
          + 'Inicia la llamada desde una conversación de BeeApp.'
        ),
      );
      return;
    }

    try {
      updateStatus(
        'requesting_permissions',
        'Solicitando permiso de micrófono...',
      );

      await requestRequiredPermissions(isVideo);

      if (!mountedRef.current) {
        return;
      }

      updateStatus(
        'connecting',
        'Solicitando credenciales de llamada...',
      );

      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const cachedCredentials = getActiveCallCredentials();

      const credentials = (
        cachedCredentials?.call.id === callId
        && cachedCredentials.participant.identity_id
          === actorIdentityId
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

      updateStatus(
        'connecting',
        'Conectando audio seguro...',
      );

      await connectToAgora(credentials);
    } catch (error) {
      console.warn(
        '[VOX] No fue posible iniciar llamada RTC.',
        error,
      );

      updateStatus(
        'error',
        getErrorMessage(
          error,
          'No fue posible iniciar la llamada.',
        ),
      );
    }
  }, [
    actorIdentityId,
    callId,
    connectToAgora,
    isVideo,
    updateStatus,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    void initializeCall();

    return () => {
      mountedRef.current = false;

      /*
       * closeCall ya destruye el engine antes de navegar.
       * Al desmontar por otra razón, destroyEngine sigue siendo seguro
       * porque limpia engineRef antes de intentar salir del canal.
       */
      destroyEngine();
      clearActiveCallCredentials(callId);
    };
  }, [
    callId,
    destroyEngine,
    initializeCall,
  ]);

  useEffect(() => {
    if (rtcState !== 'connected') {
      return;
    }

    const intervalId = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [rtcState]);

  useEffect(() => {
    if (
      rtcState !== 'connected'
      || !callId
      || !actorIdentityId
    ) {
      return;
    }

    let cancelled = false;

    const terminalStatuses = new Set([
      'ended',
      'cancelled',
      'declined',
      'missed',
      'busy',
    ]);

    const reconcileCallStatus = async () => {
      if (
        cancelled
        || endingRef.current
      ) {
        return;
      }

      try {
        const auth = await getValidSessionCredentials();

        if (!auth || cancelled || endingRef.current) {
          return;
        }

        const detail = await getCallDetail(
          auth,
          callId,
          actorIdentityId,
        );

        const callStatus = String(
          detail.call?.status || '',
        ).trim().toLowerCase();

        console.log('[VOX] Estado remoto de llamada', {
          callId,
          status: callStatus,
        });

        if (
          terminalStatuses.has(callStatus)
          && !cancelled
          && !endingRef.current
        ) {
          void closeCall({
            notifyBackend: false,
            statusText: 'La llamada fue finalizada.',
          });
        }
      } catch (error) {
        /*
         * Una falla temporal de red no debe colgar una llamada activa.
         * Agora continúa funcionando y el próximo ciclo reconciliará el
         * estado cuando vuelva la conexión HTTP.
         */
        console.warn(
          '[VOX] No se pudo consultar estado de llamada.',
          error,
        );
      }
    };

    void reconcileCallStatus();

    const intervalId = setInterval(() => {
      void reconcileCallStatus();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    actorIdentityId,
    callId,
    closeCall,
    rtcState,
  ]);

  const formatTime = (value: number): string => {
    const minutes = Math.floor(value / 60);
    const remainingSeconds = value % 60;

    return (
      `${String(minutes).padStart(2, '0')}:`
      + String(remainingSeconds).padStart(2, '0')
    );
  };

  const toggleMute = () => {
    if (!engineRef.current || rtcState !== 'connected') {
      return;
    }

    const nextMuted = !isMuted;

    engineRef.current.muteLocalAudioStream(nextMuted);
    setIsMuted(nextMuted);

    console.log('[VOX] muteLocalAudioStream', {
      callId,
      muted: nextMuted,
    });
  };

  const toggleSpeaker = () => {
    if (!engineRef.current || rtcState !== 'connected') {
      return;
    }

    const nextSpeakerOn = !isSpeakerOn;

    try {
      engineRef.current.setEnableSpeakerphone(nextSpeakerOn);
      setIsSpeakerOn(nextSpeakerOn);

      console.log('[VOX] setEnableSpeakerphone', {
        callId,
        enabled: nextSpeakerOn,
      });
    } catch (error) {
      console.warn(
        '[VOX] No fue posible cambiar salida de audio.',
        error,
      );
    }
  };

  const toggleVideo = () => {
    if (
      !isVideo
      || !engineRef.current
      || rtcState !== 'connected'
    ) {
      return;
    }

    const nextVideoOff = !isVideoOff;

    engineRef.current.muteLocalVideoStream(nextVideoOff);
    setIsVideoOff(nextVideoOff);

    console.log('[VOX] muteLocalVideoStream', {
      callId,
      muted: nextVideoOff,
    });
  };

  const switchCamera = () => {
    if (
      !isVideo
      || !engineRef.current
      || rtcState !== 'connected'
    ) {
      return;
    }

    try {
      engineRef.current.switchCamera();
    } catch (error) {
      console.warn(
        '[VOX] No fue posible cambiar la cámara.',
        error,
      );
    }
  };

  const handleHangUp = () => {
    void closeCall({
      notifyBackend: true,
      statusText: 'Finalizando llamada...',
    });
  };

  const callIsReady = (
    rtcState === 'connected'
    && hasJoinedChannel
  );

  if (!callId || !actorIdentityId) {
    return (
      <ScreenSafeArea style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>
            Llamada no disponible
          </Text>

          <Text style={styles.errorText}>
            Esta ruta aún no tiene una sesión de llamada creada.
            Inicia la llamada desde una conversación directa de BeeApp.
          </Text>

          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => router.back()}
          >
            <Text style={styles.returnButtonText}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea
      style={[
        styles.container,
        isVideo
          ? styles.videoContainer
          : styles.voiceContainer,
      ]}
    >
      <View style={styles.topMeta}>
        <Text style={styles.statusText}>
          {rtcState === 'connected'
            ? (
                remoteUid === null
                  ? 'Esperando participante...'
                  : `En llamada · ${formatTime(seconds)}`
              )
            : statusText}
        </Text>

        <Text
          style={styles.callIdText}
          numberOfLines={1}
        >
          {conversationId
            ? 'Llamada segura de BeeApp'
            : 'Llamada de BeeApp'}
        </Text>
      </View>

      <View style={styles.mainContent}>
        {isVideo ? (
          <View style={styles.videoArea}>
            {remoteUid !== null ? (
              <RtcSurfaceView
                style={styles.remoteVideo}
                canvas={{
                  uid: remoteUid,
                }}
              />
            ) : (
              <View style={styles.remoteVideoPlaceholder}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {callerName[0]?.toUpperCase() || '?'}
                  </Text>
                </View>

                <Text style={styles.placeholderName}>
                  {callerName}
                </Text>

                <Text style={styles.placeholderText}>
                  Esperando video remoto...
                </Text>
              </View>
            )}

            {!isVideoOff ? (
              <RtcSurfaceView
                style={styles.localVideo}
                canvas={{
                  uid: 0,
                }}
              />
            ) : (
              <View style={styles.localVideoOff}>
                <VideoOff
                  size={22}
                  color={colors.neutral.white}
                />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.voiceArea}>
            <View style={styles.avatarCircleLarge}>
              <Text style={styles.avatarTextLarge}>
                {callerName[0]?.toUpperCase() || '?'}
              </Text>
            </View>

            <Text style={styles.callerName}>
              {callerName}
            </Text>

            <Text style={styles.voiceLabel}>
              {remoteUid === null
                ? 'Conectando con el contacto...'
                : 'Llamada de voz conectada'}
            </Text>
          </View>
        )}

        {rtcState === 'requesting_permissions'
        || rtcState === 'connecting' ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator
              size="small"
              color={colors.neutral.white}
            />

            <Text style={styles.loadingText}>
              {statusText}
            </Text>
          </View>
        ) : null}

        {rtcState === 'error' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardText}>
              {statusText}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            isMuted && styles.controlButtonActive,
          ]}
          onPress={toggleMute}
          disabled={!callIsReady}
          activeOpacity={0.75}
          accessibilityLabel={
            isMuted
              ? 'Activar micrófono'
              : 'Silenciar micrófono'
          }
        >
          {isMuted ? (
            <MicOff
              size={23}
              color={colors.neutral.text}
            />
          ) : (
            <Mic
              size={23}
              color={colors.neutral.white}
            />
          )}
        </TouchableOpacity>

        {isVideo ? (
          <TouchableOpacity
            style={[
              styles.controlButton,
              isVideoOff && styles.controlButtonActive,
            ]}
            onPress={toggleVideo}
            disabled={!callIsReady}
            activeOpacity={0.75}
            accessibilityLabel={
              isVideoOff
                ? 'Activar cámara'
                : 'Apagar cámara'
            }
          >
            {isVideoOff ? (
              <VideoOff
                size={23}
                color={colors.neutral.text}
              />
            ) : (
              <VideoIcon
                size={23}
                color={colors.neutral.white}
              />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.controlButton,
              isSpeakerOn && styles.controlButtonActive,
            ]}
            onPress={toggleSpeaker}
            disabled={!callIsReady}
            activeOpacity={0.75}
            accessibilityLabel={
              isSpeakerOn
                ? 'Desactivar altavoz'
                : 'Activar altavoz'
            }
          >
            <Volume2
              size={23}
              color={
                isSpeakerOn
                  ? colors.neutral.text
                  : colors.neutral.white
              }
            />
          </TouchableOpacity>
        )}

        {isVideo ? (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={switchCamera}
            disabled={!callIsReady}
            activeOpacity={0.75}
            accessibilityLabel="Cambiar cámara"
          >
            <RotateCw
              size={23}
              color={colors.neutral.white}
            />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.hangUpButton}
          onPress={handleHangUp}
          disabled={rtcState === 'ending'}
          activeOpacity={0.8}
          accessibilityLabel="Finalizar llamada"
        >
          <PhoneOff
            size={25}
            color={colors.neutral.white}
          />
        </TouchableOpacity>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  voiceContainer: {
    backgroundColor: '#4C1D95',
  },
  videoContainer: {
    backgroundColor: '#11101E',
  },
  errorContainer: {
    backgroundColor: '#11101E',
    flex: 1,
  },
  errorContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  errorTitle: {
    color: colors.neutral.white,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: colors.neutral.gray300,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    textAlign: 'center',
  },
  returnButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  returnButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '800',
  },
  topMeta: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
  },
  statusText: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  callIdText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  mainContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  voiceArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleLarge: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: 'rgba(255,255,255,0.34)',
    borderRadius: 76,
    borderWidth: 5,
    height: 152,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: 152,
  },
  avatarTextLarge: {
    color: colors.brand.primary,
    fontSize: 58,
    fontWeight: '800',
  },
  callerName: {
    color: colors.neutral.white,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 24,
    textAlign: 'center',
  },
  voiceLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  videoArea: {
    backgroundColor: '#242236',
    borderRadius: 22,
    height: '100%',
    maxHeight: 560,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoPlaceholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: '#5B21B6',
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  avatarText: {
    color: colors.neutral.white,
    fontSize: 32,
    fontWeight: '800',
  },
  placeholderName: {
    color: colors.neutral.white,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 15,
  },
  placeholderText: {
    color: colors.neutral.gray300,
    fontSize: 13,
    marginTop: 7,
  },
  localVideo: {
    backgroundColor: '#171625',
    borderColor: colors.neutral.white,
    borderRadius: 13,
    borderWidth: 2,
    bottom: 14,
    height: 158,
    overflow: 'hidden',
    position: 'absolute',
    right: 14,
    width: Math.min(SCREEN_WIDTH * 0.29, 122),
  },
  localVideoOff: {
    alignItems: 'center',
    backgroundColor: '#302E44',
    borderColor: colors.neutral.white,
    borderRadius: 13,
    borderWidth: 2,
    bottom: 14,
    height: 158,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    width: Math.min(SCREEN_WIDTH * 0.29, 122),
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 24,
  },
  loadingText: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: 'rgba(127, 29, 29, 0.84)',
    borderColor: 'rgba(254, 202, 202, 0.58)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    maxWidth: 430,
    padding: 13,
  },
  errorCardText: {
    color: '#FEE2E2',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  controlsBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 30,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.30)',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    opacity: 1,
    width: 56,
  },
  controlButtonActive: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.white,
  },
  hangUpButton: {
    alignItems: 'center',
    backgroundColor: colors.semantic.error,
    borderRadius: 31,
    elevation: 5,
    height: 62,
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    width: 62,
  },
});
