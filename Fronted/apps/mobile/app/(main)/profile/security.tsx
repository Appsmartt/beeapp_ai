import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ApiRequestError,
  configureAccountSecurityPin,
  getAccountSecurityPinStatus,
  verifyAccountSecurityPin,
  verifyAccountSecurityPinPassword,
  replaceAccountSecurityPin,
} from '@beeapp/api-client';
import { getValidSessionCredentials } from '../../../src/services/authSession';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, ShieldCheck, KeyRound, Lock, Eye, EyeOff } from 'lucide-react-native';
import PinPad from '../../../src/components/security/PinPad';
import FloatingTabBar from '../../../src/components/FloatingTabBar';

type Stage = 'loading' | 'gate' | 'menu' | 'create' | 'confirm' | 'recover-password' | 'recover-create' | 'recover-confirm';

export default function SecurityScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('loading');
  const [configured, setConfigured] = useState(false);
  const [draftPin, setDraftPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    pending.current = false;
    setStage('loading');
    setError(null);
    setSuccess(null);
    setDraftPin('');
    setPassword('');
    setShowPassword(false);

    const load = async () => {
      try {
        const auth = await getValidSessionCredentials();
        if (!auth) throw new Error('No hay sesión activa.');
        const result = await getAccountSecurityPinStatus(auth);
        if (!active) return;
        setConfigured(result.configured);
        setStage(result.configured ? 'gate' : 'create');
      } catch {
        if (active) setError('No pudimos consultar tu PIN. Vuelve atrás e inténtalo de nuevo.');
      }
    };

    void load();
    return () => {
      active = false;
      pending.current = false;
      setPassword('');
      setDraftPin('');
      setShowPassword(false);
    };
  }, []));

  const goStage = (next: Stage) => {
    setError(null); setSuccess(null); setDraftPin('');
    if (next !== 'recover-create' && next !== 'recover-confirm') {
      setPassword('');
      setShowPassword(false);
    }
    setStage(next);
  };

  const handleGate = async (pin: string) => {
    if (pending.current) return;
    pending.current = true;
    setError(null);
    try {
      const auth = await getValidSessionCredentials();
      if (!auth) throw new Error('No hay sesión activa.');
      const result = await verifyAccountSecurityPin(auth, pin);
      if (!result.verified) throw new Error('Verificación rechazada.');
      setSuccess('PIN correcto');
      setStage('menu');
    } catch (cause) {
      setSuccess(null);
      if (cause instanceof ApiRequestError && cause.status === 429) {
        setError('Demasiados intentos. Inténtalo en 15 minutos.');
      } else if (cause instanceof ApiRequestError && cause.status === 403) {
        setError('PIN incorrecto. Inténtalo de nuevo.');
      } else {
        setError('No pudimos verificar el PIN. Comprueba tu conexión.');
      }
    } finally {
      pending.current = false;
    }
  };

  const handleCreate = (pin: string) => {
    if (pending.current) return;
    setDraftPin(pin);
    setError(null);
    setStage(stage === 'recover-create' ? 'recover-confirm' : 'confirm');
  };

  const handleConfirm = async (pin: string) => {
    if (pending.current) return;
    if (pin !== draftPin) {
      setSuccess(null);
      setError('Los PIN no coinciden. Empieza de nuevo.');
      setDraftPin('');
      setStage('create');
      return;
    }
    pending.current = true;
    setError(null);
    try {
      const auth = await getValidSessionCredentials();
      if (!auth) throw new Error('No hay sesión activa.');
      const result = await configureAccountSecurityPin(auth, pin);
      if (!result.configured) throw new Error('PIN no configurado.');
      setConfigured(true);
      setDraftPin('');
      setSuccess('PIN configurado correctamente');
      setStage('menu');
    } catch (cause) {
      setSuccess(null);
      setDraftPin('');
      if (cause instanceof ApiRequestError && cause.status === 409) {
        setConfigured(true);
        setStage('gate');
        setError('Ya tienes un PIN configurado. Ingresa tu PIN actual.');
      } else {
        setStage('create');
        setError('No pudimos guardar tu PIN. Comprueba tu conexión.');
      }
    } finally {
      pending.current = false;
    }
  };

  const handlePasswordVerification = async () => {
    if (pending.current || !password) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const auth = await getValidSessionCredentials();
      if (!auth) throw new Error('No hay sesión activa.');
      const result = await verifyAccountSecurityPinPassword(auth, password);
      if (!result.verified) throw new Error('Verificación rechazada.');
      setStage('recover-create');
    } catch (cause) {
      setError(cause instanceof ApiRequestError && cause.status === 403
        ? 'La contraseña no es correcta.'
        : 'No pudimos verificar la contraseña. Inténtalo de nuevo.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const handleRecoveryConfirm = async (pin: string) => {
    if (pending.current) return;
    if (pin !== draftPin) {
      setDraftPin('');
      setError('Los PIN no coinciden. Empieza de nuevo.');
      setStage('recover-create');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const auth = await getValidSessionCredentials();
      if (!auth) throw new Error('No hay sesión activa.');
      const result = await replaceAccountSecurityPin(auth, password, pin);
      if (!result.configured) throw new Error('PIN no reemplazado.');
      setPassword('');
      setDraftPin('');
      setConfigured(true);
      setSuccess('Tu PIN se cambió correctamente.');
      setStage('menu');
    } catch (cause) {
      setDraftPin('');
      if (cause instanceof ApiRequestError && cause.status === 403) {
        setPassword('');
        setStage('recover-password');
        setError('Vuelve a escribir la contraseña de tu cuenta.');
      } else if (cause instanceof ApiRequestError && cause.status === 409) {
        setPassword('');
        setStage('gate');
        setError('No encontramos un PIN configurado. Actualiza la pantalla.');
      } else {
        setStage('recover-create');
        setError('No pudimos guardar el PIN. Comprueba tu conexión.');
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const pinExists = configured;
  const showTabBar = stage === 'menu';
  const recovering = stage === 'recover-password'
    || stage === 'recover-create'
    || stage === 'recover-confirm';

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if (recovering) goStage('gate'); else router.back(); }} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{recovering ? 'Restablecer PIN' : 'Seguridad'}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollBody, showTabBar && styles.scrollBodyWithBar]} showsVerticalScrollIndicator={false}>
          {stage === 'loading' && (
            <Text style={styles.statusDesc}>{error || 'Consultando estado del PIN...'}</Text>
          )}

          {stage === 'gate' && (
            <PinPad
              title="Ingresa tu PIN actual"
              subtitle="Necesitamos verificar tu identidad antes de mostrar los ajustes de seguridad."
              onComplete={handleGate}
              error={error}
              success={success}
              footer={
                <TouchableOpacity onPress={() => goStage('recover-password')} activeOpacity={0.7}>
                  <Text style={styles.linkText}>¿Olvidaste tu PIN?</Text>
                </TouchableOpacity>
              }
            />
          )}

          {stage === 'menu' && (
            <View style={styles.menuWrap}>
              {success ? <Text style={styles.menuSuccess}>{success}</Text> : null}
              <Text style={styles.sectionHeaderLabel}>PIN de archivos y chats</Text>

              <View style={styles.statusCard}>
                <View style={[styles.statusIcon, pinExists ? styles.statusIconOn : styles.statusIconOff]}>
                  <ShieldCheck size={22} color={pinExists ? colors.semantic.success : colors.neutral.gray500} />
                </View>
                <Text style={styles.statusTitle}>{pinExists ? 'PIN de archivos y chats activo' : 'Sin PIN de archivos y chats'}</Text>
                <Text style={styles.statusDesc}>
                  {pinExists
                    ? 'PIN de cuenta configurado. Úsalo para las funciones que soliciten verificación.'
                    : 'Crea un PIN de 4 dígitos para las funciones que soliciten verificación.'}
                </Text>
              </View>

              <View style={styles.optionsCard}>
                <TouchableOpacity style={styles.optionRow} onPress={() => goStage(pinExists ? 'recover-password' : 'create')} activeOpacity={0.7}>
                  <View style={[styles.optionIconWrap, { backgroundColor: colors.brand.primary + '15' }]}>
                    <KeyRound size={18} color={colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{pinExists ? 'Cambiar PIN de archivos y chats' : 'Crear PIN de archivos y chats'}</Text>
                    <Text style={styles.optionDesc}>{pinExists ? 'Confirma tu contraseña para elegir un PIN nuevo.' : 'Elige un PIN de 4 dígitos y confírmalo.'}</Text>
                  </View>
                </TouchableOpacity>

                {pinExists && (
                  <TouchableOpacity
                    style={[styles.optionRow, { borderBottomWidth: 0 }]}
                    onPress={() => goStage('recover-password')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconWrap, { backgroundColor: colors.neutral.gray100 }]}>
                      <KeyRound size={18} color={colors.neutral.gray600} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>¿Olvidaste tu PIN?</Text>
                      <Text style={styles.optionDesc}>Cámbialo con la contraseña de tu cuenta.</Text>
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

          {stage === 'recover-password' && (
            <View style={styles.recoveryWrap}>
              <View style={styles.recoveryIcon}>
                <KeyRound size={26} color={colors.brand.primary} />
              </View>
              <Text style={styles.recoveryTitle}>Un nuevo comienzo para tu PIN</Text>
              <Text style={styles.recoverySubtitle}>
                Confirma la contraseña de tu cuenta para crear un PIN nuevo.
                Tu contenido protegido seguirá en su lugar.
              </Text>
              <View style={styles.recoveryCard}>
                <Text style={styles.passwordLabel}>Contraseña de tu cuenta</Text>
                <View style={styles.passwordField}>
                  <Lock size={18} color={colors.neutral.gray500} />
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Escribe tu contraseña"
                    placeholderTextColor={colors.neutral.gray500}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    editable={!busy}
                    onSubmitEditing={() => { void handlePasswordVerification(); }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword
                      ? <EyeOff size={19} color={colors.neutral.gray600} />
                      : <Eye size={19} color={colors.neutral.gray600} />}
                  </TouchableOpacity>
                </View>
                {error ? <Text style={styles.recoveryError}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.primaryButton, (!password || busy) && styles.buttonDisabled]}
                  disabled={!password || busy}
                  onPress={() => { void handlePasswordVerification(); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {busy ? 'Verificando...' : 'Continuar'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.recoveryHint}>
                Por seguridad, verificaremos la contraseña de nuevo al guardar el PIN.
              </Text>
            </View>
          )}

          {stage === 'recover-create' && (
            <PinPad title="Crea tu nuevo PIN"
              subtitle="Contraseña comprobada. Elige 4 dígitos para reemplazar el PIN anterior."
              onComplete={handleCreate} error={error} />
          )}
          {stage === 'recover-confirm' && (
            <PinPad title="Confirma tu nuevo PIN"
              subtitle="Repite los 4 dígitos para guardar el cambio."
              onComplete={handleRecoveryConfirm} error={error} />
          )}
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
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },

  menuSuccess: { backgroundColor: colors.semantic.success + '15', color: colors.semantic.success, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13, textAlign: 'center' },
  recoveryWrap: { paddingHorizontal: 22, alignItems: 'center' },
  recoveryIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: colors.brand.primary + '15', alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 18 },
  recoveryTitle: { fontSize: 23, fontWeight: '700', color: colors.neutral.text, textAlign: 'center', marginBottom: 10 },
  recoverySubtitle: { fontSize: 14, color: colors.neutral.gray600, textAlign: 'center', lineHeight: 21, marginBottom: 26 },
  recoveryCard: { width: '100%', backgroundColor: colors.neutral.white, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.brand.primary + '22' },
  passwordLabel: { fontSize: 13, fontWeight: '600', color: colors.neutral.text, marginBottom: 10 },
  passwordField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.neutral.gray200, backgroundColor: colors.neutral.gray50, borderRadius: 14, paddingHorizontal: 14, minHeight: 52 },
  passwordInput: { flex: 1, color: colors.neutral.text, fontSize: 14, paddingVertical: 10 },
  recoveryError: { color: colors.semantic.error, fontSize: 12, marginTop: 12 },
  recoveryHint: { fontSize: 12, color: colors.neutral.gray600, lineHeight: 18, textAlign: 'center', marginTop: 22, paddingHorizontal: 12 },
  buttonDisabled: { opacity: 0.5 },
});
