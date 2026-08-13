import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  Fingerprint,
  KeyRound,
  ScanFace,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import AppLockPinPad from './AppLockPinPad';
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  type BiometricAvailability,
} from '../../services/biometricService';
import {
  enableAppLock,
  type AppLockMethod,
} from '../../stores/appLockStore';

type AppLockSetupScreenProps = {
  onComplete: () => void;
};

type SetupMode =
  | 'loading'
  | 'select'
  | 'pin-create'
  | 'pin-confirm'
  | 'success';

type LockMethodOption =
  | 'fingerprint'
  | 'faceid'
  | 'pin';

type OptionCardProps = {
  method: LockMethodOption;
  title: string;
  subtitle: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

function OptionCard({
  method,
  title,
  subtitle,
  disabled = false,
  loading = false,
  onPress,
}: OptionCardProps) {
  const Icon =
    method === 'fingerprint'
      ? Fingerprint
      : method === 'faceid'
        ? ScanFace
        : KeyRound;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        disabled && styles.cardDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled || loading}
    >
      <View
        style={[
          styles.cardIconCircle,
          disabled && styles.cardIconCircleDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.brand.primary}
          />
        ) : (
          <Icon
            size={24}
            color={
              disabled
                ? colors.neutral.gray400
                : colors.brand.primary
            }
          />
        )}
      </View>

      <View style={styles.cardTexts}>
        <Text
          style={[
            styles.cardTitle,
            disabled && styles.cardTitleDisabled,
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.cardSubtitle,
            disabled && styles.cardSubtitleDisabled,
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getUnavailableText(
  availability: BiometricAvailability,
  supported: boolean,
): string {
  if (!availability.hardwareAvailable) {
    return 'No disponible en este dispositivo.';
  }

  if (!availability.enrolled) {
    return 'Configúrala en los ajustes del dispositivo.';
  }

  if (!supported) {
    return 'No disponible en este dispositivo.';
  }

  return 'No disponible.';
}

export default function AppLockSetupScreen({
  onComplete,
}: AppLockSetupScreenProps) {
  const [mode, setMode] =
    useState<SetupMode>('loading');

  const [availability, setAvailability] =
    useState<BiometricAvailability | null>(null);

  const [selectedMethod, setSelectedMethod] =
    useState<LockMethodOption | null>(null);

  const [draftPin, setDraftPin] = useState('');
  const [pinError, setPinError] =
    useState<string | null>(null);

  const [biometricError, setBiometricError] =
    useState('');

  const [isAuthenticating, setIsAuthenticating] =
    useState(false);

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const result =
          await getBiometricAvailability();

        setAvailability(result);
      } catch {
        setAvailability({
          fingerprint: false,
          faceid: false,
          hardwareAvailable: false,
          enrolled: false,
        });
      } finally {
        setMode('select');
      }
    };

    void loadAvailability();
  }, []);

  const completeSetup = (
    method: LockMethodOption,
  ) => {
    setSelectedMethod(method);
    setMode('success');

    setTimeout(() => {
      onComplete();
    }, 900);
  };

  const handleBiometricSelection = async (
    method: Extract<
      AppLockMethod,
      'fingerprint' | 'faceid'
    >,
  ) => {
    setSelectedMethod(method);
    setBiometricError('');
    setIsAuthenticating(true);

    try {
      const result =
        await authenticateWithBiometrics(method);

      if (!result.success) {
        if (!result.cancelled) {
          setBiometricError(
            'No fue posible verificar tu identidad. Inténtalo nuevamente.',
          );
        }

        return;
      }

      await enableAppLock(method);
      completeSetup(method);
    } catch {
      setBiometricError(
        'No fue posible configurar la autenticación biométrica.',
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSelectMethod = (
    method: LockMethodOption,
  ) => {
    if (method === 'pin') {
      setSelectedMethod(method);
      setPinError(null);
      setDraftPin('');
      setMode('pin-create');
      return;
    }

    void handleBiometricSelection(method);
  };

  const handlePinCreate = (pin: string) => {
    setDraftPin(pin);
    setPinError(null);
    setMode('pin-confirm');
  };

  const handlePinConfirm = async (pin: string) => {
    if (pin !== draftPin) {
      setPinError(
        'Los códigos no coinciden. Inténtalo de nuevo.',
      );
      setDraftPin('');
      setMode('pin-create');
      return;
    }

    try {
      await enableAppLock('pin', pin);
      completeSetup('pin');
    } catch {
      setPinError(
        'No fue posible guardar el código de acceso.',
      );
    }
  };

  if (mode === 'loading' || !availability) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.brand.primary}
        />

        <Text style={styles.loadingText}>
          Revisando la seguridad de tu dispositivo...
        </Text>
      </View>
    );
  }

  if (mode === 'pin-create') {
    return (
      <View style={styles.pinContainer}>
        <AppLockPinPad
          title="Crea tu código de acceso"
          subtitle="Elige 6 dígitos para proteger el acceso a BeeApp."
          onComplete={handlePinCreate}
          error={pinError}
        />
      </View>
    );
  }

  if (mode === 'pin-confirm') {
    return (
      <View style={styles.pinContainer}>
        <AppLockPinPad
          title="Confirma tu código"
          subtitle="Escribe nuevamente los 6 dígitos para continuar."
          onComplete={(pin) => {
            void handlePinConfirm(pin);
          }}
          error={pinError}
        />
      </View>
    );
  }

  if (mode === 'success') {
    const methodText = selectedMethod === 'pin'
      ? 'Código de acceso configurado correctamente.'
      : 'Autenticación biométrica configurada correctamente.';

    return (
      <View style={styles.successContainer}>
        <CheckCircle2
          size={64}
          color={colors.semantic.success}
        />

        <Text style={styles.successTitle}>
          Seguridad configurada
        </Text>

        <Text style={styles.successSubtitle}>
          {methodText}
        </Text>
      </View>
    );
  }

  const fingerprintDisabled =
    !availability.fingerprint || isAuthenticating;

  const faceIdDisabled =
    !availability.faceid || isAuthenticating;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.viewWrap}>
        <Text style={styles.title}>
          Protege tu cuenta
        </Text>

        <Text style={styles.subtitle}>
          Elige cómo proteger el acceso a tu cuenta cada vez que
          abras BeeApp.
        </Text>

        <OptionCard
          method="fingerprint"
          title="Huella dactilar"
          subtitle={
            availability.fingerprint
              ? 'Usa tu huella para desbloquear.'
              : getUnavailableText(
                availability,
                availability.fingerprint,
              )
          }
          disabled={fingerprintDisabled}
          loading={
            isAuthenticating
            && selectedMethod === 'fingerprint'
          }
          onPress={() => handleSelectMethod('fingerprint')}
        />

        <OptionCard
          method="faceid"
          title="Face ID"
          subtitle={
            availability.faceid
              ? 'Usa reconocimiento facial para desbloquear.'
              : getUnavailableText(
                availability,
                availability.faceid,
              )
          }
          disabled={faceIdDisabled}
          loading={
            isAuthenticating
            && selectedMethod === 'faceid'
          }
          onPress={() => handleSelectMethod('faceid')}
        />

        <OptionCard
          method="pin"
          title="Código de acceso"
          subtitle="Crea un PIN de 6 dígitos para desbloquear."
          disabled={isAuthenticating}
          onPress={() => handleSelectMethod('pin')}
        />

        {biometricError ? (
          <Text style={styles.errorText}>
            {biometricError}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  viewWrap: {
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.neutral.gray600,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  title: {
    color: colors.neutral.text,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 20,
  },
  cardDisabled: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    opacity: 0.7,
  },
  cardIconCircle: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.primary}10`,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    marginRight: 16,
    width: 44,
  },
  cardIconCircleDisabled: {
    backgroundColor: colors.neutral.gray200,
  },
  cardTexts: {
    flex: 1,
  },
  cardTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '400',
  },
  cardTitleDisabled: {
    color: colors.neutral.gray500,
  },
  cardSubtitle: {
    color: colors.neutral.gray500,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 2,
  },
  cardSubtitleDisabled: {
    color: colors.neutral.gray500,
  },
  pinContainer: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
    justifyContent: 'center',
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  successTitle: {
    color: colors.neutral.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
  },
  successSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
});