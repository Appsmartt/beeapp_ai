~/Git/beeapp_ai/Fronted/apps/mobile/app/(auth)/login.tsx
import { useState, useRef } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import AnimatedLogo from '../../src/components/AnimatedLogo';

import { COUNTRIES, Country } from '../../src/mocks/countries';

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleContinue = () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 7 || cleaned.length > 15) {
      setError('Ingresa un número celular válido.');
      return;
    }
    setError('');
    router.push({
      pathname: '/(auth)/verify',
      params: { 
        from: 'login', 
        phone: cleaned,
        dialCode: selectedCountry.dialCode,
        flag: selectedCountry.flag
      },
    });
  };

  // TEMPORAL DEVELOPMENT BYPASS: Double tap skips OTP & Onboarding directly to main dashboard
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }
      router.replace('/(main)');
    } else {
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
      }
      tapTimeout.current = setTimeout(() => {
        handleContinue();
        tapTimeout.current = null;
      }, DOUBLE_TAP_DELAY);
    }
    lastTap.current = now;
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery)
  );

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            {/* Main Content Container */}
            <View style={styles.contentContainer}>
              {/* Animated Logo (without text, autoStopAfter 2.5s) */}
              <View style={styles.logoContainer}>
                <AnimatedLogo size={80} showText={false} autoStopAfter={2500} />
              </View>

              <Text style={styles.title}>Inicia Sesión</Text>
              <Text style={styles.subtitle}>
                Ingresa tu número celular para continuar.
              </Text>

              {/* Phone Input Box */}
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Número Telefónico</Text>
                <View style={styles.phoneInputContainer}>
                  {/* Selectable Prefix with Flag */}
                  <TouchableOpacity
                    style={styles.prefixBadge}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSearchQuery('');
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.flag}>{selectedCountry.flag}</Text>
                    <Text style={styles.prefixText}>{selectedCountry.dialCode}</Text>
                  </TouchableOpacity>

                  {/* Editable Phone Field */}
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="300 000 0000"
                    placeholderTextColor={colors.neutral.gray500}
                    keyboardType="number-pad"
                    maxLength={15}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text.replace(/\D/g, ''));
                      if (error) setError('');
                    }}
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handlePress}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>

            {/* Legal Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerNotice}>
                Al continuar, aceptas nuestros{' '}
              </Text>
              <View style={styles.footerLinksRow}>
                <TouchableOpacity onPress={() => router.push('/(auth)/terms')}>
                  <Text style={styles.footerLink}>Términos y Condiciones</Text>
                </TouchableOpacity>
                <Text style={styles.footerDot}> • </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/privacy')}>
                  <Text style={styles.footerLink}>Política de Privacidad</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Country Selector Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecciona un País</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>

                {/* Country Search Bar */}
                <TextInput
                  style={styles.searchBar}
                  placeholder="Buscar país o indicativo..."
                  placeholderTextColor={colors.neutral.gray500}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
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
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.countryFlag}>{item.flag}</Text>
                      <Text style={styles.countryName}>{item.name}</Text>
                      <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 300 }}
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 20,
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
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  flag: {
    fontSize: 16,
    marginRight: 6,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '400',
    color: colors.neutral.text,
    paddingVertical: 8,
    letterSpacing: 1,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    marginTop: 8,
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
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  footerNotice: {
    fontSize: 12,
    color: colors.neutral.gray500,
    marginBottom: 4,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  footerDot: {
    fontSize: 12,
    color: colors.neutral.gray500,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.neutral.gray100,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  searchBar: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 14,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  countryDialCode: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.brand.primary,
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

~/Git/beeapp_ai/Fronted/apps/mobile/babel.config.js
const path = require('path');

module.exports = function (api) {
  api.cache(true);
  
  // Use absolute path to guarantee Babel finds the app directory regardless of hoisting
  process.env.EXPO_ROUTER_APP_ROOT = path.resolve(__dirname, 'app');
  
  return {
    presets: ['babel-preset-expo'],
    // Required by react-native-reanimated (drag & drop); must stay last
    plugins: ['react-native-reanimated/plugin'],
  };
};


~/Git/beeapp_ai/Fronted/apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Only watch source directories — NOT node_modules.
//    Metro can RESOLVE modules from nodeModulesPaths without watching them.
//    Watching all of node_modules causes EMFILE (too many open files) on macOS.
config.watchFolders = [
  // Watch shared packages source code so edits trigger hot reload
  path.resolve(workspaceRoot, 'packages'),
  // The projectRoot (apps/mobile) is always watched automatically
];

// 2. Tell Metro where to find modules for resolution (separate from watching)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Allow hierarchical lookup so Metro reliably resolves hoisted packages
config.resolver.disableHierarchicalLookup = false;

module.exports = config;


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

~/Git/beeapp_ai/Fronted/apps/mobile/withMonorepoSettings.js
const { withSettingsGradle, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withMonorepoSettings(config) {
  config = withSettingsGradle(config, (config) => {
    if (config.modResults.contents.includes('useExpoModules()')) {
      config.modResults.contents = config.modResults.contents.replace(
        'useExpoModules()',
        `useExpoModules([
  searchPaths: [
    new File(rootDir, "../../../node_modules").absolutePath
  ]
])`
      );
    }
    return config;
  });

  // Increase Gradle Daemon memory to prevent Java heap space errors during Hermes Jetifier transformation
  config = withGradleProperties(config, (config) => {
    const jvmArgsIndex = config.modResults.findIndex(item => item.key === 'org.gradle.jvmargs');
    if (jvmArgsIndex !== -1) {
      config.modResults[jvmArgsIndex].value = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';
    } else {
      config.modResults.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m'
      });
    }
    return config;
  });

  return config;
};


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


~/Git/beeapp_ai/Fronted/apps/mobile/src/components/contacts/CountryCodeModal.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Search } from 'lucide-react-native';
import { COUNTRIES, Country } from '../../mocks/countries';

interface CountryCodeModalProps {
  visible: boolean;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

/** Country dial-code picker of the new contact form */
export default function CountryCodeModal({ visible, onSelect, onClose }: CountryCodeModalProps) {
  const [query, setQuery] = useState('');

  const text = query.trim().toLowerCase();
  const results = COUNTRIES.filter(
    (country) => country.name.toLowerCase().includes(text) || country.dialCode.includes(text)
  );

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Indicativo del país</Text>

          <View style={styles.searchBar}>
            <Search size={16} color={colors.neutral.gray500} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar país"
              placeholderTextColor={colors.neutral.gray500}
            />
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {results.map((country) => (
              <TouchableOpacity
                key={`${country.code}-${country.dialCode}`}
                style={styles.row}
                onPress={() => onSelect(country)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowName} numberOfLines={1}>
                  {country.name}
                </Text>
                <Text style={styles.rowCode}>{country.dialCode}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.4)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral.gray100,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text, padding: 0 },
  list: { marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  rowName: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  rowCode: { fontSize: 13, fontWeight: '400', color: colors.neutral.gray600 },
});


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


~/Git/beeapp_ai/Fronted/apps/mobile/src/constants/.gitkeep
vacio 
