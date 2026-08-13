import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  loginUser,
  requestPhoneOtp,
} from '@beeapp/api-client';

import AnimatedLogo from '../../src/components/AnimatedLogo';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import {
  saveAuthSession,
} from '../../src/services/authSession';
import {
  COUNTRIES,
  type Country,
} from '../../src/mocks/countries';


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

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export default function LoginScreen() {
  const router = useRouter();

  const [loginMethod, setLoginMethod] =
    useState<LoginMethod>('otp');

  const [selectedCountry, setSelectedCountry] =
    useState<Country>(COUNTRIES[0]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isPasswordVisible, setIsPasswordVisible] =
    useState(false);

  const [isCountryModalVisible, setIsCountryModalVisible] =
    useState(false);

  const [countrySearch, setCountrySearch] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = countrySearch
      .trim()
      .toLowerCase();

    if (!normalizedQuery) {
      return COUNTRIES;
    }

    return COUNTRIES.filter(
      (country) =>
        country.name
          .toLowerCase()
          .includes(normalizedQuery) ||
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

  const changeLoginMethod = (
    nextMethod: LoginMethod,
  ) => {
    setLoginMethod(nextMethod);
    setErrors({});
    setFormMessage('');
    Keyboard.dismiss();
  };

  const handleOtpContinue = async () => {
    const normalizedPhoneNumber = normalizePhoneNumber(
      phoneNumber,
    );

    if (
      normalizedPhoneNumber.length < 7 ||
      normalizedPhoneNumber.length > 15
    ) {
      setErrors({
        phoneNumber: 'Ingresa un número de celular válido.',
      });
      return;
    }

    const phone = (
      selectedCountry.dialCode + normalizedPhoneNumber
    ).replace(/\s/g, '');

    try {
      setIsSubmitting(true);
      setErrors({});
      setFormMessage('');

      await requestPhoneOtp({
        phone,
      });

      router.push({
        pathname: '/(auth)/verify',
        params: {
          phone,
          phoneNumber: normalizedPhoneNumber,
          dialCode: selectedCountry.dialCode,
          flag: selectedCountry.flag,
        },
      });
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : (
              'No fue posible solicitar el código. '
              + 'Inténtalo nuevamente.'
            ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordContinue = async () => {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email =
        'Ingresa un correo electrónico válido.';
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

    try {
      setIsSubmitting(true);
      setErrors({});
      setFormMessage('');

      const response = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      await saveAuthSession({
        session: response.session,
        user: response.user,
      });

      router.replace('/(auth)/app-lock-setup');
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : (
              'No fue posible iniciar sesión. '
              + 'Inténtalo nuevamente.'
            ),
      );
    } finally {
      setIsSubmitting(false);
    }
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
                    loginMethod === 'otp' &&
                      styles.methodButtonActive,
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
                          Si el número está registrado, recibirás un
                          código de verificación por SMS.
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.fieldLabel}>
                      Número de celular
                    </Text>

                    <View
                      style={[
                        styles.phoneInputContainer,
                        errors.phoneNumber
                          ? styles.inputContainerError
                          : undefined,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.prefixBadge}
                        activeOpacity={0.7}
                        onPress={openCountryModal}
                        disabled={isSubmitting}
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
                        editable={!isSubmitting}
                        onChangeText={(value) => {
                          setPhoneNumber(
                            normalizePhoneNumber(value),
                          );
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
                        Si el número existe en BeeApp, enviaremos un
                        código de seis dígitos.
                      </Text>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        isSubmitting &&
                          styles.primaryButtonDisabled,
                      ]}
                      activeOpacity={0.8}
                      disabled={isSubmitting}
                      onPress={handleOtpContinue}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator
                          color={colors.neutral.white}
                        />
                      ) : (
                        <>
                          <Text style={styles.primaryButtonText}>
                            Continuar con SMS
                          </Text>

                          <MessageSquare
                            size={18}
                            color={colors.neutral.white}
                          />
                        </>
                      )}
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
                          errors.email
                            ? styles.inputContainerError
                            : undefined,
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
                          editable={!isSubmitting}
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
                      <Text style={styles.fieldLabel}>
                        Contraseña
                      </Text>

                      <View
                        style={[
                          styles.textInputContainer,
                          errors.password
                            ? styles.inputContainerError
                            : undefined,
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
                          editable={!isSubmitting}
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
                            setIsPasswordVisible(
                              (currentValue) => !currentValue,
                            );
                          }}
                          disabled={isSubmitting}
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
                      style={[
                        styles.primaryButton,
                        isSubmitting &&
                          styles.primaryButtonDisabled,
                      ]}
                      activeOpacity={0.8}
                      disabled={isSubmitting}
                      onPress={handlePasswordContinue}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator
                          color={colors.neutral.white}
                        />
                      ) : (
                        <>
                          <Text style={styles.primaryButtonText}>
                            Iniciar sesión
                          </Text>

                          <Mail
                            size={18}
                            color={colors.neutral.white}
                          />
                        </>
                      )}
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
                  <Text style={styles.registerLink}>
                    Regístrate
                  </Text>
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
                  <Text style={styles.modalTitle}>
                    Selecciona un país
                  </Text>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsCountryModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>
                      Cerrar
                    </Text>
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
                      <Text style={styles.countryFlag}>
                        {item.flag}
                      </Text>

                      <Text style={styles.countryName}>
                        {item.name}
                      </Text>

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
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  formMessage: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    padding: 11,
  },
  formMessageText: {
    color: colors.semantic.error,
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