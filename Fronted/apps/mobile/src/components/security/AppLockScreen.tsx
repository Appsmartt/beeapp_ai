import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, AppState, AppStateStatus, Text, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import AnimatedLogo from '../AnimatedLogo';
import AppLockPinPad from './AppLockPinPad';
import BiometricButton from './BiometricButton';
import {
  isAppLockEnabled,
  getAppLockMethod,
  verifyAppLockPin,
  unlockApp,
  getAppLockPin,
} from '../../stores/appLockStore';

export default function AppLockScreen() {
  const [locked, setLocked] = useState(false);
  const [usePinFallback, setUsePinFallback] = useState(false);
  const [biometricFailures, setBiometricFailures] = useState(0);
  const [pinError, setPinError] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (isAppLockEnabled()) {
          setLocked(true);
          setUsePinFallback(false);
          setBiometricFailures(0);
          setPinError(null);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  if (!locked || !isAppLockEnabled()) {
    return null;
  }

  const method = getAppLockMethod();
  const hasPinSaved = !!getAppLockPin();

  const handleUnlockSuccess = () => {
    unlockApp();
    setLocked(false);
  };

  const handlePinSubmit = (pin: string) => {
    if (verifyAppLockPin(pin)) {
      setPinError(null);
      handleUnlockSuccess();
    } else {
      setPinError('Código incorrecto. Inténtalo de nuevo.');
    }
  };

  const handleBiometricMockFailure = () => {
    const nextFailures = biometricFailures + 1;
    setBiometricFailures(nextFailures);
    if (nextFailures >= 3 && hasPinSaved) {
      setUsePinFallback(true);
    }
  };

  const showBiometric = method === 'biometric' && !usePinFallback;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <AnimatedLogo size={70} showText={true} />
        </View>

        {showBiometric ? (
          <View style={styles.bioContainer}>
            <BiometricButton
              method="fingerprint"
              onSuccess={handleUnlockSuccess}
              title="Toca para desbloquear BeeApp"
            />

            <TouchableOpacity
              style={styles.failBtn}
              onPress={handleBiometricMockFailure}
              activeOpacity={0.7}
            >
              <Text style={styles.failBtnText}>
                Simular fallo biométrico ({biometricFailures}/3)
              </Text>
            </TouchableOpacity>

            {hasPinSaved && (
              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => setUsePinFallback(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.switchLinkText}>Ingresar código de acceso</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.pinContainer}>
            <AppLockPinPad
              title="Ingresa tu código de acceso"
              subtitle="Digita el PIN de 6 dígitos para desbloquear la app."
              onComplete={handlePinSubmit}
              error={pinError}
              biometricMethod={method === 'biometric' ? 'fingerprint' : null}
              onBiometricPress={() => setUsePinFallback(false)}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    marginBottom: 24,
  },
  bioContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pinContainer: {
    width: '100%',
  },
  switchLink: {
    marginTop: 20,
    padding: 8,
  },
  switchLinkText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  failBtn: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 8,
  },
  failBtnText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
});
