import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  type AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';

import AnimatedLogo from '../AnimatedLogo';
import AppLockPinPad from './AppLockPinPad';
import BiometricButton from './BiometricButton';
import {
  authenticateWithBiometrics,
} from '../../services/biometricService';
import {
  clearAuthSession,
  getAuthSession,
} from '../../services/authSession';
import {
  getAppLockMethod,
  hasAppLockConfigured,
  registerAppLockFailure,
  resetAppLockFailures,
  verifyAppLockPin,
  type AppLockMethod,
} from '../../stores/appLockStore';

const MAX_FAILED_ATTEMPTS = 5;

function getMethodTitle(method: AppLockMethod): string {
  if (method === 'faceid') {
    return 'Desbloquea con Face ID';
  }

  if (method === 'fingerprint') {
    return 'Desbloquea con tu huella';
  }

  return 'Ingresa tu código de acceso';
}

function getMethodSubtitle(method: AppLockMethod): string {
  if (method === 'faceid') {
    return 'Usa Face ID para continuar en BeeApp.';
  }

  if (method === 'fingerprint') {
    return 'Usa tu huella dactilar para continuar en BeeApp.';
  }

  return 'Digita tu PIN de 6 dígitos para desbloquear la app.';
}

export default function AppLockScreen() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  const [locked, setLocked] = useState(false);

  const [method, setMethod] =
    useState<AppLockMethod | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isAuthenticating, setIsAuthenticating] =
    useState(false);

  const [pinError, setPinError] =
    useState<string | null>(null);

  const [failureMessage, setFailureMessage] =
    useState('');

  const loadLockState = async (
    shouldLock: boolean,
  ) => {
    const session = await getAuthSession();

    if (!session) {
      setMethod(null);
      setLocked(false);
      setIsLoading(false);
      return;
    }

    const configured = await hasAppLockConfigured();

    if (!configured) {
      setMethod(null);
      setLocked(false);
      setIsLoading(false);
      return;
    }

    const configuredMethod =
      await getAppLockMethod();

    setMethod(configuredMethod);
    setLocked(shouldLock);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadLockState(true);
  }, []);

  useEffect(() => {
    const handleAppStateChange = (
      nextAppState: AppStateStatus,
    ) => {
      const isReturningToForeground =
        appState.current.match(/inactive|background/)
        && nextAppState === 'active';

      appState.current = nextAppState;

      if (isReturningToForeground) {
        setPinError(null);
        setFailureMessage('');
        void loadLockState(true);
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => subscription.remove();
  }, []);

  const closeSessionAfterTooManyFailures = async () => {
    await clearAuthSession();

    setLocked(false);
    setMethod(null);

    router.replace('/(auth)/login');
  };

  const registerFailure = async () => {
    const failures = await registerAppLockFailure();

    if (failures >= MAX_FAILED_ATTEMPTS) {
      await closeSessionAfterTooManyFailures();
      return;
    }

    const attemptsLeft =
      MAX_FAILED_ATTEMPTS - failures;

    setFailureMessage(
      `Intento incorrecto. Te quedan ${attemptsLeft} intento${
        attemptsLeft === 1 ? '' : 's'
      }.`,
    );
  };

  const handleUnlockSuccess = async () => {
    await resetAppLockFailures();

    setPinError(null);
    setFailureMessage('');
    setLocked(false);
  };

  const handlePinSubmit = async (pin: string) => {
    const validPin = await verifyAppLockPin(pin);

    if (validPin) {
      await handleUnlockSuccess();
      return;
    }

    setPinError('Código incorrecto.');
    await registerFailure();
  };

  const handleBiometricPress = async () => {
    if (
      method !== 'fingerprint'
      && method !== 'faceid'
    ) {
      return;
    }

    setFailureMessage('');
    setIsAuthenticating(true);

    try {
      const result =
        await authenticateWithBiometrics(method);

      if (result.success) {
        await handleUnlockSuccess();
        return;
      }

      if (result.rejected) {
        await registerFailure();
        return;
      }

      if (!result.cancelled) {
        setFailureMessage(
          'No fue posible verificar tu identidad. Inténtalo nuevamente.',
        );
      }
    } catch {
      setFailureMessage(
        'No fue posible verificar tu identidad. Inténtalo nuevamente.',
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleForgotPin = async () => {
    await clearAuthSession();

    setLocked(false);
    setMethod(null);

    router.replace('/(auth)/login');
  };

  if (isLoading || !locked || !method) {
    return null;
  }

  const biometricMethod =
    method === 'fingerprint' || method === 'faceid'
      ? method
      : null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <AnimatedLogo
            size={70}
            showText
          />
        </View>

        {biometricMethod ? (
          <View style={styles.biometricContainer}>
            <Text style={styles.lockTitle}>
              {getMethodTitle(biometricMethod)}
            </Text>

            <Text style={styles.lockSubtitle}>
              {getMethodSubtitle(biometricMethod)}
            </Text>

            <BiometricButton
              method={biometricMethod}
              onPress={() => {
                void handleBiometricPress();
              }}
              loading={isAuthenticating}
            />

            {failureMessage ? (
              <Text style={styles.errorText}>
                {failureMessage}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.pinContainer}>
            <AppLockPinPad
              title={getMethodTitle(method)}
              subtitle={getMethodSubtitle(method)}
              onComplete={(pin) => {
                void handlePinSubmit(pin);
              }}
              error={pinError}
            />

            {failureMessage ? (
              <Text style={styles.errorText}>
                {failureMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => {
                void handleForgotPin();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotButtonText}>
                ¿Olvidaste tu código o no puedes acceder?
              </Text>

              <Text style={styles.forgotButtonLink}>
                Cierra sesión e inicia nuevamente.
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 999,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    elevation: 10,
    maxWidth: 360,
    paddingHorizontal: 20,
    paddingVertical: 28,
    shadowColor: '#000000',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    width: '100%',
  },
  logoContainer: {
    marginBottom: 16,
  },
  biometricContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pinContainer: {
    width: '100%',
  },
  lockTitle: {
    color: colors.neutral.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    textAlign: 'center',
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  forgotButtonText: {
    color: colors.neutral.gray600,
    fontSize: 11,
    textAlign: 'center',
  },
  forgotButtonLink: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});