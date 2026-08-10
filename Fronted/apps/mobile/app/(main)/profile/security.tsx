import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, ShieldCheck, KeyRound, Lock, MessageSquare, Smartphone, Mail } from 'lucide-react-native';
import PinPad from '../../../src/components/security/PinPad';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import AppLockSettingsSection from '../../../src/components/security/AppLockSettingsSection';
import {
  hasPin,
  isPinCorrect,
  setPin,
  getProtectedIds,
  MOCK_RECOVERY_PHONE,
  RECOVERY_CODE_LENGTH,
} from '../../../src/stores/pinStore';

type Stage = 'gate' | 'menu' | 'create' | 'confirm' | 'recover-select' | 'recover-code' | 'recover-pin';
const MOCK_SMS_CODE = '123456';

export default function SecurityScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(hasPin() ? 'gate' : 'menu');
  const [draftPin, setDraftPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [protectedCount, setProtectedCount] = useState(getProtectedIds().length);
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email' | null>(null);

  const goStage = (next: Stage) => {
    setError(null); setSuccess(null); setDraftPin(''); setStage(next);
  };

  const handleGate = (pin: string) => {
    if (isPinCorrect(pin)) {
      setError(null); setSuccess('PIN correcto'); setTimeout(() => goStage('menu'), 450);
    } else {
      setSuccess(null); setError('PIN incorrecto. Inténtalo de nuevo.');
    }
  };

  const handleCreate = (pin: string) => {
    setDraftPin(pin); setError(null); setStage('confirm');
  };

  const handleConfirm = (pin: string) => {
    if (pin !== draftPin) {
      setSuccess(null); setError('Los PIN no coinciden. Empieza de nuevo.'); setDraftPin(''); setStage('create'); return;
    }
    setPin(pin); setError(null); setSuccess('PIN configurado correctamente'); setProtectedCount(getProtectedIds().length); setTimeout(() => goStage('menu'), 700);
  };

  const handleRecoveryCode = (code: string) => {
    if (code === MOCK_SMS_CODE) {
      setError(null); setSuccess('Código verificado'); setTimeout(() => goStage('recover-pin'), 550);
    } else {
      setSuccess(null); setError(`Código incorrecto. Revisa tu ${selectedMethod === 'email' ? 'correo' : 'SMS'} e inténtalo otra vez.`);
    }
  };

  const pinExists = hasPin();
  const showTabBar = stage === 'menu';

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seguridad</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollBody, showTabBar && styles.scrollBodyWithBar]} showsVerticalScrollIndicator={false}>
          {stage === 'gate' && (
            <PinPad
              title="Ingresa tu PIN actual"
              subtitle="Necesitamos verificar tu identidad antes de mostrar los ajustes de seguridad."
              onComplete={handleGate}
              error={error}
              success={success}
              footer={
                <TouchableOpacity onPress={() => { setSelectedMethod(null); goStage('recover-select'); }} activeOpacity={0.7}>
                  <Text style={styles.linkText}>¿Olvidaste tu PIN?</Text>
                </TouchableOpacity>
              }
            />
          )}

          {stage === 'menu' && (
            <View style={styles.menuWrap}>
              {/* App Lock Configuration */}
              <AppLockSettingsSection />

              <View style={styles.separator} />

              <Text style={styles.sectionHeaderLabel}>PIN de archivos y chats</Text>

              <View style={styles.statusCard}>
                <View style={[styles.statusIcon, pinExists ? styles.statusIconOn : styles.statusIconOff]}>
                  <ShieldCheck size={22} color={pinExists ? colors.semantic.success : colors.neutral.gray500} />
                </View>
                <Text style={styles.statusTitle}>{pinExists ? 'PIN de archivos y chats activo' : 'Sin PIN de archivos y chats'}</Text>
                <Text style={styles.statusDesc}>
                  {pinExists
                    ? `Tu PIN protege ${protectedCount} ${protectedCount === 1 ? 'elemento' : 'elementos'} entre archivos, carpetas y notas.`
                    : 'Crea un PIN de 4 dígitos para bloquear archivos, carpetas y notas dentro de la app.'}
                </Text>
              </View>

              <View style={styles.optionsCard}>
                <TouchableOpacity style={styles.optionRow} onPress={() => goStage('create')} activeOpacity={0.7}>
                  <View style={[styles.optionIconWrap, { backgroundColor: colors.brand.primary + '15' }]}>
                    <KeyRound size={18} color={colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{pinExists ? 'Cambiar PIN de archivos y chats' : 'Crear PIN de archivos y chats'}</Text>
                    <Text style={styles.optionDesc}>{pinExists ? 'Define un PIN nuevo de 4 dígitos.' : 'Elige un PIN de 4 dígitos y confírmalo.'}</Text>
                  </View>
                </TouchableOpacity>

                {pinExists && (
                  <TouchableOpacity
                    style={[styles.optionRow, { borderBottomWidth: 0 }]}
                    onPress={() => { setSelectedMethod(null); goStage('recover-select'); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconWrap, { backgroundColor: colors.neutral.gray100 }]}>
                      <MessageSquare size={18} color={colors.neutral.gray600} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>¿Olvidaste tu PIN?</Text>
                      <Text style={styles.optionDesc}>Recupéralo con un código de verificación.</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.infoRow}>
                <Lock size={13} color={colors.neutral.gray600} />
                <Text style={styles.infoText}>Protege elementos desde el menú de cada archivo, carpeta o nota.</Text>
              </View>
            </View>
          )}

          {stage === 'create' && <PinPad title={pinExists ? 'Nuevo PIN' : 'Crea tu PIN'} subtitle="Elige 4 dígitos que puedas recordar. Protegerá todo el contenido que marques." onComplete={handleCreate} error={error} />}
          {stage === 'confirm' && <PinPad title="Confirma tu PIN" subtitle="Escribe otra vez los 4 dígitos para confirmarlo." onComplete={handleConfirm} error={error} success={success} />}

          {stage === 'recover-select' && (
            <View style={styles.menuWrap}>
              <Text style={styles.selectTitle}>¿Cómo quieres recibir el código?</Text>
              <Text style={styles.selectSubtitle}>Selecciona un canal para recibir el código de verificación de 6 dígitos.</Text>
              
              <TouchableOpacity style={[styles.methodRow, selectedMethod === 'sms' && styles.methodRowActive]} onPress={() => setSelectedMethod('sms')} activeOpacity={0.85}>
                <View style={[styles.methodIconWrap, selectedMethod === 'sms' && styles.methodIconActive]}>
                  <Smartphone size={20} color={selectedMethod === 'sms' ? colors.brand.primary : colors.neutral.gray600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, selectedMethod === 'sms' && styles.methodLabelActive]}>Mensaje de texto (SMS)</Text>
                  <Text style={styles.methodDesc}>+57 *** ***67</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.methodRow, selectedMethod === 'email' && styles.methodRowActive]} onPress={() => setSelectedMethod('email')} activeOpacity={0.85}>
                <View style={[styles.methodIconWrap, selectedMethod === 'email' && styles.methodIconActive]}>
                  <Mail size={20} color={selectedMethod === 'email' ? colors.brand.primary : colors.neutral.gray600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, selectedMethod === 'email' && styles.methodLabelActive]}>Correo electrónico</Text>
                  <Text style={styles.methodDesc}>s******@appsmartt.com</Text>
                </View>
              </TouchableOpacity>

              {selectedMethod && (
                <TouchableOpacity style={styles.primaryButton} onPress={() => goStage('recover-code')} activeOpacity={0.8}>
                  <Text style={styles.primaryButtonText}>Enviar código</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {stage === 'recover-code' && (
            <PinPad
              title="Verifica tu identidad"
              subtitle={selectedMethod === 'email' ? 'Enviamos un código de 6 dígitos por correo a s******@appsmartt.com.' : `Enviamos un código de 6 dígitos por SMS a ${MOCK_RECOVERY_PHONE}.`}
              length={RECOVERY_CODE_LENGTH}
              onComplete={handleRecoveryCode}
              error={error}
              success={success}
              footer={
                <TouchableOpacity onPress={() => alert(`Código reenviado por ${selectedMethod === 'email' ? 'correo' : 'SMS'}.`)} activeOpacity={0.7}>
                  <Text style={styles.linkText}>Reenviar código</Text>
                </TouchableOpacity>
              }
            />
          )}

          {stage === 'recover-pin' && <PinPad title="Crea tu nuevo PIN" subtitle="Identidad verificada. Define 4 dígitos nuevos y confírmalos." onComplete={handleCreate} error={error} />}
        </ScrollView>

        {showTabBar && <FloatingTabBar />}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderColor: colors.neutral.gray100 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.neutral.text },
  scrollBody: { paddingVertical: 24, paddingBottom: 60 },
  scrollBodyWithBar: { paddingBottom: 120 },
  linkText: { fontSize: 12, fontWeight: '400', color: colors.brand.primary, marginTop: 14, textAlign: 'center' },
  menuWrap: { paddingHorizontal: 20 },
  statusCard: { backgroundColor: colors.neutral.white, borderRadius: 20, borderWidth: 1, borderColor: colors.neutral.gray200, padding: 20, alignItems: 'center', marginBottom: 18 },
  statusIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statusIconOn: { backgroundColor: colors.semantic.success + '15' },
  statusIconOff: { backgroundColor: colors.neutral.gray100 },
  statusTitle: { fontSize: 15, fontWeight: '600', color: colors.neutral.text, marginBottom: 6 },
  statusDesc: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, textAlign: 'center', lineHeight: 17 },
  optionsCard: { backgroundColor: colors.neutral.white, borderRadius: 20, borderWidth: 1, borderColor: colors.neutral.gray200, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  optionIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionLabel: { fontSize: 14, fontWeight: '600', color: colors.neutral.text },
  optionDesc: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 4 },
  infoText: { flex: 1, fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, lineHeight: 15 },
  selectTitle: { fontSize: 18, fontWeight: '600', color: colors.neutral.text, marginBottom: 6, marginTop: 10 },
  selectSubtitle: { fontSize: 13, fontWeight: '400', color: colors.neutral.gray600, marginBottom: 24, lineHeight: 18 },
  methodRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, borderRadius: 16, borderWidth: 1.5, borderColor: colors.neutral.gray200, padding: 16, marginBottom: 12 },
  methodRowActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary + '15' },
  methodIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.neutral.gray100, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  methodIconActive: { backgroundColor: colors.brand.primary + '15' },
  methodLabel: { fontSize: 14, fontWeight: '400', color: colors.neutral.text, marginBottom: 2 },
  methodLabelActive: { color: colors.brand.primary, fontWeight: '600' },
  methodDesc: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray500 },
  primaryButton: { backgroundColor: colors.brand.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20, shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  primaryButtonText: { color: colors.neutral.white, fontSize: 14, fontWeight: '600' },
  separator: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginVertical: 20,
  },
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
});
