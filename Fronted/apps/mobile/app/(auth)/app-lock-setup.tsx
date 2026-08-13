import {
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';

import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import AppLockSetupScreen from '../../src/components/security/AppLockSetupScreen';

export default function AppLockSetupRoute() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace('/onboarding');
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <AppLockSetupScreen
          onComplete={handleComplete}
        />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  container: {
    flex: 1,
  },
});