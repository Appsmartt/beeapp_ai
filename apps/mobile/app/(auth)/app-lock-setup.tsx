import React from 'react';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { View, StyleSheet } from 'react-native';
import AppLockSetupScreen from '../../src/components/security/AppLockSetupScreen';

export default function AppLockSetupRoute() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace('/onboarding');
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <AppLockSetupScreen onComplete={handleComplete} />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
});
