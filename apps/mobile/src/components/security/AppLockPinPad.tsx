import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Delete, Lock, CheckCircle2, Fingerprint, ScanFace } from 'lucide-react-native';
import { APP_LOCK_PIN_LENGTH } from '../../stores/appLockStore';

interface AppLockPinPadProps {
  title: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  error?: string | null;
  success?: string | null;
  biometricMethod?: 'fingerprint' | 'faceid' | null;
  onBiometricPress?: () => void;
}

export default function AppLockPinPad({
  title,
  subtitle,
  onComplete,
  error,
  success,
  biometricMethod,
  onBiometricPress,
}: AppLockPinPadProps) {
  const [value, setValue] = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    setValue('');
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [error, shake]);

  useEffect(() => {
    if (success) setValue('');
  }, [success]);

  const press = (key: string) => {
    if (key === 'del') {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (key === 'bio') {
      if (onBiometricPress) onBiometricPress();
      return;
    }
    if (value.length >= APP_LOCK_PIN_LENGTH) return;
    const next = value + key;
    setValue(next);
    if (next.length === APP_LOCK_PIN_LENGTH) {
      setTimeout(() => onComplete(next), 120);
    }
  };

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  // Generate keypad layout: bottom left has bio button if configured
  const BiometricIcon = biometricMethod === 'faceid' ? ScanFace : Fingerprint;
  const showBioButton = !!biometricMethod && !!onBiometricPress;

  const KEYS = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    showBioButton ? 'bio' : '', '0', 'del'
  ];

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, !!success && styles.iconCircleSuccess, !!error && styles.iconCircleError]}>
        {success ? (
          <CheckCircle2 size={22} color={colors.semantic.success} />
        ) : (
          <Lock size={22} color={error ? colors.semantic.error : colors.brand.primary} />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* Dots (6 digits) */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX }] }]}>
        {Array.from({ length: APP_LOCK_PIN_LENGTH }).map((_, i) => {
          const filled = i < value.length;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                !!error && styles.dotError,
                !!success && styles.dotSuccess,
              ]}
            />
          );
        })}
      </Animated.View>

      <Text style={[styles.feedback, !!error && styles.feedbackError, !!success && styles.feedbackSuccess]}>
        {error || success || ' '}
      </Text>

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map((key, idx) => {
          if (key === '') {
            return <View key={`empty-${idx}`} style={styles.keyEmpty} />;
          }

          return (
            <TouchableOpacity
              key={`${key}-${idx}`}
              style={[styles.key, key === 'bio' && styles.keyBio]}
              onPress={() => press(key)}
              activeOpacity={0.6}
            >
              {key === 'del' ? (
                <Delete size={22} color={colors.neutral.gray700} />
              ) : key === 'bio' ? (
                <BiometricIcon size={22} color={colors.brand.primary} />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircleError: {
    backgroundColor: colors.semantic.error + '15',
  },
  iconCircleSuccess: {
    backgroundColor: colors.semantic.success + '15',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 20,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.neutral.gray300,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  dotError: {
    borderColor: colors.semantic.error,
  },
  dotSuccess: {
    borderColor: colors.semantic.success,
  },
  feedback: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 12,
    minHeight: 18,
    textAlign: 'center',
  },
  feedbackError: {
    color: colors.semantic.error,
  },
  feedbackSuccess: {
    color: colors.semantic.success,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 260,
    marginTop: 8,
  },
  key: {
    width: 72,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  keyBio: {
    backgroundColor: colors.brand.primary + '10',
    borderColor: colors.brand.primary + '30',
  },
  keyEmpty: {
    width: 72,
    height: 58,
    margin: 4,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.neutral.text,
  },
});
