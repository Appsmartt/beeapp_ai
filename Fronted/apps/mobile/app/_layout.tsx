import {
  useEffect,
  useRef,
} from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppLockScreen from '../src/components/security/AppLockScreen';
import {
  registerCurrentDeviceForPushNotifications,
} from '../src/services/pushNotifications';

function getNotificationData(
  response: Notifications.NotificationResponse,
): Record<string, unknown> {
  const data = response.notification.request.content.data;

  return (
    data
    && typeof data === 'object'
    && !Array.isArray(data)
  )
    ? data as Record<string, unknown>
    : {};
}

function AppPushNotifications() {
  const router = useRouter();
  const handledResponseIds = useRef(new Set<string>());

  useEffect(() => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      void registerCurrentDeviceForPushNotifications();
    }
  }, []);

  useEffect(() => {
    const openNotificationTarget = (
      response: Notifications.NotificationResponse,
    ) => {
      const responseId = String(
        response.notification.request.identifier || '',
      ).trim();

      if (
        responseId
        && handledResponseIds.current.has(responseId)
      ) {
        return;
      }

      if (responseId) {
        handledResponseIds.current.add(responseId);
      }

      const data = getNotificationData(response);
      const module = String(data.module || '').trim();
      const messageId = String(data.message_id || '').trim();

      if (module === 'mail' && messageId) {
        router.push({
          pathname: '/(main)/mail/detail',
          params: {
            id: messageId,
          },
        });
      }
    };

    const responseSubscription = (
      Notifications.addNotificationResponseReceivedListener(
        openNotificationTarget,
      )
    );

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          openNotificationTarget(response);
        }
      })
      .catch(() => {
        // Si no se puede leer la respuesta inicial, la app continúa normal.
      });

    return () => {
      responseSubscription.remove();
    };
  }, [router]);

  return null;
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