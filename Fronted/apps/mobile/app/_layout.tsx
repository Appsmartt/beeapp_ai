import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import {
  Stack,
  useRouter,
} from 'expo-router';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  resetUnauthorizedRequestNotification,
  subscribeUnauthorizedRequest,
} from '@beeapp/api-client';

import AppLockScreen from '../src/components/security/AppLockScreen';
import IncomingCallModal from '../src/components/chat/IncomingCallModal';
import {
  getPrivateChatIdentityId,
} from '../src/hooks/useChat';
import {
  registerCurrentDeviceForPushNotifications,
} from '../src/services/pushNotifications';
import {
  clearAuthSession,
  getAuthSession,
  validateStoredAuthSession,
} from '../src/services/authSession';
import {
  clearIncomingCall,
  getIncomingCall,
  setIncomingCall,
  subscribeIncomingCall,
  type IncomingCall,
} from '../src/stores/incomingCallStore';
import {
  parseChatPushEvent,
  getChatPushConversationId,
} from '../src/services/chatPushEvents';
import {
  applyChatRealtimeEvent,
} from '../src/stores/chatStore';
import {
  startChatRealtime,
  stopChatRealtime,
} from '../src/services/chatRealtime';

function getNotificationData(
  notification: Notifications.Notification,
): Record<string, unknown> {
  const data = notification.request.content.data;

  return (
    data
    && typeof data === 'object'
    && !Array.isArray(data)
  )
    ? data as Record<string, unknown>
    : {};
}

function isSessionRevokedPush(
  data: Record<string, unknown>,
  deviceSessionId: string | null,
): boolean {
  if (
    String(data.type || '').trim() !== 'session_revoked'
    || !deviceSessionId
  ) {
    return false;
  }

  const revokedSessionIds = data.revoked_device_session_ids;

  if (!Array.isArray(revokedSessionIds)) {
    return false;
  }

  return revokedSessionIds.some(
    (value) => String(value).trim() === deviceSessionId,
  );
}

function getIncomingCallFromData(
  data: Record<string, unknown>,
): IncomingCall | null {
  const module = String(data.module || '').trim();
  const type = String(data.type || '').trim();
  const callId = String(data.call_id || '').trim();
  const conversationId = String(
    data.conversation_id || '',
  ).trim();
  const callType = String(data.call_type || '').trim();
  const callerIdentityId = String(
    data.caller_identity_id || '',
  ).trim();
  const callerName = String(
    data.caller_name || '',
  ).trim();

  if (
    module !== 'calls'
    || type !== 'incoming_call'
    || !callId
    || !conversationId
    || !callerIdentityId
    || (
      callType !== 'voice'
      && callType !== 'video'
    )
  ) {
    return null;
  }

  return {
    callId,
    conversationId,
    callType,
    callerIdentityId,
    callerName: callerName || 'Un contacto',
    receivedAt: Date.now(),
  };
}

const SESSION_REVOKED_MODAL_MS = 6_000;

function SessionRevocationHandler() {
  const router = useRouter();
  const handlingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(
    AppState.currentState,
  );
  const [showRevokedModal, setShowRevokedModal] = useState(
    false,
  );

  const closeRevokedSession = useCallback(() => {
    if (handlingRef.current) {
      return;
    }

    handlingRef.current = true;

    void clearAuthSession()
      .catch(() => {
        // Aunque falle la limpieza local, se debe salir del área privada.
      })
      .finally(() => {
        if (appStateRef.current !== 'active') {
          router.replace('/(auth)/login');
          return;
        }

        setShowRevokedModal(true);
      });
  }, [router]);

  const validateSession = useCallback(async () => {
    if (handlingRef.current) {
      return;
    }

    const result = await validateStoredAuthSession();

    if (result === 'revoked') {
      closeRevokedSession();
    }
  }, [closeRevokedSession]);

  useEffect(() => {
    if (!showRevokedModal) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setShowRevokedModal(false);
      router.replace('/(auth)/login');
    }, SESSION_REVOKED_MODAL_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [router, showRevokedModal]);

  useEffect(() => {
    resetUnauthorizedRequestNotification();
    handlingRef.current = false;

    void validateSession();

    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        const wasActive = appStateRef.current === 'active';

        appStateRef.current = nextAppState;

        if (!wasActive && nextAppState === 'active') {
          void validateSession();
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [validateSession]);

  useEffect(() => {
    return subscribeUnauthorizedRequest(() => {
      closeRevokedSession();
    });
  }, [closeRevokedSession]);

  useEffect(() => {
    const handleSessionRevokedPush = async (
      notification: Notifications.Notification,
    ) => {
      const authSession = await getAuthSession();

      if (
        isSessionRevokedPush(
          getNotificationData(notification),
          authSession?.deviceSessionId ?? null,
        )
      ) {
        closeRevokedSession();
      }
    };

    const receivedSubscription = (
      Notifications.addNotificationReceivedListener(
        handleSessionRevokedPush,
      )
    );

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          void handleSessionRevokedPush(
            response.notification,
          );
        }
      })
      .catch(() => {
        // La comprobación al abrir o volver a foreground sigue disponible.
      });

    return () => {
      receivedSubscription.remove();
    };
  }, [closeRevokedSession]);

  if (!showRevokedModal) {
    return null;
  }

  return (
    <View
      pointerEvents="auto"
      style={sessionRevokedStyles.backdrop}
    >
      <View style={sessionRevokedStyles.card}>
        <View style={sessionRevokedStyles.iconWrap}>
          <Text style={sessionRevokedStyles.icon}>🔒</Text>
        </View>

        <Text style={sessionRevokedStyles.title}>
          Sesión cerrada
        </Text>

        <Text style={sessionRevokedStyles.description}>
          Tu cuenta se inició en otro dispositivo. Por seguridad,
          cerramos esta sesión.
        </Text>

        <View style={sessionRevokedStyles.loadingRow}>
          <ActivityIndicator
            color="#6025D2"
            size="small"
          />
          <Text style={sessionRevokedStyles.loadingText}>
            Redirigiendo al inicio de sesión…
          </Text>
        </View>

        <View style={sessionRevokedStyles.progressTrack}>
          <View style={sessionRevokedStyles.progressFill} />
        </View>
      </View>
    </View>
  );
}

const sessionRevokedStyles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 10, 45, 0.72)',
    bottom: 0,
    elevation: 999,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 28,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 999,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(96, 37, 210, 0.12)',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 12,
    maxWidth: 390,
    paddingHorizontal: 28,
    paddingVertical: 30,
    shadowColor: '#1B0B3A',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#F0EAFF',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginBottom: 18,
    width: 72,
  },
  icon: {
    fontSize: 31,
  },
  title: {
    color: '#24114A',
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  description: {
    color: '#685D7D',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  loadingText: {
    color: '#6025D2',
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    backgroundColor: '#EEE7FF',
    borderRadius: 3,
    height: 6,
    marginTop: 22,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#6025D2',
    borderRadius: 3,
    height: '100%',
    width: '100%',
  },
});

function AppPushNotifications() {
  const router = useRouter();

  const [incomingCall, setIncomingCallState] = useState<
    IncomingCall | null
  >(() => getIncomingCall());

  const [privateIdentityId, setPrivateIdentityId] = useState<
    string | null
  >(null);

  const [identityLoading, setIdentityLoading] = useState(true);

  const authContextRefreshRef = useRef<
    Promise<void> | null
  >(null);

  const refreshAuthenticatedCallContext = useCallback(
    async (): Promise<void> => {
      if (authContextRefreshRef.current) {
        return authContextRefreshRef.current;
      }

      const refreshPromise = (async () => {
        setIdentityLoading(true);

        try {
          const identityId = await getPrivateChatIdentityId();

          setPrivateIdentityId(identityId);
        } catch {
          setPrivateIdentityId(null);
        } finally {
          setIdentityLoading(false);
        }

        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          await registerCurrentDeviceForPushNotifications();
        }

        await startChatRealtime();
      })();

      authContextRefreshRef.current = refreshPromise;

      try {
        await refreshPromise;
      } finally {
        authContextRefreshRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    return subscribeIncomingCall(() => {
      setIncomingCallState(getIncomingCall());
    });
  }, []);

  useEffect(() => {
    void refreshAuthenticatedCallContext();

    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          void refreshAuthenticatedCallContext();
        }
      },
    );

    return () => {
      appStateSubscription.remove();
      void stopChatRealtime();
    };
  }, [refreshAuthenticatedCallContext]);

  useEffect(() => {
    const handleNotification = (
      notification: Notifications.Notification,
    ) => {
      const notificationData = getNotificationData(
        notification,
      );

      const chatEvent = parseChatPushEvent(
        notificationData,
      );

      if (chatEvent) {
        applyChatRealtimeEvent(chatEvent);
      }

      const incoming = getIncomingCallFromData(
        notificationData,
      );

      if (incoming) {
        void refreshAuthenticatedCallContext();
        setIncomingCall(incoming);
      }
    };

    const handleNotificationResponse = (
      response: Notifications.NotificationResponse,
    ) => {
      const data = getNotificationData(
        response.notification,
      );

      const chatEvent = parseChatPushEvent(data);

      if (chatEvent) {
        applyChatRealtimeEvent(chatEvent);
      }

      const chatConversationId = getChatPushConversationId(
        data,
      );

      if (chatConversationId) {
        router.push({
          pathname: '/(main)/chat/conversation',
          params: {
            id: chatConversationId,
          },
        });
        return;
      }

      const incoming = getIncomingCallFromData(data);

      if (incoming) {
        void refreshAuthenticatedCallContext();
        setIncomingCall(incoming);
        return;
      }

      const module = String(data.module || '').trim();
      const messageId = String(
        data.message_id || '',
      ).trim();

      if (module === 'mail' && messageId) {
        router.push({
          pathname: '/(main)/mail/detail',
          params: {
            id: messageId,
          },
        });
      }
    };

    const receivedSubscription = (
      Notifications.addNotificationReceivedListener(
        handleNotification,
      )
    );

    const responseSubscription = (
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      )
    );

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response);
        }
      })
      .catch(() => {
        // Si no se puede leer la respuesta inicial, la app continúa normal.
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [
    refreshAuthenticatedCallContext,
    router,
  ]);

  return (
    <IncomingCallModal
      call={incomingCall}
      actorIdentityId={privateIdentityId}
      identityLoading={identityLoading}
      onClose={(callId) => {
        clearIncomingCall(callId);
      }}
      onAccepted={(call) => {
        clearIncomingCall(call.callId);

        router.push({
          pathname: '/(main)/chat/call',
          params: {
            callId: call.callId,
            conversationId: call.conversationId,
            actorIdentityId: privateIdentityId || '',
            callType: call.callType,
          },
        });
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionRevocationHandler />
        <AppPushNotifications />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#6025d2' },
          }}
        />

        <AppLockScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
