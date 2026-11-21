'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Loader2,
  QrCode,
  RefreshCw,
  X,
} from 'lucide-react';
import { checkBillingStatus, type BillingCheckout } from '@beeapp/api-client';

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
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
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
    const interval = window.setInterval(() => {
      void verifyNow(false);
    }, POLL_INTERVAL_MS);
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void verifyNow(false);
      }
    };
    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [checkout, expired, status, verifyNow]);

  useEffect(() => {
    if (!checkout) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [checkout, onClose]);

  if (!checkout) return null;

  const copyValue = async (field: 'key' | 'amount', value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
    } catch {
      setError('No se pudo copiar automáticamente. Cópialo manualmente.');
    }
  };

  const handleRenew = async () => {
    setRenewing(true);
    setError('');
    setFeedback('');
    try {
      await onRenew(checkout);
    } catch (renewError) {
      setError(renewError instanceof Error ? renewError.message : 'No se pudo renovar el código QR.');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Pago con Factus Pay Bre-B"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[#E7DDF2] bg-white shadow-[0_24px_60px_rgba(38,23,67,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#F1EAF6] bg-[#FAF7FF] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7427D5]/10 text-[#7427D5]">
              <QrCode className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-[#261743]">Pagar con Factus Pay · Bre-B</h3>
                {checkout.sandbox ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Sandbox
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-[#786593]">
                Plan {checkout.planName} ({checkout.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de pago"
            className="rounded-lg p-1.5 text-[#786593] hover:bg-[#F1EAF6] hover:text-[#261743]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[82vh] space-y-4 overflow-y-auto p-5">
          {status === 'paid' ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-[#261743]">¡Pago confirmado!</h4>
                <p className="mt-1 text-xs text-[#6C5A88]">
                  Tu plan <strong>{checkout.planName}</strong> por {formatCop(checkout.amount)} ya está activo.
                </p>
                <p className="mt-1 text-[11px] text-[#8A72B2]">Referencia: {checkout.reference}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[#7427D5] py-2.5 text-sm font-extrabold text-white hover:bg-[#5E1ABF]"
              >
                Listo
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-2xl border border-[#E8D1F1] bg-[#FAF7FF] px-3.5 py-2.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A72B2]">Monto exacto a transferir</p>
                  <p className="text-xl font-extrabold text-[#261743]">{formatCop(checkout.amount)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyValue('amount', String(Math.round(checkout.amount)))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8C2EE] bg-white px-3 py-1.5 text-xs font-bold text-[#5E1ABF] hover:bg-[#F6EAFE]"
                >
                  {copiedField === 'amount' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedField === 'amount' ? 'Copiado' : 'Copiar monto'}
                </button>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white p-3 shadow-sm">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qr}
                      alt="Código QR Bre-B de Factus Pay"
                      className={`h-full w-full object-contain ${expired || status === 'failed' ? 'opacity-25 blur-[1px]' : ''}`}
                    />
                  ) : (
                    <p className="px-4 text-center text-xs text-[#786593]">QR no disponible. Usa la llave Bre-B.</p>
                  )}

                  {expired ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 p-4 text-center">
                      <Clock className="h-6 w-6 text-amber-600" />
                      <p className="mt-1 text-xs font-extrabold text-[#261743]">Este QR ha vencido</p>
                      <button
                        type="button"
                        disabled={renewing}
                        onClick={() => void handleRenew()}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#7427D5] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#5E1ABF] disabled:opacity-50"
                      >
                        {renewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Generar nuevo QR
                      </button>
                    </div>
                  ) : null}
                </div>

                {remainingMs !== null && !expired ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#6B5B8A]">
                    <Clock className="h-3.5 w-3.5 text-[#7427D5]" />
                    Expira en <span className="font-mono text-[#261743]">{formatCountdown(remainingMs)}</span>
                  </p>
                ) : null}

                {qr && !expired && status === 'ready' ? (
                  <a
                    href={qr}
                    download={`factus-pay-qr-${checkout.reference}.png`}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[#D8C2EE] bg-white px-3 py-1.5 text-xs font-bold text-[#5E1ABF] hover:bg-[#F6EAFE]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar QR
                  </a>
                ) : null}
              </div>

              {brebKey ? (
                <div className="rounded-2xl border border-[#E7DDF2] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A72B2]">Llave Bre-B</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-[#F6F2FB] px-2.5 py-1.5 font-mono text-xs font-semibold text-[#261743]">
                      {brebKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyValue('key', brebKey)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#7427D5]/10 px-3 py-1.5 text-xs font-bold text-[#5E1ABF] hover:bg-[#7427D5]/20"
                    >
                      {copiedField === 'key' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'key' ? 'Copiada' : 'Copiar llave'}
                    </button>
                  </div>
                </div>
              ) : null}

              <p className="text-center text-[11px] leading-relaxed text-[#786593]">
                Escanea el QR desde tu app bancaria o transfiere el <strong>monto exacto</strong> a la llave Bre-B. Detectaremos tu pago automáticamente.
              </p>

              {feedback ? (
                <p className="rounded-xl border border-[#E2D8F2] bg-[#FAF7FF] px-3 py-2 text-xs text-[#54209E]">
                  {feedback}
                </p>
              ) : null}

              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={verifying || renewing}
                  onClick={() => void verifyNow(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#7427D5] py-2.5 text-xs font-extrabold text-white hover:bg-[#5E1ABF] disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {verifying ? 'Verificando…' : 'Ya pagué · Verificar'}
                </button>
                {expired || status === 'failed' ? (
                  <button
                    type="button"
                    disabled={renewing}
                    onClick={() => void handleRenew()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8C2EE] bg-white px-3.5 py-2.5 text-xs font-bold text-[#5E1ABF] hover:bg-[#F6EAFE] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${renewing ? 'animate-spin' : ''}`} />
                    Renovar QR
                  </button>
                ) : null}
              </div>

              <p className="text-center text-[10px] text-[#9A87B8]">
                Ref: {checkout.reference}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
