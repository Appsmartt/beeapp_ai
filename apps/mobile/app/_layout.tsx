import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppLockScreen from '../src/components/security/AppLockScreen';

export default function RootLayout() {
  return (
    // Root for gesture-driven UI (e.g. drag & drop in the Home customizer)
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Provides the device insets (status bar, notch) to every screen */}
      <SafeAreaProvider>
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
