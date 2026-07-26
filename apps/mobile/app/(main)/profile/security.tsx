import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, ShieldCheck, KeyRound, Lock, MessageSquare } from 'lucide-react-native';
import PinPad from '../../../src/components/security/PinPad';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import {
  hasPin,
  isPinCorrect,
  setPin,
  getProtectedIds,
  MOCK_RECOVERY_PHONE,
  RECOVERY_CODE_LENGTH,
} from '../../../src/stores/pinStore';

type Stage = 'gate' | 'menu' | 'create' | 'confirm' | 'recover-code' | 'recover-pin';

const MOCK_SMS_CODE = '123456';

/**
 * Security section: creates, validates, changes and recovers the global
 * 4-digit PIN that protects files, folders and notes. Everything is mock.
 */
export default function SecurityScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(hasPin() ? 'gate' : 'menu');
  const [draftPin, setDraftPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [protectedCount, setProtectedCount] = useState(getProtectedIds().length);

  const goStage = (next: Stage) => {
    setError(null);
    setSuccess(null);
    setDraftPin('');
    setStage(next);
  };

  // Gate: current PIN required before entering the section
  const handleGate = (pin: string) => {
    if (isPinCorrect(pin)) {
      setError(null);
      setSuccess('PIN correcto');
      setTimeout(() => goStage('menu'), 450);
    } else {
      setSuccess(null);
      setError('PIN incorrecto. Inténtalo de nuevo.');
    }
  };

  const handleCreate = (pin: string) => {
    setDraftPin(pin);
    setError(null);
    setStage('confirm');
  };

  const handleConfirm = (pin: string) => {
    if (pin !== draftPin) {
      setSuccess(null);
      setError('Los PIN no coinciden. Empieza de nuevo.');
      setDraftPin('');
      setStage('create');
      return;
    }
    setPin(pin);
    setError(null);
    setSuccess('PIN configurado correctamente');
    setProtectedCount(getProtectedIds().length);
    setTimeout(() => goStage('menu'), 700);
  };

  const handleRecoveryCode = (code: string) => {
    if (code === MOCK_SMS_CODE) {
      setError(null);
      setSuccess('Código verificado');
      setTimeout(() => goStage('recover-pin'), 550);
    } else {
      setSuccess(null);
      setError('Código incorrecto. Revisa el SMS e inténtalo otra vez.');
    }
  };

  const pinExists = hasPin();
  // Code entry needs full focus: the floating menu only shows on the options list
  const showTabBar = stage === 'menu';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seguridad</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollBody, showTabBar && styles.scrollBodyWithBar]}
          showsVerticalScrollIndicator={false}
        >
          {stage === 'gate' && (
            <PinPad
              title="Ingresa tu PIN actual"
              subtitle="Necesitamos verificar tu identidad antes de mostrar los ajustes de seguridad."
              onComplete={handleGate}
              error={error}
              success={success}
              footer={
                <TouchableOpacity onPress={() => goStage('recover-code')} activeOpacity={0.7}>
                  <Text style={styles.linkText}>¿Olvidaste tu PIN?</Text>
                </TouchableOpacity>
              }
            />
          )}

          {stage === 'menu' && (
            <View style={styles.menuWrap}>
              {/* Status card */}
              <View style={styles.statusCard}>
                <View style={[styles.statusIcon, pinExists ? styles.statusIconOn : styles.statusIconOff]}>
                  <ShieldCheck size={22} color={pinExists ? colors.semantic.success : colors.neutral.gray500} />
                </View>
                <Text style={styles.statusTitle}>
                  {pinExists ? 'Protección con PIN activa' : 'Sin PIN de protección'}
                </Text>
                <Text style={styles.statusDesc}>
                  {pinExists
                    ? `Tu PIN protege ${protectedCount} ${protectedCount === 1 ? 'elemento' : 'elementos'} entre archivos, carpetas y notas.`
                    : 'Crea un PIN de 4 dígitos para bloquear archivos, carpetas y notas dentro de la app.'}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.optionsCard}>
                <TouchableOpacity style={styles.optionRow} onPress={() => goStage('create')} activeOpacity={0.7}>
                  <View style={[styles.optionIconWrap, { backgroundColor: '#F3E8FF' }]}>
                    <KeyRound size={18} color={colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>
                      {pinExists ? 'Cambiar PIN de protección' : 'Crear PIN de protección'}
                    </Text>
                    <Text style={styles.optionDesc}>
                      {pinExists ? 'Define un PIN nuevo de 4 dígitos.' : 'Elige un PIN de 4 dígitos y confírmalo.'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {pinExists && (
                  <TouchableOpacity
                    style={[styles.optionRow, { borderBottomWidth: 0 }]}
                    onPress={() => goStage('recover-code')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconWrap, { backgroundColor: '#E0F2FE' }]}>
                      <MessageSquare size={18} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>¿Olvidaste tu PIN?</Text>
                      <Text style={styles.optionDesc}>Recupéralo con un código enviado por SMS.</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.infoRow}>
                <Lock size={13} color={colors.neutral.gray600} />
                <Text style={styles.infoText}>
                  Protege elementos desde el menú de cada archivo, carpeta o nota.
                </Text>
              </View>
            </View>
          )}

          {stage === 'create' && (
            <PinPad
              title={pinExists ? 'Nuevo PIN' : 'Crea tu PIN'}
              subtitle="Elige 4 dígitos que puedas recordar. Protegerá todo el contenido que marques."
              onComplete={handleCreate}
              error={error}
            />
          )}

          {stage === 'confirm' && (
            <PinPad
              title="Confirma tu PIN"
              subtitle="Escribe otra vez los 4 dígitos para confirmarlo."
              onComplete={handleConfirm}
              error={error}
              success={success}
            />
          )}

          {stage === 'recover-code' && (
            <PinPad
              title="Verifica tu identidad"
              subtitle={`Enviamos un código de 6 dígitos por SMS a ${MOCK_RECOVERY_PHONE}. Ingrésalo para crear un PIN nuevo.`}
              length={RECOVERY_CODE_LENGTH}
              onComplete={handleRecoveryCode}
              error={error}
              success={success}
              footer={
                <TouchableOpacity onPress={() => alert('Código reenviado por SMS.')} activeOpacity={0.7}>
                  <Text style={styles.linkText}>Reenviar código</Text>
                </TouchableOpacity>
              }
            />
          )}

          {stage === 'recover-pin' && (
            <PinPad
              title="Crea tu nuevo PIN"
              subtitle="Identidad verificada. Define 4 dígitos nuevos y confírmalos."
              onComplete={handleCreate}
              error={error}
            />
          )}
        </ScrollView>

        {/* Assistant always within reach, except while typing a code */}
        {showTabBar && <FloatingTabBar />}
      </View>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  scrollBody: {
    paddingVertical: 24,
    paddingBottom: 60,
  },
  // Clearance so the last row is not hidden behind the floating menu
  scrollBodyWithBar: {
    paddingBottom: 120,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
    marginTop: 14,
  },
  menuWrap: {
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusIconOn: {
    backgroundColor: '#DCFCE7',
  },
  statusIconOff: {
    backgroundColor: colors.neutral.gray100,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 6,
  },
  statusDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 17,
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
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  optionDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.gray600,
    lineHeight: 15,
  },
});
