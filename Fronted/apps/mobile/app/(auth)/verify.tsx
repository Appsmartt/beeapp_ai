import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  requestPhoneOtp,
  verifyPhoneOtpMobile,
} from '@beeapp/api-client';

import BuddyLogo from '../../src/components/BuddyLogo';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import {
  saveAuthSession,
} from '../../src/services/authSession';


const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;


function getStringParam(
  value: string | string[] | undefined,
  fallback = '',
): string {
  if (Array.isArray(value)) {
    return value[0] || fallback;
  }

  return value || fallback;
}


function createEmptyCode(): string[] {
  return Array.from(
    {
      length: OTP_LENGTH,
    },
    () => '',
  );
}


export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const phone = getStringParam(params.phone);
  const phoneNumber = getStringParam(
    params.phoneNumber,
    '300 000 0000',
  );
  const dialCode = getStringParam(
    params.dialCode,
    '+57',
  );
  const flag = getStringParam(params.flag, '🇨🇴');

  const formattedPhone = `${flag} ${dialCode} ${phoneNumber}`;

  const [code, setCode] = useState<string[]>(
    createEmptyCode(),
  );
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<
    number | null
  >(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputs.current[0]?.focus();
    }, 250);

    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    if (timer <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimer((previousTimer) =>
        Math.max(previousTimer - 1, 0),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const clearFeedback = () => {
    if (error) {
      setError('');
    }

    if (message) {
      setMessage('');
    }
  };

  const updateCode = (
    nextCode: string[],
    nextFocusIndex?: number,
  ) => {
    setCode(nextCode);

    if (typeof nextFocusIndex === 'number') {
      setTimeout(() => {
        inputs.current[nextFocusIndex]?.focus();
      }, 0);
    }
  };

  const handleChangeText = (
    value: string,
    index: number,
  ) => {
    const cleanedValue = value.replace(/\D/g, '');

    clearFeedback();

    if (!cleanedValue) {
      const nextCode = [...code];
      nextCode[index] = '';
      updateCode(nextCode);
      return;
    }

    const nextCode = [...code];

    for (
      let offset = 0;
      offset < cleanedValue.length &&
      index + offset < OTP_LENGTH;
      offset += 1
    ) {
      nextCode[index + offset] = cleanedValue[offset];
    }

    const lastFilledIndex = Math.min(
      index + cleanedValue.length - 1,
      OTP_LENGTH - 1,
    );

    const nextFocusIndex =
      lastFilledIndex < OTP_LENGTH - 1
        ? lastFilledIndex + 1
        : undefined;

    updateCode(nextCode, nextFocusIndex);
  };

  const handleKeyPress = (
    event: {
      nativeEvent: {
        key: string;
      };
    },
    index: number,
  ) => {
    if (
      event.nativeEvent.key === 'Backspace' &&
      !code[index] &&
      index > 0
    ) {
      const nextCode = [...code];
      nextCode[index - 1] = '';
      updateCode(nextCode, index - 1);
    }
  };

  const getOtpCode = (): string => code.join('');

  const handleVerify = async () => {
    const otpCode = getOtpCode();

    if (otpCode.length !== OTP_LENGTH) {
      setError(
        'Por favor ingresa el código completo de 6 dígitos.',
      );
      return;
    }

    if (!phone) {
      setError(
        'No encontramos el número de celular. Vuelve a iniciar sesión.',
      );
      return;
    }

    try {
      setIsVerifying(true);
      setError('');
      setMessage('');

      const response = await verifyPhoneOtpMobile({
        phone,
        code: otpCode,
      });

      await saveAuthSession({
        session: response.session,
        user: response.user,
      });

      router.replace('/');
    } catch (requestError) {
      setCode(createEmptyCode());

      setError(
        requestError instanceof Error
          ? requestError.message
          : (
              'El código no es válido o expiró. '
              + 'Solicita uno nuevo e inténtalo otra vez.'
            ),
      );

      setTimeout(() => {
        inputs.current[0]?.focus();
      }, 0);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending) {
      return;
    }

    if (!phone) {
      setError(
        'No encontramos el número de celular. Vuelve a iniciar sesión.',
      );
      return;
    }

    try {
      setIsResending(true);
      setError('');
      setMessage('');

      await requestPhoneOtp({
        phone,
      });

      setCode(createEmptyCode());
      setTimer(RESEND_SECONDS);

      setMessage(
        'Si el número está registrado, enviamos un código nuevo por SMS.',
      );

      setTimeout(() => {
        inputs.current[0]?.focus();
      }, 0);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : (
              'No fue posible solicitar otro código. '
              + 'Inténtalo nuevamente.'
            ),
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            <View style={styles.contentContainer}>
              <View style={styles.logoContainer}>
                <BuddyLogo
                  size={80}
                  showText={false}
                  autoStopAfter={2500}
                />
              </View>

              <Text style={styles.title}>
                Verifica tu código
              </Text>

              <Text style={styles.subtitle}>
                Si el número está registrado, enviamos un código de
                verificación de 6 dígitos al número{' '}
                <Text style={styles.phoneHighlight}>
                  {formattedPhone}
                </Text>
                .
              </Text>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>
                  Código de seguridad
                </Text>

                <View style={styles.codeContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(input) => {
                        if (input) {
                          inputs.current[index] = input;
                        }
                      }}
                      style={[
                        styles.codeInput,
                        focusedIndex === index &&
                          styles.codeInputFocused,
                        digit !== '' &&
                          styles.codeInputFilled,
                      ]}
                      placeholder="0"
                      placeholderTextColor={colors.neutral.gray400}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="one-time-code"
                      maxLength={index === 0 ? OTP_LENGTH : 1}
                      value={digit}
                      editable={!isVerifying}
                      onChangeText={(value) =>
                        handleChangeText(value, index)
                      }
                      onKeyPress={(event) =>
                        handleKeyPress(event, index)
                      }
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(null)}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}

                {message ? (
                  <Text style={styles.messageText}>
                    {message}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isVerifying && styles.primaryButtonDisabled,
                ]}
                activeOpacity={0.8}
                disabled={isVerifying}
                onPress={handleVerify}
              >
                {isVerifying ? (
                  <ActivityIndicator color={colors.neutral.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Verificar e iniciar sesión
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                <TouchableOpacity
                  disabled={timer > 0 || isResending}
                  onPress={handleResend}
                  activeOpacity={0.7}
                >
                  {isResending ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.brand.primary}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.resendLink,
                        timer > 0 &&
                          styles.resendLinkDisabled,
                      ]}
                    >
                      {timer > 0
                        ? `Reenviar código en ${timer}s`
                        : 'Reenviar código'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isVerifying || isResending}
              >
                <Text style={styles.footerLink}>
                  Volver e intentar con otro número
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  phoneHighlight: {
    color: colors.neutral.text,
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 20,
    padding: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  inputLabel: {
    color: colors.neutral.gray700,
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  codeInput: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray300,
    borderRadius: 10,
    borderWidth: 1.5,
    color: colors.neutral.text,
    fontSize: 20,
    fontWeight: '400',
    height: 52,
    textAlign: 'center',
    width: 40,
  },
  codeInputFocused: {
    borderColor: colors.brand.primary,
  },
  codeInputFilled: {
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.text,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  messageText: {
    color: colors.brand.primary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    elevation: 4,
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 52,
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  resendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 24,
  },
  resendLink: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '400',
  },
  resendLinkDisabled: {
    color: colors.neutral.gray500,
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  footerLink: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '400',
  },
});