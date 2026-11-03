import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
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

  const label = loading
    ? 'Verificando identidad...'
    : title ?? defaultTitle;

  return (
    <Pressable
      accessibilityHint="Abre el lector biométrico del teléfono"
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{
        busy: loading,
        disabled: loading,
      }}
      disabled={loading}
      hitSlop={12}
      android_ripple={
        loading
          ? undefined
          : {
              borderless: true,
              color: `${colors.brand.primary}22`,
              radius: 52,
            }
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && !loading && styles.containerPressed,
      ]}
    >
      <View
        style={[
          styles.button,
          loading && styles.buttonLoading,
        ]}
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
      </View>

      <Text style={styles.title}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  containerPressed: {
    opacity: 0.88,
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