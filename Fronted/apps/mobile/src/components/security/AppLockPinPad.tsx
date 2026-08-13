import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  Delete,
  Fingerprint,
  Lock,
  ScanFace,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import {
  APP_LOCK_PIN_LENGTH,
} from '../../stores/appLockStore';

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
    if (!error) {
      return;
    }

    setValue('');

    Animated.sequence([
      Animated.timing(shake, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [error, shake]);

  useEffect(() => {
    if (success) {
      setValue('');
    }
  }, [success]);

  const press = (key: string) => {
    if (key === 'del') {
      setValue((currentValue) => currentValue.slice(0, -1));
      return;
    }

    if (key === 'bio') {
      onBiometricPress?.();
      return;
    }

    if (value.length >= APP_LOCK_PIN_LENGTH) {
      return;
    }

    const nextValue = value + key;

    setValue(nextValue);

    if (nextValue.length === APP_LOCK_PIN_LENGTH) {
      setTimeout(() => {
        onComplete(nextValue);
      }, 120);
    }
  };

  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  const BiometricIcon =
    biometricMethod === 'faceid'
      ? ScanFace
      : Fingerprint;

  const showBioButton = Boolean(
    biometricMethod && onBiometricPress,
  );

  const keys = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    showBioButton ? 'bio' : '',
    '0',
    'del',
  ];

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.iconCircle,
          Boolean(success) && styles.iconCircleSuccess,
          Boolean(error) && styles.iconCircleError,
        ]}
      >
        {success ? (
          <CheckCircle2
            size={22}
            color={colors.semantic.success}
          />
        ) : (
          <Lock
            size={22}
            color={
              error
                ? colors.semantic.error
                : colors.brand.primary
            }
          />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}

      <Animated.View
        style={[
          styles.dotsRow,
          {
            transform: [
              {
                translateX,
              },
            ],
          },
        ]}
      >
        {Array.from({
          length: APP_LOCK_PIN_LENGTH,
        }).map((_, index) => {
          const filled = index < value.length;

          return (
            <View
              key={index}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                Boolean(error) && styles.dotError,
                Boolean(success) && styles.dotSuccess,
              ]}
            />
          );
        })}
      </Animated.View>

      <Text
        style={[
          styles.feedback,
          Boolean(error) && styles.feedbackError,
          Boolean(success) && styles.feedbackSuccess,
        ]}
      >
        {error || success || ' '}
      </Text>

      <View style={styles.keypad}>
        {keys.map((key, index) => {
          if (!key) {
            return (
              <View
                key={`empty-${index}`}
                style={styles.keyEmpty}
              />
            );
          }

          return (
            <TouchableOpacity
              key={`${key}-${index}`}
              style={[
                styles.key,
                key === 'bio' && styles.keyBio,
              ]}
              onPress={() => press(key)}
              activeOpacity={0.6}
            >
              {key === 'del' ? (
                <Delete
                  size={22}
                  color={colors.neutral.gray700}
                />
              ) : key === 'bio' ? (
                <BiometricIcon
                  size={22}
                  color={colors.brand.primary}
                />
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
    alignItems: 'center',
    backgroundColor: `${colors.brand.primary}15`,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
    width: 48,
  },
  iconCircleError: {
    backgroundColor: `${colors.semantic.error}15`,
  },
  iconCircleSuccess: {
    backgroundColor: `${colors.semantic.success}15`,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 6,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 20,
  },
  dot: {
    backgroundColor: 'transparent',
    borderColor: colors.neutral.gray300,
    borderRadius: 7,
    borderWidth: 1.5,
    height: 14,
    width: 14,
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
    color: colors.neutral.gray600,
    fontSize: 12,
    fontWeight: '400',
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
    marginTop: 8,
    maxWidth: 260,
  },
  key: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    margin: 4,
    width: 72,
  },
  keyBio: {
    backgroundColor: `${colors.brand.primary}10`,
    borderColor: `${colors.brand.primary}30`,
  },
  keyEmpty: {
    height: 58,
    margin: 4,
    width: 72,
  },
  keyText: {
    color: colors.neutral.text,
    fontSize: 22,
    fontWeight: '400',
  },
});