import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { colors } from '@beeapp/design-system';
import { checkBillingStatus, type BillingCheckout } from '@beeapp/api-client';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  QrCode,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react-native';

interface FactusPayModalProps {
  checkout: BillingCheckout | null;
  onClose: () => void;
  onRenew: (checkout: BillingCheckout) => Promise<void>;
  onPaid: () => Promise<void> | void;
}

const POLL_INTERVAL_MS = 5000;

function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function writeQrTempFile(dataUri: string, reference: string): Promise<string> {
  const base64 = dataUri.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  const safeRef = reference.replace(/[^a-zA-Z0-9_-]/g, '');
  const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const path = `${directory}factus-qr-${safeRef || Date.now()}.png`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

export default function FactusPayModal({
  checkout,
  onClose,
  onRenew,
  onPaid,
}: FactusPayModalProps) {
  const [status, setStatus] = useState<'ready' | 'paid' | 'failed'>(checkout?.status || 'ready');
  const [qr, setQr] = useState<string | null>(checkout?.qr || null);
  const [brebKey, setBrebKey] = useState(checkout?.brebKey || '');
  const [expiresAt, setExpiresAt] = useState<string | null>(checkout?.expiresAt || null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<'key' | 'amount' | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [sharingQr, setSharingQr] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const lastReferenceRef = useRef<string | null>(null);
  const paidNotifiedRef = useRef<string | null>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (!checkout) {
      lastReferenceRef.current = null;
      paidNotifiedRef.current = null;
      verifyingRef.current = false;
      return;
    }
    const isSameReference = lastReferenceRef.current === checkout.reference;
    lastReferenceRef.current = checkout.reference;

    if (!isSameReference) {
      paidNotifiedRef.current = checkout.status === 'paid' ? checkout.reference : null;
      setStatus(checkout.status);
      setQr(checkout.qr);
      setBrebKey(checkout.brebKey);
      setExpiresAt(checkout.expiresAt);
      setFeedback(checkout.status === 'paid' ? '¡Pago confirmado! Tu plan ya quedó activo.' : '');
      setError('');
      setCopiedField(null);
      return;
    }

    if (checkout.status === 'paid') {
      paidNotifiedRef.current = checkout.reference;
      setStatus('paid');
      setFeedback('¡Pago confirmado! Tu plan ya quedó activo.');
    } else if (paidNotifiedRef.current !== checkout.reference) {
      if (checkout.qr) setQr(checkout.qr);
      if (checkout.brebKey) setBrebKey(checkout.brebKey);
      if (checkout.expiresAt) setExpiresAt(checkout.expiresAt);
    }
  }, [checkout]);

  useEffect(() => {
    if (!checkout || !expiresAt || status !== 'ready') {
      setRemainingMs(null);
      return undefined;
    }
    const targetTime = new Date(expiresAt).getTime();
    if (Number.isNaN(targetTime)) {
      setRemainingMs(null);
      return undefined;
    }
    const tick = () => setRemainingMs(Math.max(0, targetTime - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [checkout, expiresAt, status]);

  const expired = remainingMs !== null && remainingMs <= 0 && status === 'ready';

  const verifyNow = useCallback(async (manual: boolean) => {
    if (!checkout || status === 'paid' || paidNotifiedRef.current === checkout.reference) return;
    if (verifyingRef.current && !manual) return;
    verifyingRef.current = true;
    if (manual) {
      setVerifying(true);
      setError('');
      setFeedback('');
    }
    try {
      const result = await checkBillingStatus(checkout.reference);
      if (result.qr) setQr(result.qr);
      if (result.brebKey) setBrebKey(result.brebKey);
      if (result.expiresAt) setExpiresAt(result.expiresAt);

      if (result.status === 'paid' || result.activated) {
        paidNotifiedRef.current = checkout.reference;
        setStatus('paid');
        setFeedback('¡Pago confirmado! Tu plan ya quedó activo.');
        await onPaid();
        return;
      }
      if (result.status === 'failed') {
        setStatus('failed');
        setError('El cobro fue rechazado o venció. Genera un nuevo QR para intentar de nuevo.');
        return;
      }
      if (manual) {
        setFeedback('Todavía no recibimos la confirmación del banco. Si ya transferiste, espera unos segundos y vuelve a verificar.');
      }
    } catch (verifyError) {
      if (manual) {
        setError(verifyError instanceof Error ? verifyError.message : 'No se pudo consultar el estado del pago.');
      }
    } finally {
      verifyingRef.current = false;
      if (manual) setVerifying(false);
    }
  }, [checkout, onPaid, status]);

  useEffect(() => {
    if (!checkout || status !== 'ready' || expired) return undefined;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void verifyNow(false);
      }
    }, POLL_INTERVAL_MS);

    const appSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void verifyNow(false);
      }
    });

    return () => {
      clearInterval(interval);
      appSub.remove();
    };
  }, [checkout, expired, status, verifyNow]);

  if (!checkout) return null;

  const copyValue = async (field: 'key' | 'amount', value: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
  };

  const handleSaveQr = async () => {
    if (!qr || savingQr) return;
    setSavingQr(true);
    setError('');
    setFeedback('');
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        setError('Necesitamos permiso para guardar la imagen del QR en tu galería.');
        return;
      }
      const fileUri = await writeQrTempFile(qr, checkout.reference);
      await MediaLibrary.saveToLibraryAsync(fileUri);
      setFeedback('Código QR guardado en tu galería. Ya puedes abrirlo desde la app de tu banco.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el QR.');
    } finally {
      setSavingQr(false);
    }
  };

  const handleShareQr = async () => {
    if (!qr || sharingQr) return;
    setSharingQr(true);
    setError('');
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setError('Este dispositivo no permite compartir imágenes directamente.');
        return;
      }
      const fileUri = await writeQrTempFile(qr, checkout.reference);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir código QR Bre-B',
      });
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : 'No se pudo compartir el QR.');
    } finally {
      setSharingQr(false);
    }
  };

  const handleRenew = async () => {
    setRenewing(true);
    setError('');
    setFeedback('');
    try {
      await onRenew(checkout);
    } catch (renewError) {
      setError(renewError instanceof Error ? renewError.message : 'No se pudo renovar el QR.');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <Modal
      visible={Boolean(checkout)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <QrCode size={18} color={colors.brand.primary} />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Factus Pay · Bre-B</Text>
                  {checkout.sandbox ? (
                    <View style={styles.sandboxBadge}>
                      <Text style={styles.sandboxBadgeText}>Sandbox</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.subtitle}>
                  Plan {checkout.planName} ({checkout.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'})
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.neutral.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {status === 'paid' ? (
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <CheckCircle2 size={36} color="#059669" />
                </View>
                <Text style={styles.successTitle}>¡Pago confirmado!</Text>
                <Text style={styles.successDesc}>
                  Tu plan {checkout.planName} por {formatCop(checkout.amount)} ya quedó activo.
                </Text>
                <Text style={styles.refText}>Referencia: {checkout.reference}</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Listo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.amountCard}>
                  <View>
                    <Text style={styles.fieldLabel}>MONTO EXACTO A TRANSFERIR</Text>
                    <Text style={styles.amountValue}>{formatCop(checkout.amount)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyChip}
                    onPress={() => void copyValue('amount', String(Math.round(checkout.amount)))}
                    activeOpacity={0.8}
                  >
                    {copiedField === 'amount'
                      ? <Check size={14} color={colors.brand.primary} />
                      : <Copy size={14} color={colors.brand.primary} />}
                    <Text style={styles.copyChipText}>
                      {copiedField === 'amount' ? 'Copiado' : 'Copiar monto'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {brebKey ? (
                  <View style={styles.keyCard}>
                    <Text style={styles.fieldLabel}>LLAVE BRE-B (COPIA Y PAGA DESDE TU BANCO)</Text>
                    <View style={styles.keyRow}>
                      <Text style={styles.keyValue} numberOfLines={1} ellipsizeMode="middle">
                        {brebKey}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyKeyBtn}
                        onPress={() => void copyValue('key', brebKey)}
                        activeOpacity={0.8}
                      >
                        {copiedField === 'key'
                          ? <Check size={14} color={colors.neutral.white} />
                          : <Copy size={14} color={colors.neutral.white} />}
                        <Text style={styles.copyKeyBtnText}>
                          {copiedField === 'key' ? 'Copiada' : 'Copiar llave'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <View style={styles.qrSection}>
                  <View style={styles.qrBox}>
                    {qr ? (
                      <Image
                        source={{ uri: qr }}
                        style={[styles.qrImage, (expired || status === 'failed') && styles.qrDimmed]}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.qrFallback}>QR no disponible. Usa la llave Bre-B.</Text>
                    )}

                    {expired ? (
                      <View style={styles.expiredOverlay}>
                        <Clock size={22} color="#D97706" />
                        <Text style={styles.expiredTitle}>Este QR venció</Text>
                        <TouchableOpacity
                          style={styles.renewOverlayBtn}
                          disabled={renewing}
                          onPress={() => void handleRenew()}
                        >
                          {renewing
                            ? <ActivityIndicator size="small" color={colors.neutral.white} />
                            : <RefreshCw size={14} color={colors.neutral.white} />}
                          <Text style={styles.renewOverlayText}>Generar nuevo QR</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  {remainingMs !== null && !expired ? (
                    <View style={styles.countdownRow}>
                      <Clock size={14} color={colors.brand.primary} />
                      <Text style={styles.countdownText}>
                        Expira en <Text style={styles.countdownMono}>{formatCountdown(remainingMs)}</Text>
                      </Text>
                    </View>
                  ) : null}

                  {qr && !expired ? (
                    <View style={styles.qrActionsRow}>
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        disabled={savingQr}
                        onPress={() => void handleSaveQr()}
                        activeOpacity={0.8}
                      >
                        {savingQr
                          ? <ActivityIndicator size="small" color={colors.brand.primary} />
                          : <Download size={14} color={colors.brand.primary} />}
                        <Text style={styles.secondaryBtnText}>Guardar QR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        disabled={sharingQr}
                        onPress={() => void handleShareQr()}
                        activeOpacity={0.8}
                      >
                        {sharingQr
                          ? <ActivityIndicator size="small" color={colors.brand.primary} />
                          : <Share2 size={14} color={colors.brand.primary} />}
                        <Text style={styles.secondaryBtnText}>Compartir QR</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.helperText}>
                  Copia la llave Bre-B o guarda el QR para pagarlo desde tu banco por el monto exacto. Al volver a Buddy confirmaremos tu plan automáticamente.
                </Text>

                {feedback ? (
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackText}>{feedback}</Text>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.errorBox}>
                    <AlertCircle size={16} color="#BE123C" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.footerActions}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, (verifying || renewing) && styles.btnDisabled]}
                    disabled={verifying || renewing}
                    onPress={() => void verifyNow(true)}
                    activeOpacity={0.85}
                  >
                    {verifying ? (
                      <ActivityIndicator size="small" color={colors.neutral.white} />
                    ) : (
                      <CheckCircle2 size={16} color={colors.neutral.white} />
                    )}
                    <Text style={styles.primaryBtnText}>
                      {verifying ? 'Verificando…' : 'Ya pagué · Verificar'}
                    </Text>
                  </TouchableOpacity>

                  {expired || status === 'failed' ? (
                    <TouchableOpacity
                      style={[styles.secondaryFullBtn, renewing && styles.btnDisabled]}
                      disabled={renewing}
                      onPress={() => void handleRenew()}
                      activeOpacity={0.8}
                    >
                      <RefreshCw size={14} color={colors.brand.primary} />
                      <Text style={styles.secondaryBtnText}>Generar nuevo QR</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.refText}>Ref: {checkout.reference}</Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 10, 34, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EAF6',
    backgroundColor: '#FAF7FF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFE4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#261743',
  },
  sandboxBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sandboxBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  subtitle: {
    fontSize: 12,
    color: '#786593',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 18,
    paddingBottom: 30,
    gap: 12,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7FF',
    borderWidth: 1,
    borderColor: '#E8D1F1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A72B2',
    letterSpacing: 0.4,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#261743',
    marginTop: 2,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: '#D8C2EE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  keyCard: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: '#E7DDF2',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyValue: {
    flex: 1,
    backgroundColor: '#F6F2FB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 12,
    fontWeight: '700',
    color: '#261743',
  },
  copyKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  copyKeyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  qrSection: {
    alignItems: 'center',
    gap: 10,
  },
  qrBox: {
    width: 210,
    height: 210,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DDF2',
    backgroundColor: colors.neutral.white,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrDimmed: {
    opacity: 0.25,
  },
  qrFallback: {
    fontSize: 12,
    color: '#786593',
    textAlign: 'center',
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  expiredTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#261743',
  },
  renewOverlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  renewOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countdownText: {
    fontSize: 12,
    color: '#6B5B8A',
    fontWeight: '600',
  },
  countdownMono: {
    color: '#261743',
    fontWeight: '800',
  },
  qrActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D8C2EE',
    backgroundColor: '#FAF7FF',
    borderRadius: 12,
    paddingVertical: 10,
  },
  secondaryFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D8C2EE',
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#786593',
    textAlign: 'center',
  },
  feedbackBox: {
    backgroundColor: '#FAF7FF',
    borderWidth: 1,
    borderColor: '#E2D8F2',
    borderRadius: 12,
    padding: 10,
  },
  feedbackText: {
    fontSize: 12,
    color: '#54209E',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#BE123C',
  },
  footerActions: {
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 13,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  refText: {
    fontSize: 11,
    color: '#9A87B8',
    textAlign: 'center',
    marginTop: 2,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#261743',
  },
  successDesc: {
    fontSize: 13,
    color: '#6C5A88',
    textAlign: 'center',
  },
});
