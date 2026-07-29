import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@beeapp/design-system';
import AnimatedLogo from '../../src/components/AnimatedLogo';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const rawPhone = params.phone || '300 000 0000';
  const dialCode = params.dialCode || '+57';
  const flag = params.flag || '🇨🇴';
  const phone = `${flag} ${dialCode} ${rawPhone}`;
  
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  const inputs = useRef<TextInput[]>([]);

  // Count down timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChangeText = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);

    if (error) setError('');

    // Auto-focus next input
    if (cleaned && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!code[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Por favor ingresa el código completo de 6 dígitos.');
      return;
    }
    setError('');
    // Route to app lock setup screen
    router.replace('/(auth)/app-lock-setup');
  };

  const handleResend = () => {
    if (timer === 0) {
      setTimer(60);
      setCode(['', '', '', '', '', '']);
      setError('');
      inputs.current[0]?.focus();
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
            {/* Main Content */}
            <View style={styles.contentContainer}>
              {/* Animated Logo (without text, autoStopAfter 2.5s) */}
              <View style={styles.logoContainer}>
                <AnimatedLogo size={80} showText={false} autoStopAfter={2500} />
              </View>

              <Text style={styles.title}>Verifica tu Código</Text>
              <Text style={styles.subtitle}>
                Hemos enviado un código de verificación de 6 dígitos al número{' '}
                <Text style={styles.phoneHighlight}>{phone}</Text>.
              </Text>

              {/* Code Inputs Box */}
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Código de seguridad</Text>
                
                <View style={styles.codeContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        if (ref) inputs.current[index] = ref;
                      }}
                      style={[
                        styles.codeInput,
                        focusedIndex === index && styles.codeInputFocused,
                        digit !== '' && styles.codeInputFilled,
                      ]}
                      placeholder="0"
                      placeholderTextColor={colors.neutral.gray400}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(text) => handleChangeText(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(null)}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handleVerify}
              >
                <Text style={styles.primaryButtonText}>Verificar</Text>
              </TouchableOpacity>

              {/* Resend Code Section */}
              <View style={styles.resendRow}>
                <TouchableOpacity
                  disabled={timer > 0}
                  onPress={handleResend}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.resendLink, timer > 0 && styles.resendLinkDisabled]}>
                    {timer > 0 ? `Reenviar código en ${timer}s` : 'Reenviar código'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Back to Login/Register Link */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Volver e intentar de nuevo</Text>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  phoneHighlight: {
    fontWeight: '600',
    color: colors.neutral.text,
  },
  inputCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  codeInput: {
    width: 40,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral.gray300,
    backgroundColor: colors.neutral.white,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  codeInputFocused: {
    borderColor: colors.brand.primary,
  },
  codeInputFilled: {
    borderColor: colors.neutral.text,
    backgroundColor: colors.neutral.gray50,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.brand.primary,
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
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
});
