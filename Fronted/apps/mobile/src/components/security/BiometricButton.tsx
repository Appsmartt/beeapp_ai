import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Fingerprint,
  ScanFace,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import type {
  AppLockMethod,
} from '../../stores/appLockStore';

type BiometricButtonProps = {
  method: Extract<
    AppLockMethod,
    'fingerprint' | 'faceid'
  >;
  onPress: () => void;
  loading?: boolean;
  title?: string;
};

export default function BiometricButton({
  method,
  onPress,
  loading = false,
  title,
}: BiometricButtonProps) {
  const isFaceId = method === 'faceid';
  const Icon = isFaceId ? ScanFace : Fingerprint;

  const defaultTitle = isFaceId
    ? 'Toca para desbloquear con Face ID'
    : 'Toca para desbloquear con tu huella';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.buttonLoading,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />
        ) : (
          <Icon
            size={44}
            color={colors.brand.primary}
          />
        )}
      </TouchableOpacity>

      <Text style={styles.title}>
        {loading
          ? 'Verificando identidad...'
          : title ?? defaultTitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.primary}10`,
    borderColor: `${colors.brand.primary}30`,
    borderRadius: 45,
    borderWidth: 1.5,
    height: 90,
    justifyContent: 'center',
    marginBottom: 16,
    width: 90,
  },
  buttonLoading: {
    borderColor: colors.brand.primary,
  },
  title: {
    color: colors.neutral.gray600,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
  },
});