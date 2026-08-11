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
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import AnimatedLogo from '../../src/components/AnimatedLogo';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { COUNTRIES, type Country } from '../../src/mocks/countries';

type LoginMethod = 'otp' | 'password';

type FormErrors = {
  email?: string;
  password?: string;
  phoneNumber?: string;
};

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

export default function LoginScreen() {
  const router = useRouter();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('otp');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES[0],
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState('');

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

  const clearFieldError = (field: keyof FormErrors) => {
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));

    if (formMessage) {
      setFormMessage('');
    }
  };

  const changeLoginMethod = (nextMethod: LoginMethod) => {
    setLoginMethod(nextMethod);
    setErrors({});
    setFormMessage('');
    Keyboard.dismiss();
  };

  const handleOtpContinue = () => {
    const normalizedPhoneNumber = phoneNumber.replace(/\D/g, '');

    if (
      normalizedPhoneNumber.length < 7 ||
      normalizedPhoneNumber.length > 15
    ) {
      setErrors({
        phoneNumber: 'Ingresa un número de celular válido.',
      });
      return;
    }

    setErrors({});
    setFormMessage(
      'El acceso por SMS estará disponible cuando configuremos el proveedor OTP.',
    );
  };

  const handlePasswordContinue = () => {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password) {
      nextErrors.password = 'Ingresa tu contraseña.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password =
        'La contraseña debe tener al menos 8 caracteres.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setFormMessage(
      'El inicio de sesión con correo estará disponible en la siguiente integración.',
    );
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
                  size={76}
                  showText={false}
                  autoStopAfter={2500}
                />
              </View>

              <Text style={styles.title}>Inicia sesión</Text>

              <Text style={styles.subtitle}>
                Elige cómo quieres acceder a tu cuenta de BeeApp AI.
              </Text>

              <View style={styles.methodSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    loginMethod === 'otp' && styles.methodButtonActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => changeLoginMethod('otp')}
                >
                  <MessageSquare
                    size={16}
                    color={
                      loginMethod === 'otp'
                        ? colors.neutral.white
                        : colors.neutral.gray600
                    }
                  />

                  <Text
                    style={[
                      styles.methodButtonText,
                      loginMethod === 'otp' &&
                        styles.methodButtonTextActive,
                    ]}
                  >
                    Mensaje SMS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    loginMethod === 'password' &&
                      styles.methodButtonActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => changeLoginMethod('password')}
                >
                  <Mail
                    size={16}
                    color={
                      loginMethod === 'password'
                        ? colors.neutral.white
                        : colors.neutral.gray600
                    }
                  />

                  <Text
                    style={[
                      styles.methodButtonText,
                      loginMethod === 'password' &&
                        styles.methodButtonTextActive,
                    ]}
                  >
                    Correo
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputCard}>
                {loginMethod === 'otp' ? (
                  <>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIcon}>
                        <Phone
                          size={18}
                          color={colors.brand.primary}
                        />
                      </View>

                      <View style={styles.cardHeaderContent}>
                        <Text style={styles.inputLabel}>
                          Acceso por mensaje
                        </Text>

                        <Text style={styles.inputDescription}>
                          Recibirás un código de verificación por SMS.
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.fieldLabel}>
                      Número de celular
                    </Text>

                    <View
                      style={[
                        styles.phoneInputContainer,
                        errors.phoneNumber && styles.inputContainerError,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.prefixBadge}
                        activeOpacity={0.7}
                        onPress={openCountryModal}
                      >
                        <Text style={styles.flag}>
                          {selectedCountry.flag}
                        </Text>

                        <Text style={styles.prefixText}>
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
                        Podrás usar este método cuando el servicio SMS esté
                        habilitado.
                      </Text>
                    )}

                    <TouchableOpacity
                      style={styles.primaryButton}
                      activeOpacity={0.8}
                      onPress={handleOtpContinue}
                    >
                      <Text style={styles.primaryButtonText}>
                        Continuar con SMS
                      </Text>

                      <MessageSquare
                        size={18}
                        color={colors.neutral.white}
                      />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIcon}>
                        <Mail
                          size={18}
                          color={colors.brand.primary}
                        />
                      </View>

                      <View style={styles.cardHeaderContent}>
                        <Text style={styles.inputLabel}>
                          Acceso con correo
                        </Text>

                        <Text style={styles.inputDescription}>
                          Usa el correo y contraseña de tu cuenta.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Correo electrónico
                      </Text>

                      <View
                        style={[
                          styles.textInputContainer,
                          errors.email && styles.inputContainerError,
                        ]}
                      >
                        <Mail
                          size={17}
                          color={colors.neutral.gray500}
                        />

                        <TextInput
                          style={styles.textInput}
                          placeholder="tu@correo.com"
                          placeholderTextColor={colors.neutral.gray500}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                          value={email}
                          onChangeText={(value) => {
                            setEmail(value);
                            clearFieldError('email');
                          }}
                        />
                      </View>

                      {errors.email ? (
                        <Text style={styles.errorText}>
                          {errors.email}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.passwordGroup}>
                      <Text style={styles.fieldLabel}>Contraseña</Text>

                      <View
                        style={[
                          styles.textInputContainer,
                          errors.password && styles.inputContainerError,
                        ]}
                      >
                        <LockKeyhole
                          size={17}
                          color={colors.neutral.gray500}
                        />

                        <TextInput
                          style={styles.textInput}
                          placeholder="Ingresa tu contraseña"
                          placeholderTextColor={colors.neutral.gray500}
                          autoCapitalize="none"
                          autoComplete="password"
                          secureTextEntry={!isPasswordVisible}
                          value={password}
                          onChangeText={(value) => {
                            setPassword(value);
                            clearFieldError('password');
                          }}
                        />

                        <TouchableOpacity
                          style={styles.visibilityButton}
                          activeOpacity={0.7}
                          onPress={() => {
                            setIsPasswordVisible((currentValue) => !currentValue);
                          }}
                        >
                          {isPasswordVisible ? (
                            <EyeOff
                              size={18}
                              color={colors.neutral.gray500}
                            />
                          ) : (
                            <Eye
                              size={18}
                              color={colors.neutral.gray500}
                            />
                          )}
                        </TouchableOpacity>
                      </View>

                      {errors.password ? (
                        <Text style={styles.errorText}>
                          {errors.password}
                        </Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={styles.forgotPasswordButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        setFormMessage(
                          'La recuperación de contraseña estará disponible próximamente.',
                        );
                      }}
                    >
                      <Text style={styles.forgotPasswordText}>
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryButton}
                      activeOpacity={0.8}
                      onPress={handlePasswordContinue}
                    >
                      <Text style={styles.primaryButtonText}>
                        Iniciar sesión
                      </Text>

                      <Mail
                        size={18}
                        color={colors.neutral.white}
                      />
                    </TouchableOpacity>
                  </>
                )}

                {formMessage ? (
                  <View style={styles.formMessage}>
                    <Text style={styles.formMessageText}>
                      {formMessage}
                    </Text>
                  </View>
                ) : null}
              </View>

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
                        clearFieldError('phoneNumber');
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
    marginBottom: 16,
    marginTop: Platform.OS === 'ios' ? 34 : 18,
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
    marginBottom: 22,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  methodSwitcher: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
  },
  methodButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 42,
  },
  methodButtonActive: {
    backgroundColor: colors.brand.primary,
    elevation: 2,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  methodButtonText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 7,
  },
  methodButtonTextActive: {
    color: colors.neutral.white,
  },
  inputCard: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    padding: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 20,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EAFF',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginRight: 11,
    width: 38,
  },
  cardHeaderContent: {
    flex: 1,
  },
  inputLabel: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  inputDescription: {
    color: colors.neutral.gray600,
    fontSize: 11,
    lineHeight: 16,
  },
  fieldLabel: {
    color: colors.neutral.gray700,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
  },
  fieldGroup: {
    marginBottom: 15,
  },
  passwordGroup: {
    marginBottom: 4,
  },
  phoneInputContainer: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    marginBottom: 1,
    paddingRight: 12,
  },
  prefixBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 11,
  },
  flag: {
    fontSize: 17,
    marginRight: 5,
  },
  prefixText: {
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
  textInputContainer: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    paddingHorizontal: 13,
  },
  inputContainerError: {
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
  helperText: {
    color: colors.neutral.gray500,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: 9,
  },
  forgotPasswordText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
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
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  formMessage: {
    backgroundColor: '#F0EAFF',
    borderColor: '#D9CAFF',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    padding: 11,
  },
  formMessageText: {
    color: colors.brand.primary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  registerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    marginRight: 5,
  },
  registerLink: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
    paddingTop: 20,
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


~/Git/beeapp_ai/Fronted/apps/mobile/app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppLockScreen from '../src/components/security/AppLockScreen';

export default function RootLayout() {
  return (
    // Root for gesture-driven UI (e.g. drag & drop in the Home customizer)
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Provides the device insets (status bar, notch) to every screen */}
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#6025d2' },
          }}
        />
        <AppLockScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


~/Git/beeapp_ai/Fronted/apps/mobile/app/index.tsx
import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import Svg, { Path } from 'react-native-svg';
import AnimatedLogo from '../src/components/AnimatedLogo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Generates an SVG path representing a periodic curved line (sinusoidal-like) over 3 * width
const getLinePath = (w: number, startY: number, amp: number) => {
  return `M 0,${startY} Q ${w * 0.25},${startY - amp} ${w * 0.5},${startY} T ${w},${startY} T ${w * 1.5},${startY} T ${w * 2},${startY} T ${w * 2.5},${startY} T ${w * 3},${startY}`;
};

export default function SplashScreen() {
  const router = useRouter();

  // Fade-in animation for logo, spinner, and text
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animation values for horizontal wave movements
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;
  const wave3Anim = useRef(new Animated.Value(0)).current;
  const wave4Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Loop Wave 1 (moving left)
    Animated.loop(
      Animated.timing(wave1Anim, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loop Wave 2 (moving right)
    Animated.loop(
      Animated.timing(wave2Anim, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loop Wave 3 (moving left)
    Animated.loop(
      Animated.timing(wave3Anim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loop Wave 4 (moving right)
    Animated.loop(
      Animated.timing(wave4Anim, {
        toValue: 1,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Transition to login after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, wave1Anim, wave2Anim, wave3Anim, wave4Anim, router]);

  // Interpolating translations to achieve seamless infinite loops
  const wave1TranslateX = wave1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const wave2TranslateX = wave2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, 0],
  });

  const wave3TranslateX = wave3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const wave4TranslateX = wave4Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, 0],
  });

  return (
    <View style={styles.container}>
      {/* ── Background: Flowing Trajectory Paths (Background Paths style) ── */}
      <View style={StyleSheet.absoluteFill}>
        {/* Layer 1 (Top third, rotating diagonal flow) */}
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.1,
              height: 120,
              transform: [
                { rotate: '-10deg' },
                { translateX: wave1TranslateX },
              ],
            },
          ]}
        >
          <Svg width={SCREEN_WIDTH * 3} height={120}>
            <Path
              d={getLinePath(SCREEN_WIDTH, 60, 30)}
              fill="none"
              stroke={colors.brand.primary}
              strokeWidth={1.5}
              opacity={0.07}
            />
          </Svg>
        </Animated.View>

        {/* Layer 2 (Upper-middle, flowing opposite) */}
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.32,
              height: 160,
              transform: [
                { rotate: '12deg' },
                { translateX: wave2TranslateX },
              ],
            },
          ]}
        >
          <Svg width={SCREEN_WIDTH * 3} height={160}>
            <Path
              d={getLinePath(SCREEN_WIDTH, 80, 45)}
              fill="none"
              stroke={colors.brand.dark}
              strokeWidth={2}
              opacity={0.08}
            />
          </Svg>
        </Animated.View>

        {/* Layer 3 (Lower-middle) */}
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.55,
              height: 140,
              transform: [
                { rotate: '-8deg' },
                { translateX: wave3TranslateX },
              ],
            },
          ]}
        >
          <Svg width={SCREEN_WIDTH * 3} height={140}>
            <Path
              d={getLinePath(SCREEN_WIDTH, 70, 35)}
              fill="none"
              stroke={colors.brand.primary}
              strokeWidth={2.5}
              opacity={0.06}
            />
          </Svg>
        </Animated.View>

        {/* Layer 4 (Bottom, thin line) */}
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.76,
              height: 120,
              transform: [
                { rotate: '15deg' },
                { translateX: wave4TranslateX },
              ],
            },
          ]}
        >
          <Svg width={SCREEN_WIDTH * 3} height={120}>
            <Path
              d={getLinePath(SCREEN_WIDTH, 60, 25)}
              fill="none"
              stroke={colors.brand.dark}
              strokeWidth={1}
              opacity={0.11}
            />
          </Svg>
        </Animated.View>
      </View>

      {/* ── Content Foreground ── */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Animated Logo (rotating wings visible behind, size 100, real text) */}
        <AnimatedLogo size={100} showText={true} />

        {/* Brand-colored spinner */}
        <ActivityIndicator size="large" color={colors.brand.primary} style={styles.spinner} />

        {/* Loading messages */}
        <Text style={styles.title}>Iniciando tu espacio seguro...</Text>
        <Text style={styles.subtitle}>Todo lo importante, en un solo lugar.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure white background
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  animatedPathWrapper: {
    position: 'absolute',
    left: -SCREEN_WIDTH, // Center the wide path canvas to ensure no cutoff on translation
    width: SCREEN_WIDTH * 3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 10,
  },
  spinner: {
    marginVertical: 32,
  },
  title: {
    color: colors.brand.primary, // Brand purple for contrast
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.neutral.gray600, // Medium gray for contrast
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});


~/Git/beeapp_ai/Fronted/apps/mobile/package.json
{
  "name": "@beeapp/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "type-check": "tsc --noEmit",
    "postinstall": "node scripts/patch-expo-router.js"
  },
  "dependencies": {
    "@beeapp/api-client": "*",
    "@beeapp/design-system": "*",
    "@beeapp/shared-types": "*",
    "expo": "~51.0.0",
    "expo-dev-client": "~4.0.26",
    "expo-router": "~3.5.24",
    "expo-status-bar": "~1.12.1",
    "lucide-react-native": "^1.25.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-native": "0.74.5",
    "react-native-draggable-flatlist": "^4.0.3",
    "react-native-gesture-handler": "~2.16.1",
    "react-native-reanimated": "~3.10.1",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    "react-native-svg": "15.2.0",
    "react-native-web": "~0.19.10"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@beeapp/config": "*",
    "@types/react": "~18.2.45",
    "typescript": "^5.4.0"
  }
}

~/Git/beeapp_ai/Fronted/apps/mobile/tsconfig.json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"],
      "@beeapp/api-client": ["../../packages/api-client/src"],
      "@beeapp/design-system": ["../../packages/design-system"],
      "@beeapp/shared-types": ["../../packages/shared-types"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}

~/Git/beeapp_ai/Fronted/apps/mobile/app.json
{
  "expo": {
    "name": "BeeApp AI",
    "slug": "beeapp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./src/assets/logo.png",
    "scheme": "beeapp",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./src/assets/logo.png",
      "resizeMode": "contain",
      "backgroundColor": "#6025d2"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.beeapp.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./src/assets/logo.png",
        "backgroundColor": "#6025d2"
      },
      "package": "com.beeapp.mobile"
    },
    "web": {
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      "expo-dev-client",
      "./withMonorepoSettings.js"
    ]
  }
}

~/Git/beeapp_ai/Fronted/packages/api-client/src/client.ts
const expoApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const nextApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const configuredApiBaseUrl = expoApiBaseUrl || nextApiBaseUrl;

if (!configuredApiBaseUrl) {
    throw new Error(
        `Backend URL is missing. EXPO_PUBLIC_API_BASE_URL=${String(
        expoApiBaseUrl
        )}, NEXT_PUBLIC_API_BASE_URL=${String(nextApiBaseUrl)}`
    );
}

export const API_BASE_URL: string = configuredApiBaseUrl;

export interface ApiErrorResponse {
    detail?: string;
    message?: string;
    error?: string;
    [key: string]: unknown;
}

export interface ApiRequestOptions
    extends Omit<RequestInit, "body" | "headers"> {
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
}

function buildUrl(endpoint: string): string {
    const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");
    const normalizedEndpoint = endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;

    return `${normalizedBaseUrl}${normalizedEndpoint}`;
}

async function request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
    ): Promise<T> {
    const { body, token, headers, ...fetchOptions } = options;

    const response = await fetch(buildUrl(endpoint), {
        ...fetchOptions,
        headers: {
        Accept: "application/json",
        ...(body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        let errorMessage = `Error ${response.status}: backend request failed.`;

        try {
        const errorData: ApiErrorResponse = await response.json();

        errorMessage =
            errorData.detail ||
            errorData.message ||
            errorData.error ||
            errorMessage;
        } catch {
        // Keep the default message when the response is not JSON.
        }

        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export const api = {
    get<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, "method"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "GET"
        });
    },

    post<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "POST",
        body
        });
    },

    put<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "PUT",
        body
        });
    },

    patch<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "PATCH",
        body
        });
    },

    delete<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, "method"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "DELETE"
        });
    }
};

export function getApiUrl(endpoint: string): string {
    return buildUrl(endpoint);
}

~/Git/beeapp_ai/Fronted/packages/api-client/src/accounts.ts
import type {
    RegisterUserPayload,
    RegisterUserResponse,
} from '@beeapp/shared-types';

import { api } from './client';

export function registerUser(
    payload: RegisterUserPayload,
    ): Promise<RegisterUserResponse> {
    return api.post<RegisterUserResponse>(
        '/accounts/register/',
        payload,
    );
}

~/Git/beeapp_ai/Fronted/packages/api-client/src/index.ts
export * from './client';
export * from './accounts';

~/Git/beeapp_ai/Fronted/packages/shared-types/src/index.ts


export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

export interface BaseUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface RegisterUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_dial_code: string;
  phone_number: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  phone_dial_code: string;
  phone_number: string;
  role: UserRole;
}

export interface RegisterUserResponse {
  message: string;
  user: RegisteredUser;
}






andres-mendoza@gordosaurioPc:~/Git/beeapp_ai/Fronted/apps/mobile$ cd ~/Git/beeapp_ai/Fronted/apps/mobile

tree src/stores -L 3
tree src/services -L 3
tree src/lib -L 3
src/stores
├── appLockStore.ts
├── calendarStore.ts
├── pinStore.ts
└── storageStore.ts

1 directory, 4 files
src/services

0 directories, 0 files
src/lib

0 directories, 0 files



andres-mendoza@gordosaurioPc:~/Git/beeapp_ai/Fronted/apps/mobile$ cd ~/Git/beeapp_ai/Fronted

grep -RInE \
'AsyncStorage|SecureStore|expo-secure-store|access_token|refresh_token|session|authStore|logout' \
apps/mobile/src apps/mobile/app packages \
--exclude-dir=node_modules