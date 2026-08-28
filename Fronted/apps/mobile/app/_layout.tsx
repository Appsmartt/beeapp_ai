import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Platform,
  type AppStateStatus,
} from 'react-native';
import {
  Stack,
  useRouter,
} from 'expo-router';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppLockScreen from '../src/components/security/AppLockScreen';
import IncomingCallModal from '../src/components/chat/IncomingCallModal';
import {
  getPrivateChatIdentityId,
} from '../src/hooks/useChat';
import {
  registerCurrentDeviceForPushNotifications,
} from '../src/services/pushNotifications';
import {
  clearIncomingCall,
  getIncomingCall,
  setIncomingCall,
  subscribeIncomingCall,
  type IncomingCall,
} from '../src/stores/incomingCallStore';

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
    };
  }, [refreshAuthenticatedCallContext]);

  useEffect(() => {
    const handleNotification = (
      notification: Notifications.Notification,
    ) => {
      const incoming = getIncomingCallFromData(
        getNotificationData(notification),
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
          pathname: '/(main)/chat/agora-test-call',
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
