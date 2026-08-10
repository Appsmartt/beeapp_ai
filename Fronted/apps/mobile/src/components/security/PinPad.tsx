
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Delete, Lock, CheckCircle2 } from 'lucide-react-native';
import { PIN_LENGTH } from '../../stores/pinStore';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

interface PinPadProps {
  title: string;
  subtitle?: string;
  /** Called with the full code once every digit is entered */
  onComplete: (pin: string) => void;
  /** Error message: shakes the dots and paints them red */
  error?: string | null;
  /** Success message: paints the dots green */
  success?: string | null;
  /** Number of digits (4 for the PIN, 6 for the recovery code) */
  length?: number;
  footer?: React.ReactNode;
}

/**
 * Reusable numeric code pad used to create, confirm, validate and unlock.
 * Keeps its own draft value and clears it whenever an error arrives.
 */
export default function PinPad({
  title,
  subtitle,
  onComplete,
  error,
  success,
  length = PIN_LENGTH,
  footer,
}: PinPadProps) {
  const [value, setValue] = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  // On error: shake the dots and clear the draft so the user can retry
  useEffect(() => {
    if (!error) return;
    setValue('');
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [error]);

  useEffect(() => {
    if (success) setValue('');
  }, [success]);

  const press = (key: string) => {
    if (key === '') return;
    if (key === 'del') {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (value.length >= length) return;
    const next = value + key;
    setValue(next);
    if (next.length === length) {
      // Small delay so the last dot is visible before the result
      setTimeout(() => onComplete(next), 120);
    }
  };

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

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

      {/* Dots */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX }] }]}>
        {Array.from({ length }).map((_, i) => {
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
        {KEYS.map((key, idx) => (
          <TouchableOpacity
            key={`${key}-${idx}`}
            style={[styles.key, key === '' && styles.keyEmpty]}
            onPress={() => press(key)}
            activeOpacity={key === '' ? 1 : 0.6}
            disabled={key === ''}
          >
            {key === 'del' ? (
              <Delete size={22} color={colors.neutral.gray700} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {footer}
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
    fontWeight: '400',
  },
  feedbackSuccess: {
    color: colors.semantic.success,
    fontWeight: '400',
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
  keyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.neutral.text,
  },
});
