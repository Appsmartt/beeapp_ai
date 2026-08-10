import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Fingerprint, ScanFace, KeyRound, CheckCircle2 } from 'lucide-react-native';
import AppLockPinPad from './AppLockPinPad';
import { enableAppLock } from '../../stores/appLockStore';

interface AppLockSetupScreenProps {
  onComplete: () => void;
}

type Mode = 'select' | 'pin-create' | 'pin-confirm' | 'success';
type LockMethodOption = 'fingerprint' | 'faceid' | 'pin';

export default function AppLockSetupScreen({ onComplete }: AppLockSetupScreenProps) {
  const [mode, setMode] = useState<Mode>('select');
  const [selectedMethod, setSelectedMethod] = useState<LockMethodOption | null>(null);
  const [draftPin, setDraftPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const handleSelectMethod = (method: LockMethodOption) => {
    setSelectedMethod(method);

    if (method === 'fingerprint' || method === 'faceid') {
      setMode('success');
      // Simulate biometric check
      setTimeout(() => {
        enableAppLock('biometric');
        onComplete();
      }, 1200);
    } else {
      setMode('pin-create');
    }
  };

  const handlePinCreate = (pin: string) => {
    setDraftPin(pin);
    setPinError(null);
    setMode('pin-confirm');
  };

  const handlePinConfirm = (pin: string) => {
    if (pin !== draftPin) {
      setPinError('Los códigos no coinciden. Inténtalo de nuevo.');
      setDraftPin('');
      setMode('pin-create');
      return;
    }

    setPinError(null);
    enableAppLock('pin', pin);
    setMode('success');
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {mode === 'select' && (
        <View style={styles.viewWrap}>
          <Text style={styles.title}>Protege tu cuenta</Text>
          <Text style={styles.subtitle}>
            Elige cómo proteger el acceso a tu cuenta cada vez que abras BeeApp
          </Text>

          <OptionCard
            icon={Fingerprint}
            title="Huella dactilar"
            subtitle="Usa tu huella para desbloquear"
            onPress={() => handleSelectMethod('fingerprint')}
          />

          <OptionCard
            icon={ScanFace}
            title="Face ID"
            subtitle="Usa reconocimiento facial para desbloquear"
            onPress={() => handleSelectMethod('faceid')}
          />

          <OptionCard
            icon={KeyRound}
            title="Código de acceso"
            subtitle="Crea un PIN de 6 dígitos para desbloquear"
            onPress={() => handleSelectMethod('pin')}
          />
        </View>
      )}

      {mode === 'pin-create' && (
        <AppLockPinPad
          title="Crea tu código de acceso"
          subtitle="Elige 6 dígitos para proteger el acceso a la app."
          onComplete={handlePinCreate}
          error={pinError}
        />
      )}

      {mode === 'pin-confirm' && (
        <AppLockPinPad
          title="Confirma tu código de acceso"
          subtitle="Escribe el código de nuevo para confirmar."
          onComplete={handlePinConfirm}
        />
      )}

      {mode === 'success' && (
        <View style={styles.successContainer}>
          <CheckCircle2 size={64} color={colors.semantic.success} />
          <Text style={styles.successTitle}>Seguridad configurada</Text>
          <Text style={styles.successSubtitle}>
            {selectedMethod === 'pin'
              ? 'Código de acceso establecido correctamente.'
              : 'Autenticación biométrica habilitada correctamente.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface OptionCardProps {
  icon: typeof Fingerprint;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function OptionCard({ icon: Icon, title, subtitle, onPress }: OptionCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIconCircle}>
        <Icon size={24} color={colors.brand.primary} />
      </View>
      <View style={styles.cardTexts}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.gray50 },
  content: { paddingVertical: 40, paddingHorizontal: 24, justifyContent: 'center' },
  viewWrap: { width: '100%' },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },

  // Card styles
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1.5,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brand.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTexts: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '400', color: colors.neutral.text },
  cardSubtitle: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray500, marginTop: 2 },

  // Success styles
  successContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  successTitle: { fontSize: 20, fontWeight: '600', color: colors.neutral.text, marginTop: 20, marginBottom: 8 },
  successSubtitle: { fontSize: 14, fontWeight: '400', color: colors.neutral.gray600, textAlign: 'center' },
});
