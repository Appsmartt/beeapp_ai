import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Phone,
  PhoneOff,
  Video,
} from 'lucide-react-native';
import {
  declineCall,
  getCallDetail,
  joinCall,
} from '@beeapp/api-client';
import { colors } from '@beeapp/design-system';

import {
  getValidSessionCredentials,
} from '../../services/authSession';
import {
  setActiveCallCredentials,
} from '../../stores/activeCallStore';
import type {
  IncomingCall,
} from '../../stores/incomingCallStore';

interface IncomingCallModalProps {
  call: IncomingCall | null;
  actorIdentityId: string | null;
  identityLoading: boolean;
  onClose: (
    callId?: string,
  ) => void;
  onAccepted: (
    call: IncomingCall,
  ) => void;
}

function isJoinableStatus(
  status: unknown,
): boolean {
  return status === 'ringing' || status === 'active';
}

export default function IncomingCallModal({
  call,
  actorIdentityId,
  identityLoading,
  onClose,
  onAccepted,
}: IncomingCallModalProps) {
  const [action, setAction] = useState<
    'accepting' | 'declining' | null
  >(null);

  useEffect(() => {
    setAction(null);
  }, [call?.callId]);

  const closeUnavailableCall = () => {
    onClose(call?.callId);
  };

  const handleAccept = async () => {
    if (!call || !actorIdentityId || action) {
      return;
    }

    try {
      setAction('accepting');

      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const detail = await getCallDetail(
        auth,
        call.callId,
        actorIdentityId,
      );

      if (!isJoinableStatus(detail.call?.status)) {
        onClose(call.callId);
        return;
      }

      const credentials = await joinCall(
        auth,
        call.callId,
        {
          actor_identity_id: actorIdentityId,
        },
      );

      setActiveCallCredentials(credentials);
      onAccepted(call);
    } catch {
      /*
       * Una llamada puede terminar, expirar o ser rechazada mientras el
       * receptor ve el popup. Cerramos el aviso para no dejar una acción
       * inválida visible; el usuario podrá ver el evento en el historial.
       */
      closeUnavailableCall();
    } finally {
      setAction(null);
    }
  };

  const handleDecline = async () => {
    if (!call || !actorIdentityId || action) {
      return;
    }

    try {
      setAction('declining');

      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      await declineCall(
        auth,
        call.callId,
        {
          actor_identity_id: actorIdentityId,
        },
      );
    } catch {
      /*
       * Si el backend ya cambió el estado, de todos modos quitamos la UI
       * porque la llamada deja de ser accionable desde este dispositivo.
       */
    } finally {
      onClose(call.callId);
      setAction(null);
    }
  };

  const isVideo = call?.callType === 'video';
  const busy = action !== null;
  const identityUnavailable = (
    !identityLoading
    && !actorIdentityId
  );
  const actionsDisabled = (
    busy
    || identityLoading
    || identityUnavailable
  );
  const callerName = call?.callerName || 'Un contacto';

  return (
    <Modal
      visible={Boolean(call)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeUnavailableCall}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.handle} />

          <View style={styles.iconCircle}>
            {isVideo ? (
              <Video
                size={30}
                color={colors.neutral.white}
              />
            ) : (
              <Phone
                size={30}
                color={colors.neutral.white}
              />
            )}
          </View>

          <Text style={styles.eyebrow}>
            Llamada entrante
          </Text>

          <Text
            style={styles.callerName}
            numberOfLines={2}
          >
            {callerName}
          </Text>

          <Text style={styles.callType}>
            {isVideo
              ? 'Videollamada de BeeApp'
              : 'Llamada de voz de BeeApp'}
          </Text>

          <Text style={styles.ringingText}>
            {identityLoading
              ? 'Preparando tus datos de llamada…'
              : identityUnavailable
                ? 'No se pudo preparar tu sesión de llamada.'
                : 'Esperando tu respuesta…'}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.declineButton,
                actionsDisabled && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleDecline();
              }}
              disabled={actionsDisabled}
              activeOpacity={0.8}
              accessibilityLabel="Rechazar llamada"
            >
              {action === 'declining' ? (
                <ActivityIndicator
                  color={colors.neutral.white}
                />
              ) : (
                <PhoneOff
                  size={23}
                  color={colors.neutral.white}
                />
              )}

              <Text style={styles.actionText}>
                Rechazar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.acceptButton,
                actionsDisabled && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleAccept();
              }}
              disabled={actionsDisabled}
              activeOpacity={0.8}
              accessibilityLabel="Contestar llamada"
            >
              {action === 'accepting' ? (
                <ActivityIndicator
                  color={colors.neutral.white}
                />
              ) : (
                <Phone
                  size={23}
                  color={colors.neutral.white}
                />
              )}

              <Text style={styles.actionText}>
                Contestar
              </Text>
            </TouchableOpacity>
          </View>

          {identityUnavailable ? (
            <TouchableOpacity
              style={styles.closeUnavailableButton}
              onPress={closeUnavailableCall}
              accessibilityLabel="Cerrar aviso de llamada"
            >
              <Text style={styles.closeUnavailableText}>
                Cerrar
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.note}>
            Puedes responder desde cualquier sección de BeeApp.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 16, 30, 0.62)',
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 28,
    elevation: 16,
    maxWidth: 440,
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    width: '100%',
  },
  handle: {
    backgroundColor: colors.neutral.gray300,
    borderRadius: 4,
    height: 4,
    marginBottom: 20,
    width: 42,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  eyebrow: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  callerName: {
    color: colors.neutral.text,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 7,
    textAlign: 'center',
  },
  callType: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  ringingText: {
    color: colors.neutral.gray500,
    fontSize: 12,
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 82,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  declineButton: {
    backgroundColor: colors.semantic.error,
  },
  acceptButton: {
    backgroundColor: '#16A34A',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 7,
  },
  closeUnavailableButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeUnavailableText: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  note: {
    color: colors.neutral.gray500,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 17,
    textAlign: 'center',
  },
});
