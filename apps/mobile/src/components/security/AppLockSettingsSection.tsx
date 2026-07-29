import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { ShieldCheck, KeyRound, ChevronRight, Fingerprint, ScanFace, X, CheckCircle2 } from 'lucide-react-native';
import AppLockPinPad from './AppLockPinPad';
import {
  isAppLockEnabled,
  getAppLockMethod,
  getAppLockPin,
  enableAppLock,
  disableAppLock,
  verifyAppLockPin,
} from '../../stores/appLockStore';

type PinStage = 'verify-to-change' | 'verify-to-reset' | 'create-new' | 'confirm-new';

export default function AppLockSettingsSection() {
  const [showSelector, setShowSelector] = useState(false);
  const [showPinFlow, setShowPinFlow] = useState(false);
  const [pinStage, setPinStage] = useState<PinStage>('create-new');
  const [draftPin, setDraftPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  const enabled = isAppLockEnabled();
  const method = getAppLockMethod();
  const hasPin = !!getAppLockPin();

  // Text for active method
  let currentMethodText = 'Desactivado';
  if (enabled) {
    if (method === 'biometric') {
      currentMethodText = 'Biometría (Huella/Facial)';
    } else if (method === 'pin') {
      currentMethodText = 'Código de acceso';
    }
  }

  const handleSelectBiometric = () => {
    setShowSelector(false);
    // Simulate biometric authorization
    Alert.alert('Autenticación biométrica', 'Simulando vinculación de biometría...', [
      {
        text: 'Aceptar',
        onPress: () => {
          enableAppLock('biometric');
        },
      },
    ]);
  };

  const handleSelectPin = () => {
    setShowSelector(false);
    setPinError(null);
    setPinSuccess(null);
    setDraftPin('');

    if (hasPin) {
      setPinStage('verify-to-change');
    } else {
      setPinStage('create-new');
    }
    setShowPinFlow(true);
  };

  const handleDisableLock = () => {
    setShowSelector(false);
    disableAppLock();
    Alert.alert('Bloqueo desactivado', 'El bloqueo de la aplicación ha sido desactivado.');
  };

  const handlePinFlowComplete = (pin: string) => {
    if (pinStage === 'verify-to-change' || pinStage === 'verify-to-reset') {
      if (verifyAppLockPin(pin)) {
        setPinError(null);
        setPinStage('create-new');
      } else {
        setPinError('Código incorrecto. Inténtalo de nuevo.');
      }
    } else if (pinStage === 'create-new') {
      setDraftPin(pin);
      setPinError(null);
      setPinStage('confirm-new');
    } else if (pinStage === 'confirm-new') {
      if (pin !== draftPin) {
        setPinError('Los códigos no coinciden. Inténtalo de nuevo.');
        setDraftPin('');
        setPinStage('create-new');
        return;
      }
      setPinError(null);
      enableAppLock('pin', pin);
      setPinSuccess('Código de acceso configurado');
      setTimeout(() => {
        setShowPinFlow(false);
      }, 800);
    }
  };

  const handleStartChangePin = () => {
    setPinError(null);
    setPinSuccess(null);
    setDraftPin('');
    setPinStage('verify-to-reset');
    setShowPinFlow(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Bloqueo de app</Text>

      <View style={styles.optionsCard}>
        {/* Method Row */}
        <TouchableOpacity style={styles.optionRow} onPress={() => setShowSelector(true)} activeOpacity={0.7}>
          <View style={[styles.optionIconWrap, { backgroundColor: colors.brand.primary + '15' }]}>
            <ShieldCheck size={18} color={colors.brand.primary} />
          </View>
          <View style={styles.texts}>
            <Text style={styles.optionLabel}>Método de bloqueo</Text>
            <Text style={styles.optionDesc}>Autenticación al abrir la aplicación.</Text>
          </View>
          <Text style={styles.valueText}>{currentMethodText}</Text>
          <ChevronRight size={16} color={colors.neutral.gray400} />
        </TouchableOpacity>

        {/* Change PIN Row */}
        {enabled && method === 'pin' && (
          <TouchableOpacity
            style={[styles.optionRow, { borderBottomWidth: 0 }]}
            onPress={handleStartChangePin}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIconWrap, { backgroundColor: colors.neutral.gray100 }]}>
              <KeyRound size={18} color={colors.neutral.gray600} />
            </View>
            <View style={styles.texts}>
              <Text style={styles.optionLabel}>Cambiar código de acceso</Text>
              <Text style={styles.optionDesc}>Modifica tu PIN de 6 dígitos.</Text>
            </View>
            <ChevronRight size={16} color={colors.neutral.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Method Selector Modal */}
      <Modal visible={showSelector} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowSelector(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Método de bloqueo</Text>
              <TouchableOpacity onPress={() => setShowSelector(false)}>
                <X size={20} color={colors.neutral.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sheetRow} onPress={handleSelectBiometric} activeOpacity={0.7}>
              <View style={styles.sheetIconCircle}>
                <Fingerprint size={18} color={colors.brand.primary} />
              </View>
              <Text style={styles.sheetText}>Biometría (Huella / Face ID)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetRow} onPress={handleSelectPin} activeOpacity={0.7}>
              <View style={styles.sheetIconCircle}>
                <KeyRound size={18} color={colors.neutral.gray700} />
              </View>
              <Text style={styles.sheetText}>Código de acceso (PIN 6 dígitos)</Text>
            </TouchableOpacity>

            {enabled && (
              <TouchableOpacity style={styles.sheetRow} onPress={handleDisableLock} activeOpacity={0.7}>
                <View style={[styles.sheetIconCircle, { backgroundColor: colors.semantic.error + '15' }]}>
                  <X size={18} color={colors.semantic.error} />
                </View>
                <Text style={[styles.sheetText, { color: colors.semantic.error }]}>Desactivar bloqueo</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PIN Flow Modal */}
      <Modal visible={showPinFlow} animationType="slide">
        <View style={styles.pinFlowContainer}>
          <View style={styles.pinFlowHeader}>
            <TouchableOpacity onPress={() => setShowPinFlow(false)} style={styles.closeBtn}>
              <X size={22} color={colors.neutral.text} />
            </TouchableOpacity>
            <Text style={styles.pinFlowTitle}>Seguridad</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.pinPadWrap}>
            <AppLockPinPad
              title={
                pinStage === 'verify-to-change' || pinStage === 'verify-to-reset'
                  ? 'Ingresa tu PIN de bloqueo'
                  : pinStage === 'create-new'
                    ? 'Crea tu código de acceso'
                    : 'Confirma tu código de acceso'
              }
              subtitle={
                pinStage === 'verify-to-change' || pinStage === 'verify-to-reset'
                  ? 'Necesitamos validar tu código de 6 dígitos actual.'
                  : pinStage === 'create-new'
                    ? 'Elige un PIN de 6 dígitos para proteger la app.'
                    : 'Escribe de nuevo los 6 dígitos para confirmar.'
              }
              onComplete={handlePinFlowComplete}
              error={pinError}
              success={pinSuccess}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  optionsCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  texts: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  optionDesc: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  valueText: {
    fontSize: 13,
    color: colors.neutral.gray500,
    marginRight: 6,
  },

  // Modal selector styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  sheetIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.neutral.text,
  },

  // PIN flow modal styles
  pinFlowContainer: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  pinFlowHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinFlowTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  pinPadWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
  },
});
