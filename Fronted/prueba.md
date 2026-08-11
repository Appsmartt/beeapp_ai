~/Git/beeapp_ai/Fronted/apps/mobile/app/(auth)/login.tsx
import { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';

import AnimatedLogo from '../../src/components/AnimatedLogo';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { COUNTRIES, type Country } from '../../src/mocks/countries';

export default function LoginScreen() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES[0],
  );
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = useMemo(() => {
    const normalizedQuery = countrySearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return COUNTRIES;
    }

    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.dialCode.includes(normalizedQuery),
    );
  }, [countrySearch]);

  const handleContinue = () => {
    const normalizedPhoneNumber = phoneNumber.replace(/\D/g, '');

    if (
      normalizedPhoneNumber.length < 7 ||
      normalizedPhoneNumber.length > 15
    ) {
      setError('Ingresa un número de celular válido.');
      return;
    }

    setError('');

    router.push({
      pathname: '/(auth)/verify',
      params: {
        from: 'login',
        phone: normalizedPhoneNumber,
        dialCode: selectedCountry.dialCode,
        flag: selectedCountry.flag,
      },
    });
  };

  const openCountryModal = () => {
    setCountrySearch('');
    setIsCountryModalVisible(true);
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
                <AnimatedLogo
                  size={80}
                  showText={false}
                  autoStopAfter={2500}
                />
              </View>

              <Text style={styles.title}>Inicia sesión</Text>

              <Text style={styles.subtitle}>
                Ingresa tu número de celular para continuar.
              </Text>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Número telefónico</Text>

                <View style={styles.phoneInputContainer}>
                  <TouchableOpacity
                    style={styles.prefixBadge}
                    activeOpacity={0.7}
                    onPress={openCountryModal}
                  >
                    <Text style={styles.flag}>{selectedCountry.flag}</Text>

                    <Text style={styles.prefixText}>
                      {selectedCountry.dialCode}
                    </Text>
                  </TouchableOpacity>

                  <TextInput
                    style={styles.phoneInput}
                    placeholder="300 000 0000"
                    placeholderTextColor={colors.neutral.gray500}
                    keyboardType="number-pad"
                    maxLength={15}
                    value={phoneNumber}
                    onChangeText={(value) => {
                      setPhoneNumber(value.replace(/\D/g, ''));

                      if (error) {
                        setError('');
                      }
                    }}
                  />
                </View>

                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handleContinue}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>
                  ¿No tienes una cuenta?
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/(auth)/register')}
                >
                  <Text style={styles.registerLink}>Regístrate</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerNotice}>
                Al continuar, aceptas nuestros
              </Text>

              <View style={styles.footerLinksRow}>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/terms')}
                >
                  <Text style={styles.footerLink}>
                    Términos y Condiciones
                  </Text>
                </TouchableOpacity>

                <Text style={styles.footerDot}> • </Text>

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/privacy')}
                >
                  <Text style={styles.footerLink}>
                    Política de Privacidad
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent
        visible={isCountryModalVisible}
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsCountryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecciona un país</Text>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsCountryModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.searchBar}
                  placeholder="Buscar país o indicativo..."
                  placeholderTextColor={colors.neutral.gray500}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                />

                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.countryRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedCountry(item);
                        setIsCountryModalVisible(false);
                      }}
                    >
                      <Text style={styles.countryFlag}>{item.flag}</Text>

                      <Text style={styles.countryName}>{item.name}</Text>

                      <Text style={styles.countryDialCode}>
                        {item.dialCode}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.countryList}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 20,
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
  inputCard: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 20,
    padding: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  inputLabel: {
    color: colors.neutral.gray700,
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  phoneInputContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  prefixBadge: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 10,
    flexDirection: 'row',
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  flag: {
    fontSize: 16,
    marginRight: 6,
  },
  prefixText: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '400',
  },
  phoneInput: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: 1,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    marginTop: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    elevation: 4,
    marginBottom: 16,
    paddingVertical: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  registerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    marginRight: 5,
  },
  registerLink: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  footerNotice: {
    color: colors.neutral.gray500,
    fontSize: 12,
    marginBottom: 4,
  },
  footerLinksRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  footerLink: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '400',
  },
  footerDot: {
    color: colors.neutral.gray500,
    fontSize: 12,
  },
  modalOverlay: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.neutral.text,
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    color: colors.neutral.gray700,
    fontSize: 13,
    fontWeight: '400',
  },
  searchBar: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.neutral.text,
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countryList: {
    maxHeight: 300,
  },
  countryRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 14,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 14,
  },
  countryName: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  countryDialCode: {
    color: colors.brand.primary,
    fontSize: 15,
    fontWeight: '400',
  },
});

~/Git/beeapp_ai/Fronted/apps/mobile/app/(auth)/verify.tsx
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


~/Git/beeapp_ai/Fronted/apps/mobile/app/(auth)/register.tsx
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    } from 'react-native';
import { useRouter } from 'expo-router';
import {
    Check,
    ChevronLeft,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Phone,
    User,
    UserPlus,
    } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { registerUser } from '@beeapp/api-client';
import type { RegisterUserPayload } from '@beeapp/shared-types';

import AnimatedLogo from '../../src/components/AnimatedLogo';
import CountryCodeModal from '../../src/components/contacts/CountryCodeModal';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { COUNTRIES, type Country } from '../../src/mocks/countries';

type FormErrors = {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    confirmPassword?: string;
};

const MIN_PASSWORD_LENGTH = 8;

function normalizePhoneNumber(value: string): string {
    return value.replace(/\D/g, '');
}

function isValidEmail(value: string): boolean {
    return /^\S+@\S+\.\S+$/.test(value);
}

export default function RegisterScreen() {
    const router = useRouter();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>(
        COUNTRIES[0],
    );

    const [errors, setErrors] = useState<FormErrors>({});
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
        useState(false);

    const passwordStrengthLabel = useMemo(() => {
        if (!password) {
        return 'Use at least 8 characters.';
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
        return `${MIN_PASSWORD_LENGTH - password.length} more characters required.`;
        }

        return 'Password length is valid.';
    }, [password]);

    const clearFieldError = (field: keyof FormErrors) => {
        setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
        }));

        if (formError) {
        setFormError('');
        }
    };

    const validateForm = (): boolean => {
        const nextErrors: FormErrors = {};
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

        if (!firstName.trim()) {
        nextErrors.firstName = 'Ingresa tu nombre.';
        }

        if (!lastName.trim()) {
        nextErrors.lastName = 'Ingresa tu apellido.';
        }

        if (!email.trim()) {
        nextErrors.email = 'Ingresa tu correo electrónico.';
        } else if (!isValidEmail(email.trim())) {
        nextErrors.email = 'Ingresa un correo electrónico válido.';
        }

        if (!normalizedPhoneNumber) {
        nextErrors.phoneNumber = 'Ingresa tu número de celular.';
        } else if (normalizedPhoneNumber.length < 7) {
        nextErrors.phoneNumber = 'Ingresa un número de celular válido.';
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
        nextErrors.password =
            'La contraseña debe tener al menos 8 caracteres.';
        }

        if (password !== confirmPassword) {
        nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
        }

        if (!acceptedTerms) {
        setFormError(
            'Debes aceptar los Términos y Condiciones para crear una cuenta.',
        );
        } else {
        setFormError('');
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0 && acceptedTerms;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
        return;
        }

        const payload: RegisterUserPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone_dial_code: selectedCountry.dialCode.replace('+', ''),
        phone_number: normalizePhoneNumber(phoneNumber),
        };

        try {
        setIsSubmitting(true);
        setFormError('');

        const response = await registerUser(payload);

        Alert.alert(
            'Cuenta creada',
            `Bienvenido a BeeApp AI, ${response.user.first_name}. Tu cuenta y perfil fueron creados correctamente.`,
            [
            {
                text: 'Ir a iniciar sesión',
                onPress: () => router.replace('/(auth)/login'),
            },
            ],
        );
        } catch (error) {
        setFormError(
            error instanceof Error
            ? error.message
            : 'No fue posible crear la cuenta. Inténtalo nuevamente.',
        );
        } finally {
        setIsSubmitting(false);
        }
    };

    return (
        <ScreenSafeArea style={styles.safeArea}>
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={() => router.back()}
                >
                <ChevronLeft
                    size={20}
                    color={colors.neutral.gray700}
                />

                <Text style={styles.backButtonText}>Volver</Text>
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                <AnimatedLogo
                    size={64}
                    showText={false}
                    autoStopAfter={2500}
                />
                </View>

                <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <UserPlus
                    size={20}
                    color={colors.brand.primary}
                    />
                </View>

                <Text style={styles.title}>Crea tu cuenta</Text>

                <Text style={styles.subtitle}>
                    Completa tus datos para crear tu usuario y perfil en BeeApp AI.
                </Text>
                </View>

                {formError ? (
                <View style={styles.formErrorBox}>
                    <Text style={styles.formErrorText}>{formError}</Text>
                </View>
                ) : null}

                <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Datos personales</Text>

                <View style={styles.row}>
                    <Field
                    containerStyle={styles.halfField}
                    label="Nombre"
                    value={firstName}
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    icon={<User size={17} color={colors.neutral.gray500} />}
                    error={errors.firstName}
                    onChangeText={(value) => {
                        setFirstName(value);
                        clearFieldError('firstName');
                    }}
                    />

                    <Field
                    containerStyle={styles.halfField}
                    label="Apellido"
                    value={lastName}
                    placeholder="Tu apellido"
                    autoComplete="family-name"
                    icon={<User size={17} color={colors.neutral.gray500} />}
                    error={errors.lastName}
                    onChangeText={(value) => {
                        setLastName(value);
                        clearFieldError('lastName');
                    }}
                    />
                </View>

                <Field
                    label="Correo electrónico"
                    value={email}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    icon={<Mail size={17} color={colors.neutral.gray500} />}
                    error={errors.email}
                    onChangeText={(value) => {
                    setEmail(value);
                    clearFieldError('email');
                    }}
                />

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Número de celular</Text>

                    <View
                    style={[
                        styles.phoneContainer,
                        errors.phoneNumber && styles.inputError,
                    ]}
                    >
                    <TouchableOpacity
                        style={styles.countryButton}
                        activeOpacity={0.7}
                        onPress={() => setIsCountryModalVisible(true)}
                    >
                        <Text style={styles.countryFlag}>
                        {selectedCountry.flag}
                        </Text>

                        <Text style={styles.countryCode}>
                        {selectedCountry.dialCode}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.phoneDivider} />

                    <Phone
                        size={17}
                        color={colors.neutral.gray500}
                    />

                    <TextInput
                        style={styles.phoneInput}
                        placeholder="300 000 0000"
                        placeholderTextColor={colors.neutral.gray500}
                        keyboardType="number-pad"
                        maxLength={15}
                        value={phoneNumber}
                        onChangeText={(value) => {
                        setPhoneNumber(value.replace(/\D/g, ''));
                        clearFieldError('phoneNumber');
                        }}
                    />
                    </View>

                    {errors.phoneNumber ? (
                    <Text style={styles.errorText}>
                        {errors.phoneNumber}
                    </Text>
                    ) : (
                    <Text style={styles.helperText}>
                        Usaremos este número para asociar tu cuenta.
                    </Text>
                    )}
                </View>

                <Text style={styles.sectionTitle}>Seguridad</Text>

                <PasswordField
                    label="Contraseña"
                    value={password}
                    visible={isPasswordVisible}
                    error={errors.password}
                    helperText={passwordStrengthLabel}
                    onToggleVisibility={() => {
                    setIsPasswordVisible((currentValue) => !currentValue);
                    }}
                    onChangeText={(value) => {
                    setPassword(value);
                    clearFieldError('password');
                    }}
                />

                <PasswordField
                    label="Confirmar contraseña"
                    value={confirmPassword}
                    visible={isConfirmPasswordVisible}
                    error={errors.confirmPassword}
                    onToggleVisibility={() => {
                    setIsConfirmPasswordVisible(
                        (currentValue) => !currentValue,
                    );
                    }}
                    onChangeText={(value) => {
                    setConfirmPassword(value);
                    clearFieldError('confirmPassword');
                    }}
                />

                <TouchableOpacity
                    style={styles.termsRow}
                    activeOpacity={0.7}
                    onPress={() => setAcceptedTerms((currentValue) => !currentValue)}
                >
                    <View
                    style={[
                        styles.checkbox,
                        acceptedTerms && styles.checkboxSelected,
                    ]}
                    >
                    {acceptedTerms ? (
                        <Check
                        size={13}
                        color={colors.neutral.white}
                        strokeWidth={3}
                        />
                    ) : null}
                    </View>

                    <Text style={styles.termsText}>
                    Acepto los{' '}

                    <Text
                        style={styles.termsLink}
                        onPress={() => router.push('/(auth)/terms')}
                    >
                        Términos y Condiciones
                    </Text>

                    {' '}y la{' '}

                    <Text
                        style={styles.termsLink}
                        onPress={() => router.push('/(auth)/privacy')}
                    >
                        Política de Privacidad
                    </Text>

                    {' '}de BeeApp AI.
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                    styles.registerButton,
                    isSubmitting && styles.registerButtonDisabled,
                    ]}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                    onPress={handleRegister}
                >
                    {isSubmitting ? (
                    <ActivityIndicator color={colors.neutral.white} />
                    ) : (
                    <>
                        <Text style={styles.registerButtonText}>
                        Crear cuenta
                        </Text>

                        <UserPlus
                        size={18}
                        color={colors.neutral.white}
                        />
                    </>
                    )}
                </TouchableOpacity>
                </View>

                <View style={styles.loginRow}>
                <Text style={styles.loginText}>¿Ya tienes una cuenta?</Text>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text style={styles.loginLink}>Inicia sesión</Text>
                </TouchableOpacity>
                </View>
            </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        <CountryCodeModal
            visible={isCountryModalVisible}
            onClose={() => setIsCountryModalVisible(false)}
            onSelect={(country) => {
            setSelectedCountry(country);
            setIsCountryModalVisible(false);
            clearFieldError('phoneNumber');
            }}
        />
        </ScreenSafeArea>
    );
}

interface FieldProps {
    label: string;
    value: string;
    placeholder: string;
    autoComplete: 'given-name' | 'family-name' | 'email';
    icon: React.ReactNode;
    error?: string;
    containerStyle?: object;
    keyboardType?: 'default' | 'email-address';
    autoCapitalize?: 'none' | 'sentences' | 'words';
    onChangeText: (value: string) => void;
}

function Field({
    label,
    value,
    placeholder,
    autoComplete,
    icon,
    error,
    containerStyle,
    keyboardType = 'default',
    autoCapitalize = 'words',
    onChangeText,
    }: FieldProps) {
    return (
        <View style={[styles.fieldContainer, containerStyle]}>
        <Text style={styles.label}>{label}</Text>

        <View style={[styles.input, error && styles.inputError]}>
            {icon}

            <TextInput
            style={styles.textInput}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral.gray500}
            autoComplete={autoComplete}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            onChangeText={onChangeText}
            />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

interface PasswordFieldProps {
    label: string;
    value: string;
    visible: boolean;
    error?: string;
    helperText?: string;
    onToggleVisibility: () => void;
    onChangeText: (value: string) => void;
}

function PasswordField({
    label,
    value,
    visible,
    error,
    helperText,
    onToggleVisibility,
    onChangeText,
    }: PasswordFieldProps) {
    return (
        <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>

        <View style={[styles.input, error && styles.inputError]}>
            <LockKeyhole size={17} color={colors.neutral.gray500} />

            <TextInput
            style={styles.textInput}
            value={value}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.neutral.gray500}
            autoComplete="new-password"
            autoCapitalize="none"
            secureTextEntry={!visible}
            onChangeText={onChangeText}
            />

            <TouchableOpacity
            style={styles.visibilityButton}
            activeOpacity={0.7}
            onPress={onToggleVisibility}
            >
            {visible ? (
                <EyeOff size={18} color={colors.neutral.gray500} />
            ) : (
                <Eye size={18} color={colors.neutral.gray500} />
            )}
            </TouchableOpacity>
        </View>

        {error ? (
            <Text style={styles.errorText}>{error}</Text>
        ) : helperText ? (
            <Text style={styles.helperText}>{helperText}</Text>
        ) : null}
        </View>
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
    },
    backButton: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        marginBottom: 12,
        paddingVertical: 6,
    },
    backButtonText: {
        color: colors.neutral.gray700,
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 2,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    header: {
        alignItems: 'center',
        marginBottom: 22,
    },
    headerIcon: {
        alignItems: 'center',
        backgroundColor: '#F0EAFF',
        borderRadius: 14,
        height: 42,
        justifyContent: 'center',
        marginBottom: 10,
        width: 42,
    },
    title: {
        color: colors.neutral.text,
        fontSize: 25,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: colors.neutral.gray600,
        fontSize: 13,
        lineHeight: 19,
        maxWidth: 320,
        textAlign: 'center',
    },
    formErrorBox: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 14,
        padding: 12,
    },
    formErrorText: {
        color: colors.semantic.error,
        fontSize: 12,
        lineHeight: 18,
    },
    formCard: {
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 2,
        padding: 16,
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    sectionTitle: {
        color: colors.neutral.gray700,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.7,
        marginBottom: 14,
        marginTop: 4,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    halfField: {
        flex: 1,
    },
    fieldContainer: {
        marginBottom: 15,
    },
    label: {
        color: colors.neutral.gray700,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 7,
    },
    input: {
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        height: 48,
        paddingHorizontal: 13,
    },
    inputError: {
        borderColor: colors.semantic.error,
    },
    textInput: {
        color: colors.neutral.text,
        flex: 1,
        fontSize: 14,
        marginLeft: 9,
        paddingVertical: 0,
    },
    visibilityButton: {
        padding: 4,
    },
    phoneContainer: {
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        borderColor: colors.neutral.gray200,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        height: 48,
        paddingRight: 13,
    },
    countryButton: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 11,
    },
    countryFlag: {
        fontSize: 17,
        marginRight: 5,
    },
    countryCode: {
        color: colors.neutral.text,
        fontSize: 13,
        fontWeight: '600',
    },
    phoneDivider: {
        backgroundColor: colors.neutral.gray200,
        height: 24,
        marginRight: 10,
        width: 1,
    },
    phoneInput: {
        color: colors.neutral.text,
        flex: 1,
        fontSize: 14,
        marginLeft: 9,
        paddingVertical: 0,
    },
    helperText: {
        color: colors.neutral.gray500,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 5,
    },
    errorText: {
        color: colors.semantic.error,
        fontSize: 11,
        lineHeight: 16,
        marginTop: 5,
    },
    termsRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        marginBottom: 20,
        marginTop: 2,
    },
    checkbox: {
        alignItems: 'center',
        borderColor: colors.neutral.gray300,
        borderRadius: 5,
        borderWidth: 1.5,
        height: 18,
        justifyContent: 'center',
        marginRight: 9,
        marginTop: 1,
        width: 18,
    },
    checkboxSelected: {
        backgroundColor: colors.brand.primary,
        borderColor: colors.brand.primary,
    },
    termsText: {
        color: colors.neutral.gray600,
        flex: 1,
        fontSize: 11,
        lineHeight: 17,
    },
    termsLink: {
        color: colors.brand.primary,
        fontWeight: '600',
    },
    registerButton: {
        alignItems: 'center',
        backgroundColor: colors.brand.primary,
        borderRadius: 13,
        elevation: 4,
        flexDirection: 'row',
        height: 50,
        justifyContent: 'center',
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.22,
        shadowRadius: 9,
    },
    registerButtonDisabled: {
        opacity: 0.7,
    },
    registerButtonText: {
        color: colors.neutral.white,
        fontSize: 15,
        fontWeight: '700',
        marginRight: 8,
    },
    loginRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 22,
    },
    loginText: {
        color: colors.neutral.gray600,
        fontSize: 13,
        marginRight: 5,
    },
    loginLink: {
        color: colors.brand.primary,
        fontSize: 13,
        fontWeight: '700',
    },
});

~/Git/beeapp_ai/Fronted/apps/mobile/src/components/AnimatedLogo.tsx
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '@beeapp/design-system';

interface AnimatedLogoProps {
  size?: number;
  showText?: boolean;
  autoStopAfter?: number;
}

export default function AnimatedLogo({ size = 100, showText = true, autoStopAfter }: AnimatedLogoProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Constant speed rotation loop
    const rotationLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotationLoop.start();

    if (autoStopAfter) {
      const timer = setTimeout(() => {
        rotationLoop.stop();
        // Gently reset to 0 (default/idle position)
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, autoStopAfter);

      return () => {
        clearTimeout(timer);
        rotationLoop.stop();
      };
    }

    return () => {
      rotationLoop.stop();
    };
  }, [rotateAnim, autoStopAfter]);

  // Clockwise rotation (girando a la derecha)
  const spinClockwise = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Counter-clockwise rotation (girando a la izquierda) starting with a 45 degree offset for a nicer visual pattern
  const spinCounterClockwise = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['45deg', '-315deg'],
  });

  return (
    <View style={styles.container}>
      {/* 
        The outer container size is size * 1.5 to accommodate the wings 
        which are size * 1.25 and rotate, preventing any layout clipping.
      */}
      <View style={{ width: size * 1.5, height: size * 1.5, justifyContent: 'center', alignItems: 'center' }}>
        {/* Left Wing (behind, rotating counter-clockwise, larger to protrude from the central square) */}
        <Animated.View
          style={[
            styles.wing,
            {
              width: size * 1.25,
              height: size * 1.25,
              borderRadius: size * 0.28,
              transform: [{ rotate: spinCounterClockwise }],
            },
          ]}
        />

        {/* Right Wing (behind, rotating clockwise, larger to protrude from the central square) */}
        <Animated.View
          style={[
            styles.wing,
            {
              width: size * 1.25,
              height: size * 1.25,
              borderRadius: size * 0.28,
              transform: [{ rotate: spinClockwise }],
            },
          ]}
        />

        {/* Central Square (static, white foreground, stays still, on top) */}
        <View
          style={[
            styles.centralSquare,
            {
              width: size,
              height: size,
              borderRadius: size * 0.25,
              transform: [{ rotate: '12deg' }],
            },
          ]}
        >
          {/* 2x2 grid of 4 purple squares */}
          <View
            style={{
              width: size * 0.52,
              height: size * 0.52,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignContent: 'space-between',
            }}
          >
            <View style={[styles.gridDot, { width: size * 0.23, height: size * 0.23, borderRadius: size * 0.06 }]} />
            <View style={[styles.gridDot, { width: size * 0.23, height: size * 0.23, borderRadius: size * 0.06 }]} />
            <View style={[styles.gridDot, { width: size * 0.23, height: size * 0.23, borderRadius: size * 0.06 }]} />
            <View style={[styles.gridDot, { width: size * 0.23, height: size * 0.23, borderRadius: size * 0.06 }]} />
          </View>
        </View>
      </View>

      {showText && (
        <View style={[styles.textContainer, { marginTop: size * 0.24 }]}>
          <Text style={[styles.brandTitle, { fontSize: Math.max(18, size * 0.24) }]}>
            BeeApp AI
          </Text>
          <Text style={[styles.brandSubtitle, { fontSize: Math.max(9, size * 0.1), letterSpacing: size * 0.02 }]}>
            ECOSISTEMA INTELIGENTE
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wing: {
    position: 'absolute',
    backgroundColor: colors.brand.primary, // #6025d2
    opacity: 0.35, // Semitransparent purple so it blends elegantly
  },
  centralSquare: {
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    // Premium soft shadow to lift it above the wings
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  gridDot: {
    backgroundColor: colors.brand.primary, // #6025d2
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    color: colors.brand.primary, // #6025d2
    fontWeight: '700',
    textAlign: 'center',
  },
  brandSubtitle: {
    color: colors.neutral.gray600, // #6C757D
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },
});


~/Git/beeapp_ai/Fronted/apps/mobile/src/components/layout/ScreenSafeArea.tsx
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModuleNav } from '../embedded/EmbeddedNavContext';

/**
 * Screen shell that keeps the content below the status bar / notch.
 *
 * React Native's own SafeAreaView is a no-op on Android, so every screen uses
 * this one instead: the top padding is always the device inset reported by
 * react-native-safe-area-context, never a hardcoded value.
 *
 * Module screens rendered inside the Home (EmbeddedModuleHost) get no inset:
 * the Home already pushed everything below the status bar.
 */
export default function ScreenSafeArea({ style, children, ...rest }: ViewProps) {
  const insets = useSafeAreaInsets();
  const { embedded } = useModuleNav();

  return (
    <View style={[style, { paddingTop: embedded ? 0 : insets.top }]} {...rest}>
      {children}
    </View>
  );
}


~/Git/beeapp_ai/Fronted/apps/mobile/src/mocks/countries.ts
export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

// Suggested / Frequent countries placed at the top
const SUGGESTED_COUNTRIES: Country[] = [
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴' },
  { name: 'México', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { name: 'España', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Estados Unidos', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Canadá', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Brasil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱' },
  { name: 'Perú', code: 'PE', dialCode: '+51', flag: '🇵🇪' },
  { name: 'Ecuador', code: 'EC', dialCode: '+593', flag: '🇪🇨' },
  { name: 'Panamá', code: 'PA', dialCode: '+507', flag: '🇵🇦' },
  { name: 'Costa Rica', code: 'CR', dialCode: '+506', flag: '🇨🇷' },
  { name: 'Venezuela', code: 'VE', dialCode: '+58', flag: '🇻🇪' },
  { name: 'Bolivia', code: 'BO', dialCode: '+591', flag: '🇧🇴' },
  { name: 'Uruguay', code: 'UY', dialCode: '+598', flag: '🇺🇾' },
  { name: 'Paraguay', code: 'PY', dialCode: '+595', flag: '🇵🇾' },
  { name: 'Guatemala', code: 'GT', dialCode: '+502', flag: '🇬🇹' },
  { name: 'Honduras', code: 'HN', dialCode: '+504', flag: '🇭🇳' },
  { name: 'El Salvador', code: 'SV', dialCode: '+503', flag: '🇸🇻' },
  { name: 'Nicaragua', code: 'NI', dialCode: '+505', flag: '🇳🇮' },
  { name: 'República Dominicana', code: 'DO', dialCode: '+1', flag: '🇩🇴' },
  { name: 'Puerto Rico', code: 'PR', dialCode: '+1', flag: '🇵🇷' },
  { name: 'Cuba', code: 'CU', dialCode: '+53', flag: '🇨🇺' },
];

// Complete list of the rest of the world countries, alphabetically sorted
const ALL_OTHER_COUNTRIES: Country[] = [
  { name: 'Afganistán', code: 'AF', dialCode: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', dialCode: '+355', flag: '🇦🇱' },
  { name: 'Alemania', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'Andorra', code: 'AD', dialCode: '+376', flag: '🇦🇩' },
  { name: 'Angola', code: 'AO', dialCode: '+244', flag: '🇦🇴' },
  { name: 'Antigua y Barbuda', code: 'AG', dialCode: '+1', flag: '🇦🇬' },
  { name: 'Arabia Saudita', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Argelia', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'Armenia', code: 'AM', dialCode: '+374', flag: '🇦🇲' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { name: 'Azerbaiyán', code: 'AZ', dialCode: '+994', flag: '🇦🇿' },
  { name: 'Bahamas', code: 'BS', dialCode: '+1', flag: '🇧🇸' },
  { name: 'Bangladés', code: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Barbados', code: 'BB', dialCode: '+1', flag: '🇧🇧' },
  { name: 'Baréin', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Bélgica', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
  { name: 'Belice', code: 'BZ', dialCode: '+501', flag: '🇧🇿' },
  { name: 'Benín', code: 'BJ', dialCode: '+229', flag: '🇧🇯' },
  { name: 'Bielorrusia', code: 'BY', dialCode: '+375', flag: '🇧🇾' },
  { name: 'Birmania / Myanmar', code: 'MM', dialCode: '+95', flag: '🇲🇲' },
  { name: 'Bosnia y Herzegovina', code: 'BA', dialCode: '+387', flag: '🇧🇦' },
  { name: 'Botsuana', code: 'BW', dialCode: '+267', flag: '🇧🇼' },
  { name: 'Brunéi', code: 'BN', dialCode: '+673', flag: '🇧🇳' },
  { name: 'Bulgaria', code: 'BG', dialCode: '+359', flag: '🇧🇬' },
  { name: 'Burkina Faso', code: 'BF', dialCode: '+226', flag: '🇧🇫' },
  { name: 'Burundi', code: 'BI', dialCode: '+257', flag: '🇧🇮' },
  { name: 'Cabo Verde', code: 'CV', dialCode: '+238', flag: '🇨🇻' },
  { name: 'Camboya', code: 'KH', dialCode: '+855', flag: '🇰🇭' },
  { name: 'Camerún', code: 'CM', dialCode: '+237', flag: '🇨🇲' },
  { name: 'Catar', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Chad', code: 'TD', dialCode: '+235', flag: '🇹🇩' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { name: 'Chipre', code: 'CY', dialCode: '+357', flag: '🇨🇾' },
  { name: 'Ciudad del Vaticano', code: 'VA', dialCode: '+39', flag: '🇻🇦' },
  { name: 'Comoras', code: 'KM', dialCode: '+269', flag: '🇰🇲' },
  { name: 'Corea del Norte', code: 'KP', dialCode: '+850', flag: '🇰🇵' },
  { name: 'Corea del Sur', code: 'KR', dialCode: '+82', flag: '🇰🇷' },
  { name: 'Costa de Marfil', code: 'CI', dialCode: '+225', flag: '🇨🇮' },
  { name: 'Croacia', code: 'HR', dialCode: '+385', flag: '🇭🇷' },
  { name: 'Dinamarca', code: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Dominica', code: 'DM', dialCode: '+1', flag: '🇩🇲' },
  { name: 'Egipto', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Emiratos Árabes Unidos', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'Eritrea', code: 'ER', dialCode: '+291', flag: '🇪🇷' },
  { name: 'Eslovaquia', code: 'SK', dialCode: '+421', flag: '🇸🇰' },
  { name: 'Eslovenia', code: 'SI', dialCode: '+386', flag: '🇸🇮' },
  { name: 'Estonia', code: 'EE', dialCode: '+372', flag: '🇪🇪' },
  { name: 'Etiopía', code: 'ET', dialCode: '+251', flag: '🇪🇹' },
  { name: 'Filipinas', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Finlandia', code: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { name: 'Fiyi', code: 'FJ', dialCode: '+679', flag: '🇫🇯' },
  { name: 'Francia', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Gabón', code: 'GA', dialCode: '+241', flag: '🇬🇦' },
  { name: 'Gambia', code: 'GM', dialCode: '+220', flag: '🇬🇲' },
  { name: 'Georgia', code: 'GE', dialCode: '+995', flag: '🇬🇪' },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Gibraltar', code: 'GI', dialCode: '+350', flag: '🇬🇮' },
  { name: 'Granada', code: 'GD', dialCode: '+1', flag: '🇬🇩' },
  { name: 'Grecia', code: 'GR', dialCode: '+30', flag: '🇬🇷' },
  { name: 'Groenlandia', code: 'GL', dialCode: '+299', flag: '🇬🇱' },
  { name: 'Guyana', code: 'GY', dialCode: '+592', flag: '🇬🇾' },
  { name: 'Haití', code: 'HT', dialCode: '+509', flag: '🇭🇹' },
  { name: 'Hungría', code: 'HU', dialCode: '+36', flag: '🇭🇺' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { name: 'Irak', code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'Irán', code: 'IR', dialCode: '+98', flag: '🇮🇷' },
  { name: 'Irlanda', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Islandia', code: 'IS', dialCode: '+354', flag: '🇮🇸' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱' },
  { name: 'Italia', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Jamaica', code: 'JM', dialCode: '+1', flag: '🇯🇲' },
  { name: 'Japón', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'Jordania', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'Kazajistán', code: 'KZ', dialCode: '+7', flag: '🇰🇿' },
  { name: 'Kenia', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Kirguistán', code: 'KG', dialCode: '+996', flag: '🇰🇬' },
  { name: 'Kiribati', code: 'KI', dialCode: '+686', flag: '🇰🇮' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Laos', code: 'LA', dialCode: '+856', flag: '🇱🇦' },
  { name: 'Lesoto', code: 'LS', dialCode: '+266', flag: '🇱🇸' },
  { name: 'Letonia', code: 'LV', dialCode: '+371', flag: '🇱🇻' },
  { name: 'Líbano', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'Liberia', code: 'LR', dialCode: '+231', flag: '🇱🇷' },
  { name: 'Libia', code: 'LY', dialCode: '+218', flag: '🇱🇾' },
  { name: 'Liechtenstein', code: 'LI', dialCode: '+423', flag: '🇱🇮' },
  { name: 'Lituania', code: 'LT', dialCode: '+370', flag: '🇱🇹' },
  { name: 'Luxemburgo', code: 'LU', dialCode: '+352', flag: '🇱🇺' },
  { name: 'Macedonia del Norte', code: 'MK', dialCode: '+389', flag: '🇲🇰' },
  { name: 'Madagascar', code: 'MG', dialCode: '+261', flag: '🇲🇬' },
  { name: 'Malasia', code: 'MY', dialCode: '+60', flag: '🇲🇾' },
  { name: 'Malaui', code: 'MW', dialCode: '+265', flag: '🇲🇼' },
  { name: 'Maldivas', code: 'MV', dialCode: '+960', flag: '🇲🇻' },
  { name: 'Malí', code: 'ML', dialCode: '+223', flag: '🇲🇱' },
  { name: 'Malta', code: 'MT', dialCode: '+356', flag: '🇲🇹' },
  { name: 'Marruecos', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Mauricio', code: 'MU', dialCode: '+230', flag: '🇲🇺' },
  { name: 'Mauritania', code: 'MR', dialCode: '+222', flag: '🇲🇷' },
  { name: 'Micronesia', code: 'FM', dialCode: '+691', flag: '🇫🇲' },
  { name: 'Moldavia', code: 'MD', dialCode: '+373', flag: '🇲🇩' },
  { name: 'Mónaco', code: 'MC', dialCode: '+377', flag: '🇲🇨' },
  { name: 'Mongolia', code: 'MN', dialCode: '+976', flag: '🇲🇳' },
  { name: 'Montenegro', code: 'ME', dialCode: '+382', flag: '🇲🇪' },
  { name: 'Mozambique', code: 'MZ', dialCode: '+258', flag: '🇲🇿' },
  { name: 'Namibia', code: 'NA', dialCode: '+264', flag: '🇳🇦' },
  { name: 'Nauru', code: 'NR', dialCode: '+674', flag: '🇳🇷' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵' },
  { name: 'Níger', code: 'NE', dialCode: '+227', flag: '🇳🇪' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Noruega', code: 'NO', dialCode: '+47', flag: '🇳🇴' },
  { name: 'Nueva Zelanda', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'Omán', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Países Bajos', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'Pakistán', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Palaos', code: 'PW', dialCode: '+680', flag: '🇵🇼' },
  { name: 'Palestina', code: 'PS', dialCode: '+970', flag: '🇵🇸' },
  { name: 'Papúa Nueva Guinea', code: 'PG', dialCode: '+675', flag: '🇵🇬' },
  { name: 'Polonia', code: 'PL', dialCode: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Reino Unido', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'República Centroafricana', code: 'CF', dialCode: '+236', flag: '🇨🇫' },
  { name: 'República Checa', code: 'CZ', dialCode: '+420', flag: '🇨🇿' },
  { name: 'República del Congo', code: 'CG', dialCode: '+242', flag: '🇨🇬' },
  { name: 'República Democrática del Congo', code: 'CD', dialCode: '+243', flag: '🇨🇩' },
  { name: 'Ruanda', code: 'RW', dialCode: '+250', flag: '🇷🇼' },
  { name: 'Rumania', code: 'RO', dialCode: '+40', flag: '🇷🇴' },
  { name: 'Rusia', code: 'RU', dialCode: '+7', flag: '🇷🇺' },
  { name: 'Samoa', code: 'WS', dialCode: '+685', flag: '🇼🇸' },
  { name: 'San Cristóbal y Nieves', code: 'KN', dialCode: '+1', flag: '🇰🇳' },
  { name: 'San Marino', code: 'SM', dialCode: '+378', flag: '🇸🇲' },
  { name: 'San Vicente y las Granadinas', code: 'VC', dialCode: '+1', flag: '🇻🇨' },
  { name: 'Santa Lucía', code: 'LC', dialCode: '+1', flag: '🇱🇨' },
  { name: 'Santo Tomé y Príncipe', code: 'ST', dialCode: '+239', flag: '🇸🇹' },
  { name: 'Senegal', code: 'SN', dialCode: '+221', flag: '🇸🇳' },
  { name: 'Serbia', code: 'RS', dialCode: '+381', flag: '🇷🇸' },
  { name: 'Seychelles', code: 'SC', dialCode: '+248', flag: '🇸🇨' },
  { name: 'Sierra Leona', code: 'SL', dialCode: '+232', flag: '🇸🇱' },
  { name: 'Singapur', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Siria', code: 'SY', dialCode: '+963', flag: '🇸🇾' },
  { name: 'Somalia', code: 'SO', dialCode: '+252', flag: '🇸🇴' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰' },
  { name: 'Sudáfrica', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'Sudán', code: 'SD', dialCode: '+249', flag: '🇸🇩' },
  { name: 'Sudán del Sur', code: 'SS', dialCode: '+211', flag: '🇸🇸' },
  { name: 'Suecia', code: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Suiza', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Surinam', code: 'SR', dialCode: '+597', flag: '🇸🇷' },
  { name: 'Tailandia', code: 'TH', dialCode: '+66', flag: '🇹🇭' },
  { name: 'Taiwán', code: 'TW', dialCode: '+886', flag: '🇹🇼' },
  { name: 'Tanzania', code: 'TZ', dialCode: '+255', flag: '🇹🇿' },
  { name: 'Tayikistán', code: 'TJ', dialCode: '+992', flag: '🇹🇯' },
  { name: 'Timor Oriental', code: 'TL', dialCode: '+670', flag: '🇹🇱' },
  { name: 'Togo', code: 'TG', dialCode: '+228', flag: '🇹🇬' },
  { name: 'Tonga', code: 'TO', dialCode: '+676', flag: '🇹🇴' },
  { name: 'Trinidad y Tobago', code: 'TT', dialCode: '+1', flag: '🇹🇹' },
  { name: 'Túnez', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'Turkmenistán', code: 'TM', dialCode: '+993', flag: '🇹🇲' },
  { name: 'Turquía', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Tuvalu', code: 'TV', dialCode: '+688', flag: '🇹🇻' },
  { name: 'Ucrania', code: 'UA', dialCode: '+380', flag: '🇺🇦' },
  { name: 'Uganda', code: 'UG', dialCode: '+256', flag: '🇺🇬' },
  { name: 'Uzbekistán', code: 'UZ', dialCode: '+998', flag: '🇺🇿' },
  { name: 'Vanuatu', code: 'VU', dialCode: '+678', flag: '🇻🇺' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳' },
  { name: 'Yemen', code: 'YE', dialCode: '+967', flag: '🇾🇪' },
  { name: 'Yibuti', code: 'DJ', dialCode: '+253', flag: '🇩🇯' },
  { name: 'Zambia', code: 'ZM', dialCode: '+260', flag: '🇿🇲' },
  { name: 'Zimbabue', code: 'ZW', dialCode: '+263', flag: '🇿🇼' },
];

// Combined full list
export const COUNTRIES: Country[] = [...SUGGESTED_COUNTRIES, ...ALL_OTHER_COUNTRIES];


~/Git/beeapp_ai/Fronted/apps/mobile/app/(auth)/app-lock-setup.tsx
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
