'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  History,
  MessageSquare,
  Package,
  RefreshCw,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  acceptCommercialRequestItemProposal,
  acceptCommercialRequestProposal,
  closeCommercialRequestItem,
  createCommercialRequestItemProposal,
  createCommercialRequestProposal,
  getCommercialPaymentProofAccess,
  getCommercialRequestFormalDetail,
  getCommercialRequestPaymentMethods,
  openCommercialProfileChat,
  rejectCommercialRequestItemProposal,
  rejectCommercialRequestProposal,
  replaceCommercialPaymentProof,
  submitCommercialPaymentProof,
  transitionCommercialRequest,
  uploadCurrentWebStorageFiles,
  withdrawCommercialRequestItemProposal,
  withdrawCommercialRequestProposal,
} from '@beeapp/api-client';
import type {
  CommercialModality,
  CommercialPaymentMethodPublic,
  CommercialPaymentProof,
  CommercialRequestDetail,
  CommercialRequestDetailContext,
  CommercialRequestDetailItem,
  CommercialRequestProposal,
} from '@beeapp/shared-types';
import { getWebAuth } from '@/lib/client/webAuth';
import {
  formatCommercialRequestListAmount,
  formatCommercialRequestListDate,
  getCommercialModalityLabel,
  getCommercialRequestListStatusLabel,
  getCommercialRequestListStatusTone,
  getCommercialRequestListTypeLabel,
  type CommercialRequestListStatusTone,
} from '@/lib/client/beeservices/commercialRequestListPresentation';
import {
  CommercialShell,
  actionError,
  fieldClass,
  moneyCop,
  primaryButtonClass,
  secondaryButtonClass,
} from '../CommercialShell';

const STATUS_BADGE_CLASS: Record<CommercialRequestListStatusTone, string> = {
  neutral: 'bg-[#F4EDFC] text-[#54209E]',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-700',
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending_business: 'Esperando respuesta del negocio',
  pending_customer: 'Propuesta recibida del negocio',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  withdrawn: 'Retirado',
  payment_pending: 'Pago pendiente',
  payment_submitted: 'Comprobante enviado',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready_for_pickup: 'Listo para recoger',
  shipped: 'En camino',
  delivered: 'Entregado',
  in_progress: 'En progreso',
  completed: 'Completado',
  no_show: 'No asistió',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

const PUBLIC_DETAIL_LABELS: Record<string, string> = {
  wallet_type: 'Billetera',
  payment_key: 'Número / Llave de pago',
  account_holder_name: 'Titular',
  account_holder_document_type: 'Tipo de documento',
  account_holder_document_number: 'Número de documento',
  bank_name: 'Banco',
  account_type: 'Tipo de cuenta',
  account_number: 'Número de cuenta',
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatHoldCountdown(expiresIso: string | null | undefined, nowMs: number): string | null {
  if (!expiresIso) return null;
  const target = new Date(expiresIso).getTime();
  if (Number.isNaN(target)) return null;
  const diffSec = Math.max(0, Math.floor((target - nowMs) / 1000));
  if (diffSec <= 0) return 'Reserva temporal expirada';
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `Tiempo restante de reserva: ${mins}m ${String(secs).padStart(2, '0')}s`;
}

export default function CustomerRequestDetailView({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<CommercialRequestDetail | null>(null);
  const [context, setContext] = useState<CommercialRequestDetailContext | null>(null);
  const [fallbackMethods, setFallbackMethods] = useState<CommercialPaymentMethodPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Counteroffer per item
  const [counterItemId, setCounterItemId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQty, setCounterQty] = useState('1');
  const [counterStartsAt, setCounterStartsAt] = useState('');
  const [counterNote, setCounterNote] = useState('');

  // Global proposal
  const [showGlobalProposal, setShowGlobalProposal] = useState(false);
  const [globalSubtotal, setGlobalSubtotal] = useState('');
  const [globalStartsAt, setGlobalStartsAt] = useState('');
  const [globalNote, setGlobalNote] = useState('');

  // Payment proof submission
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const [detailRes, methodsRes] = await Promise.all([
        getCommercialRequestFormalDetail(auth, requestId),
        getCommercialRequestPaymentMethods(auth, requestId).catch(() => ({
          request_id: requestId,
          payment_methods: [] as CommercialPaymentMethodPublic[],
        })),
      ]);
      setRequest(detailRes.request);
      setContext(detailRes.context);
      setFallbackMethods(methodsRes.payment_methods || []);
      const methods =
        detailRes.context.payment_options?.manual_payment_methods?.length
          ? detailRes.context.payment_options.manual_payment_methods
          : methodsRes.payment_methods || [];
      if (methods.length > 0) {
        setSelectedPaymentMethodId((curr) => curr || methods[0].id);
      }
    } catch (loadError) {
      setError(actionError(loadError));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const openChatWithBusiness = async () => {
    if (!request) return;
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      const res = await openCommercialProfileChat(auth, request.commercial_profile_id);
      router.push(`/app?openChat=${encodeURIComponent(res.conversation_id)}`);
    } catch (chatError) {
      setNotice(actionError(chatError));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!request) return;
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta solicitud?')) return;
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await transitionCommercialRequest(auth, requestId, {
        action: 'cancel',
        reason_code: 'customer_cancelled',
        reason_text: 'Cancelada por el cliente desde la web.',
      });
      setNotice('Solicitud cancelada correctamente.');
      await load();
    } catch (cancelError) {
      setNotice(actionError(cancelError));
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptItemProposal = async (proposalId: string) => {
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await acceptCommercialRequestItemProposal(auth, proposalId);
      setNotice('Propuesta aceptada.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRejectItemProposal = async (itemId: string) => {
    const reason = window.prompt('Motivo del rechazo (opcional):') ?? '';
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await rejectCommercialRequestItemProposal(auth, itemId, {
        reason_text: reason.trim() || null,
      });
      setNotice('Propuesta rechazada.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawItemProposal = async (proposalId: string) => {
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await withdrawCommercialRequestItemProposal(auth, proposalId);
      setNotice('Contraoferta retirada.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawItem = async (item: CommercialRequestDetailItem) => {
    if (!window.confirm(`¿Retirar "${item.title}" de tu solicitud?`)) return;
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await closeCommercialRequestItem(auth, item.id, {
        action: 'withdraw',
        reason_text: 'Retirado por el cliente',
      });
      setNotice('Ítem retirado de la solicitud.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitItemCounteroffer = async (event: FormEvent, item: CommercialRequestDetailItem) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      const priceNum = counterPrice.trim() ? Number(counterPrice) : null;
      const qtyNum = counterQty.trim() ? Number(counterQty) : item.quantity;
      const startsIso = counterStartsAt ? new Date(counterStartsAt).toISOString() : null;
      const endsIso =
        startsIso && item.duration_minutes
          ? new Date(new Date(counterStartsAt).getTime() + item.duration_minutes * 60_000).toISOString()
          : null;

      await createCommercialRequestItemProposal(auth, item.id, {
        proposed_quantity: qtyNum,
        proposed_unit_price_amount: priceNum,
        requested_modality: item.modality,
        proposed_starts_at: startsIso,
        proposed_ends_at: endsIso,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        note: counterNote.trim() || null,
      });
      setCounterItemId(null);
      setCounterPrice('');
      setCounterNote('');
      setCounterStartsAt('');
      setNotice('Contraoferta enviada al negocio.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptGlobalProposal = async (proposalId: string) => {
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await acceptCommercialRequestProposal(auth, proposalId);
      setNotice('Propuesta general aceptada.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRejectGlobalProposal = async (proposalId: string) => {
    const reason = window.prompt('Motivo del rechazo (opcional):') ?? '';
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await rejectCommercialRequestProposal(auth, proposalId, {
        rejection_reason: reason.trim() || null,
      });
      setNotice('Propuesta general rechazada.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawGlobalProposal = async (proposalId: string) => {
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await withdrawCommercialRequestProposal(auth, proposalId);
      setNotice('Propuesta retirada.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitGlobalProposal = async (event: FormEvent) => {
    event.preventDefault();
    if (!request) return;
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      const amount = globalSubtotal.trim() ? Number(globalSubtotal) : request.subtotal_amount;
      await createCommercialRequestProposal(auth, requestId, {
        requested_modality: request.requested_modality,
        subtotal_amount: amount,
        total_amount: amount != null ? amount + (request.delivery_fee_amount || 0) : null,
        proposed_starts_at: globalStartsAt ? new Date(globalStartsAt).toISOString() : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        note: globalNote.trim() || null,
      });
      setShowGlobalProposal(false);
      setGlobalSubtotal('');
      setGlobalStartsAt('');
      setGlobalNote('');
      setNotice('Contraoferta enviada.');
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleProofFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    setProofFile(file);
  };

  const handleSubmitOrReplaceProof = async (event: FormEvent) => {
    event.preventDefault();
    if (!proofFile) {
      setNotice('Selecciona una imagen o PDF del comprobante de pago.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('files', proofFile);
      const uploaded = await uploadCurrentWebStorageFiles(formData);
      const uploadedFile = uploaded.files?.[0];
      if (!uploadedFile?.id) {
        throw new Error('No fue posible subir el archivo del comprobante.');
      }

      const auth = await getWebAuth();
      const activeSubmittedId =
        context?.payment_attempts?.active_submitted_proof_id
        || context?.payment_options?.active_submitted_proof_id;

      if (activeSubmittedId && context?.permissions.can_replace_payment_proof) {
        await replaceCommercialPaymentProof(auth, activeSubmittedId, {
          file_id: uploadedFile.id,
          payment_method_id: selectedPaymentMethodId || null,
          payment_reference: paymentReference.trim() || null,
          note: paymentNote.trim() || null,
        });
        setNotice('Comprobante de pago reemplazado correctamente.');
      } else {
        await submitCommercialPaymentProof(auth, requestId, {
          file_id: uploadedFile.id,
          payment_method_id: selectedPaymentMethodId || null,
          payment_reference: paymentReference.trim() || null,
          note: paymentNote.trim() || null,
        });
        setNotice('Comprobante de pago enviado correctamente.');
      }
      setProofFile(null);
      setPaymentReference('');
      setPaymentNote('');
      await load();
    } catch (proofError) {
      setNotice(actionError(proofError));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenProofFile = async (proof: CommercialPaymentProof, download = false) => {
    try {
      const auth = await getWebAuth();
      const access = await getCommercialPaymentProofAccess(auth, proof.id, { download });
      window.open(access.url, '_blank', 'noopener,noreferrer');
    } catch (accessError) {
      setNotice(actionError(accessError));
    }
  };

  const paymentMethods: CommercialPaymentMethodPublic[] =
    context?.payment_options?.manual_payment_methods?.length
      ? context.payment_options.manual_payment_methods
      : fallbackMethods;

  const reservations =
    context?.reservations && context.reservations.length > 0
      ? context.reservations
      : context?.reservation
        ? [context.reservation]
        : [];

  const proposals = context?.timeline?.proposals || [];
  const timelineEvents = context?.timeline?.events || [];
  const paymentProofs = context?.payment_proofs || [];
  const attemptsUsed = context?.payment_attempts?.attempts_used ?? paymentProofs.length;
  const maxAttempts = context?.payment_attempts?.max_attempts ?? 3;
  const canSubmitProof = Boolean(
    context?.permissions.can_submit_payment_proof
    || context?.permissions.can_replace_payment_proof
    || context?.payment_attempts?.can_submit_payment_proof
    || context?.payment_attempts?.can_replace_payment_proof,
  );

  const statusTone = request ? getCommercialRequestListStatusTone(request.status) : 'neutral';

  return (
    <CommercialShell
      title={request?.code ? `Solicitud ${request.code}` : 'Detalle de solicitud'}
      description={
        context?.business?.display_name
          ? `${context.business.display_name}${context.business.city ? ` · ${context.business.city}` : ''}`
          : 'Estado, pagos y seguimiento de tu compra o reserva'
      }
      backHref="/app/beeservices/my-purchases"
      wide
    >
      {loading && !request ? (
        <div className="rounded-2xl border border-[#E7D9F0] bg-white p-6 text-sm text-[#786593]">
          Cargando detalle de la solicitud…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-bold">No fue posible cargar la solicitud</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-full bg-[#7427D5] px-4 py-1.5 text-xs font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-[#E2D6F0] bg-[#FAF4FF] px-4 py-3 text-sm font-medium text-[#5E1ABF]">
          {notice}
        </div>
      ) : null}

      {request ? (
        <div className="space-y-5">
          {/* Header summary card */}
          <section className="rounded-2xl border border-[#E7DDF2] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#8A72B2]">
                    {getCommercialRequestListTypeLabel(request.request_type)}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_BADGE_CLASS[statusTone]}`}>
                    {getCommercialRequestListStatusLabel(request.status)}
                  </span>
                  {request.requested_modality ? (
                    <span className="rounded-full bg-[#F7F1FB] px-2.5 py-1 text-xs font-semibold text-[#5C4A78]">
                      {getCommercialModalityLabel(request.requested_modality as CommercialModality)}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 text-lg font-extrabold text-[#261743]">
                  {context?.business?.display_name || 'Negocio'} · {request.code}
                </h2>
                <p className="mt-0.5 text-xs text-[#786593]">
                  Creada el {formatCommercialRequestListDate(request.created_at)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading || busy}
                  className={secondaryButtonClass}
                >
                  <RefreshCw className="mr-1.5 inline h-3.5 w-3.5" />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => void openChatWithBusiness()}
                  disabled={busy}
                  className={primaryButtonClass}
                >
                  <MessageSquare className="mr-1.5 inline h-4 w-4" />
                  Escribir al negocio
                </button>
                {context?.business?.id ? (
                  <Link
                    href={`/app/beeservices/profile/${context.business.id}`}
                    className={secondaryButtonClass}
                  >
                    Ver perfil
                  </Link>
                ) : null}
              </div>
            </div>

            {request.customer_note ? (
              <div className="mt-4 rounded-xl bg-[#FAF7FD] px-3.5 py-2.5 text-xs text-[#594C67]">
                <span className="font-bold text-[#261743]">Tu nota: </span>
                {request.customer_note}
              </div>
            ) : null}

            {request.delivery_address ? (
              <div className="mt-2 rounded-xl bg-[#FAF7FD] px-3.5 py-2.5 text-xs text-[#594C67]">
                <span className="font-bold text-[#261743]">Dirección de entrega: </span>
                {request.delivery_address}
                {request.delivery_reference ? ` (${request.delivery_reference})` : ''}
              </div>
            ) : null}
          </section>

          {/* Reservations and Hold Countdown */}
          {reservations.length > 0 ? (
            <section className="rounded-2xl border border-[#E7DDF2] bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#7427D5]" />
                <h3 className="text-sm font-extrabold text-[#261743]">Reserva programada</h3>
              </div>
              {reservations.map((res) => {
                const holdText = res.status === 'hold' ? formatHoldCountdown(res.hold_expires_at, nowMs) : null;
                return (
                  <div
                    key={res.id}
                    className="rounded-xl border border-[#F0EAF3] bg-[#FCFAFD] p-3.5 text-xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#261743]">
                        Inicio: {formatDateTime(res.starts_at)} — Fin: {formatDateTime(res.ends_at)}
                      </span>
                      <span className="rounded-full bg-[#F4EDFC] px-2.5 py-0.5 text-[11px] font-bold text-[#7427D5]">
                        Estado: {res.status}
                      </span>
                    </div>
                    <p className="text-[#786593]">Zona horaria: {res.timezone}</p>
                    {holdText ? (
                      <p className="flex items-center gap-1.5 font-bold text-amber-700">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{holdText}</span>
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </section>
          ) : null}

          {/* Items & Per-item Negotiation */}
          <section className="rounded-2xl border border-[#E7DDF2] bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#261743]">
                Ítems de la solicitud ({request.items.length})
              </h3>
              {context?.permissions.can_create_proposal ? (
                <button
                  type="button"
                  onClick={() => setShowGlobalProposal((v) => !v)}
                  className="text-xs font-bold text-[#7427D5] hover:underline"
                >
                  {showGlobalProposal ? 'Cerrar propuesta global' : 'Enviar propuesta global'}
                </button>
              ) : null}
            </div>

            <ul className="space-y-3">
              {request.items.map((item) => {
                const itemProposals = proposals.filter((p) => p.commerce_request_item_id === item.id);
                const pendingProposal = itemProposals.find((p) => p.status === 'pending');
                const isProposedByBusiness =
                  pendingProposal && pendingProposal.proposed_by_profile_id !== request.client_id;
                const isProposedByMe =
                  pendingProposal && pendingProposal.proposed_by_profile_id === request.client_id;
                const unitPrice = item.final_unit_price_amount ?? item.unit_price_amount;
                const qty = item.final_quantity ?? item.quantity;
                const lineTotal = item.final_line_total_amount ?? item.line_total_amount;
                const lifecycleLabel =
                  (item.lifecycle_status && ITEM_STATUS_LABELS[item.lifecycle_status])
                  || item.lifecycle_status
                  || 'Registrado';

                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-[#F0EAF3] bg-[#FFFCF9] p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F6EAFE] text-[#7427D5]">
                          {item.offer_kind === 'service' ? (
                            <Wrench className="h-5 w-5" />
                          ) : (
                            <Package className="h-5 w-5" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-[#261743]">{item.title}</p>
                          <p className="text-xs text-[#786593]">
                            Cantidad: {qty} · Unitario: {formatCommercialRequestListAmount(unitPrice, item.currency_code)}
                            {item.modality ? ` · ${getCommercialModalityLabel(item.modality)}` : ''}
                          </p>
                          {item.customer_note ? (
                            <p className="mt-1 text-xs text-[#5C4A78]">Comentario: {item.customer_note}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block rounded-full bg-[#F4EDFC] px-2.5 py-0.5 text-[11px] font-bold text-[#54209E]">
                          {lifecycleLabel}
                        </span>
                        <p className="mt-1 text-sm font-extrabold text-[#7427D5]">
                          {formatCommercialRequestListAmount(lineTotal, item.currency_code)}
                        </p>
                      </div>
                    </div>

                    {pendingProposal ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-2">
                        <p className="font-bold text-amber-900">
                          {isProposedByBusiness
                            ? 'El negocio envió una propuesta para este ítem:'
                            : 'Enviaste una contraoferta para este ítem:'}
                        </p>
                        <p className="text-amber-800">
                          {pendingProposal.proposed_quantity != null
                            ? `Cantidad: ${pendingProposal.proposed_quantity} · `
                            : ''}
                          Precio unitario:{' '}
                          {formatCommercialRequestListAmount(
                            pendingProposal.proposed_unit_price_amount ?? pendingProposal.total_amount,
                            pendingProposal.currency_code,
                          )}
                          {pendingProposal.proposed_starts_at
                            ? ` · Fecha: ${formatDateTime(pendingProposal.proposed_starts_at)}`
                            : ''}
                        </p>
                        {pendingProposal.note ? (
                          <p className="text-amber-800">Nota: {pendingProposal.note}</p>
                        ) : null}

                        <div className="flex flex-wrap gap-2 pt-1">
                          {isProposedByBusiness ? (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleAcceptItemProposal(pendingProposal.id)}
                                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Aceptar propuesta
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleRejectItemProposal(item.id)}
                                className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                              >
                                Rechazar
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setCounterItemId(item.id);
                                  setCounterQty(String(pendingProposal.proposed_quantity ?? item.quantity));
                                  setCounterPrice(
                                    String(pendingProposal.proposed_unit_price_amount ?? item.unit_price_amount ?? ''),
                                  );
                                }}
                                className="rounded-full border border-[#7427D5] bg-white px-3 py-1.5 text-xs font-bold text-[#7427D5]"
                              >
                                Contraofertar
                              </button>
                            </>
                          ) : isProposedByMe ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleWithdrawItemProposal(pendingProposal.id)}
                              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                            >
                              Retirar mi contraoferta
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {/* Item action buttons */}
                    {item.lifecycle_status === 'pending_business' || item.lifecycle_status === 'pending_customer' ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {counterItemId !== item.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCounterItemId(item.id);
                              setCounterQty(String(item.quantity));
                              setCounterPrice(item.unit_price_amount != null ? String(item.unit_price_amount) : '');
                            }}
                            className="text-xs font-bold text-[#7427D5] hover:underline"
                          >
                            Proponer nuevo precio o fecha
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleWithdrawItem(item)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Retirar ítem
                        </button>
                      </div>
                    ) : null}

                    {counterItemId === item.id ? (
                      <form
                        onSubmit={(e) => void handleSubmitItemCounteroffer(e, item)}
                        className="mt-2 space-y-2.5 rounded-xl border border-[#E2D6F0] bg-white p-3.5"
                      >
                        <p className="text-xs font-extrabold text-[#261743]">
                          Enviar contraoferta para &ldquo;{item.title}&rdquo;
                        </p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <label className="text-xs font-semibold text-[#5C4A78]">
                            Precio unitario (COP)
                            <input
                              type="number"
                              min={0}
                              required
                              value={counterPrice}
                              onChange={(e) => setCounterPrice(e.target.value)}
                              className={fieldClass}
                            />
                          </label>
                          <label className="text-xs font-semibold text-[#5C4A78]">
                            Cantidad
                            <input
                              type="number"
                              min={1}
                              required
                              value={counterQty}
                              onChange={(e) => setCounterQty(e.target.value)}
                              className={fieldClass}
                            />
                          </label>
                        </div>
                        {item.requires_booking || item.offer_kind === 'service' ? (
                          <label className="block text-xs font-semibold text-[#5C4A78]">
                            Nueva fecha y hora propuesta (opcional)
                            <input
                              type="datetime-local"
                              value={counterStartsAt}
                              onChange={(e) => setCounterStartsAt(e.target.value)}
                              className={fieldClass}
                            />
                          </label>
                        ) : null}
                        <input
                          type="text"
                          value={counterNote}
                          onChange={(e) => setCounterNote(e.target.value)}
                          placeholder="Mensaje o nota para el negocio..."
                          className={fieldClass}
                        />
                        <div className="flex gap-2">
                          <button type="submit" disabled={busy} className={primaryButtonClass}>
                            Enviar contraoferta
                          </button>
                          <button
                            type="button"
                            onClick={() => setCounterItemId(null)}
                            className={secondaryButtonClass}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {/* Global proposals */}
            {showGlobalProposal ? (
              <form
                onSubmit={(e) => void handleSubmitGlobalProposal(e)}
                className="space-y-3 rounded-2xl border border-[#E2D6F0] bg-[#FAF7FD] p-4"
              >
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7427D5]">
                  Nueva propuesta global
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-[#5C4A78]">
                    Subtotal propuesto (COP)
                    <input
                      type="number"
                      min={0}
                      required
                      value={globalSubtotal}
                      onChange={(e) => setGlobalSubtotal(e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#5C4A78]">
                    Fecha y hora propuesta (opcional)
                    <input
                      type="datetime-local"
                      value={globalStartsAt}
                      onChange={(e) => setGlobalStartsAt(e.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={globalNote}
                  onChange={(e) => setGlobalNote(e.target.value)}
                  placeholder="Explica tu propuesta al negocio..."
                  className={fieldClass}
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className={primaryButtonClass}>
                    Enviar propuesta
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGlobalProposal(false)}
                    className={secondaryButtonClass}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : null}

            {proposals.filter((p) => !p.commerce_request_item_id && p.status === 'pending').map((prop: CommercialRequestProposal) => {
              const fromBusiness = prop.proposed_by_profile_id !== request.client_id;
              return (
                <div
                  key={prop.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs space-y-2"
                >
                  <p className="font-bold text-amber-900">
                    {fromBusiness ? 'Propuesta global del negocio' : 'Tu propuesta global pendiente'} (v{prop.version_number})
                  </p>
                  <p className="text-amber-800">
                    Total propuesto: {formatCommercialRequestListAmount(prop.total_amount, prop.currency_code)}
                    {prop.proposed_starts_at ? ` · Fecha: ${formatDateTime(prop.proposed_starts_at)}` : ''}
                  </p>
                  {prop.note ? <p className="text-amber-800">Nota: {prop.note}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {fromBusiness && context?.permissions.can_accept_proposal ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleAcceptGlobalProposal(prop.id)}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Aceptar propuesta
                      </button>
                    ) : null}
                    {fromBusiness && context?.permissions.can_reject_proposal ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRejectGlobalProposal(prop.id)}
                        className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Rechazar
                      </button>
                    ) : null}
                    {!fromBusiness && context?.permissions.can_withdraw_proposal ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleWithdrawGlobalProposal(prop.id)}
                        className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                      >
                        Retirar propuesta
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* Financial Totals */}
            <div className="border-t border-[#F1EAF6] pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#5C4A78]">
                <span>Subtotal</span>
                <span>{formatCommercialRequestListAmount(request.subtotal_amount, request.currency_code)}</span>
              </div>
              {request.delivery_fee_amount != null ? (
                <div className="flex justify-between text-[#5C4A78]">
                  <span>Domicilio</span>
                  <span>{moneyCop(request.delivery_fee_amount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-extrabold text-[#261743] pt-1">
                <span>Total</span>
                <span className="text-[#7427D5]">
                  {formatCommercialRequestListAmount(request.total_amount, request.currency_code)}
                </span>
              </div>
            </div>
          </section>

          {/* Payment Methods & Payment Proof Upload */}
          {(paymentMethods.length > 0 || canSubmitProof || paymentProofs.length > 0 || context?.payment_options?.cash_on_delivery_available) ? (
            <section className="rounded-2xl border border-[#E7DDF2] bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#7427D5]" />
                  <h3 className="text-sm font-extrabold text-[#261743]">Medios de pago y comprobantes</h3>
                </div>
                <span className="rounded-full bg-[#F4EDFC] px-3 py-1 text-xs font-bold text-[#7427D5]">
                  Intentos de comprobante: {attemptsUsed}/{maxAttempts}
                </span>
              </div>

              {context?.payment_options?.cash_on_delivery_available ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-emerald-600" />
                  Este negocio también acepta <strong>Pago contraentrega</strong>.
                </div>
              ) : null}

              {paymentMethods.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {paymentMethods.map((method) => {
                    const details = Object.entries(method.public_details || {}).filter(
                      ([, val]) => val !== null && val !== undefined && String(val).trim() !== '',
                    );
                    return (
                      <div
                        key={method.id}
                        className="rounded-xl border border-[#E7D9F0] bg-[#FCFAFD] p-3.5 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[#261743]">{method.display_name}</span>
                          <span className="rounded-full bg-[#F6EAFE] px-2 py-0.5 text-[10px] font-bold uppercase text-[#7427D5]">
                            {method.payment_method_type}
                          </span>
                        </div>

                        {details.length > 0 ? (
                          <dl className="space-y-1 border-t border-[#F0EAF3] pt-2">
                            {details.map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-2">
                                <dt className="text-[#786593]">{PUBLIC_DETAIL_LABELS[k] || k}:</dt>
                                <dd className="font-bold text-[#261743] break-all text-right">{String(v)}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}

                        {method.public_instructions ? (
                          <p className="rounded-lg bg-white p-2 text-[11px] text-[#5C4A78] border border-[#F0EAF3]">
                            {method.public_instructions}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Existing submitted proofs */}
              {paymentProofs.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8A72B2]">
                    Comprobantes enviados
                  </h4>
                  {paymentProofs.map((proof) => (
                    <div
                      key={proof.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F0EAF3] bg-[#FFFCF9] p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#7427D5]" />
                          <span className="font-bold text-[#261743]">
                            Intento #{proof.attempt_number} ({proof.status === 'confirmed' ? 'Aprobado' : proof.status === 'rejected' ? 'Rechazado' : proof.status === 'replaced' ? 'Reemplazado' : 'En revisión'})
                          </span>
                        </div>
                        {proof.payment_reference ? (
                          <p className="text-[#786593]">Referencia: {proof.payment_reference}</p>
                        ) : null}
                        {proof.rejection_reason ? (
                          <p className="font-semibold text-rose-600">
                            Motivo de rechazo: {proof.rejection_reason}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleOpenProofFile(proof, false)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2D6F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5E1ABF]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleOpenProofFile(proof, true)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2D6F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5E1ABF]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Upload or Replace Payment Proof Form */}
              {canSubmitProof ? (
                <form
                  onSubmit={(e) => void handleSubmitOrReplaceProof(e)}
                  className="space-y-3 rounded-2xl border border-[#E2D6F0] bg-[#FAF7FD] p-4"
                >
                  <h4 className="text-xs font-extrabold text-[#261743]">
                    {context?.permissions.can_replace_payment_proof
                      ? 'Reemplazar comprobante de pago (Imagen o PDF)'
                      : 'Subir comprobante de pago (Imagen o PDF)'}
                  </h4>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {paymentMethods.length > 0 ? (
                      <label className="text-xs font-semibold text-[#5C4A78]">
                        Medio de pago utilizado
                        <select
                          value={selectedPaymentMethodId}
                          onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                          className={fieldClass}
                        >
                          {paymentMethods.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.display_name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="text-xs font-semibold text-[#5C4A78]">
                      Referencia o código de transacción (opcional)
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Ej. M1294857"
                        className={fieldClass}
                      />
                    </label>
                  </div>

                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleProofFileChange}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => proofInputRef.current?.click()}
                      className={secondaryButtonClass}
                    >
                      <Upload className="mr-1.5 inline h-4 w-4" />
                      {proofFile ? proofFile.name : 'Seleccionar imagen o PDF'}
                    </button>
                  </div>

                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Nota adicional sobre el pago (opcional)"
                    className={fieldClass}
                  />

                  <button
                    type="submit"
                    disabled={busy || !proofFile}
                    className={primaryButtonClass}
                  >
                    {busy ? 'Enviando comprobante…' : 'Enviar comprobante'}
                  </button>
                </form>
              ) : context?.payment_attempts?.is_exhausted ? (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Se alcanzó el límite máximo de 3 intentos de comprobante de pago.</span>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Timeline */}
          {timelineEvents.length > 0 ? (
            <section className="rounded-2xl border border-[#E7DDF2] bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#7427D5]" />
                <h3 className="text-sm font-extrabold text-[#261743]">Historial de movimientos</h3>
              </div>
              <ol className="space-y-2 border-l-2 border-[#E7D9F0] pl-4 text-xs">
                {timelineEvents.map((ev) => (
                  <li key={ev.id} className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#261743]">
                        {ev.new_status ? getCommercialRequestListStatusLabel(ev.new_status) : ev.event_type}
                      </span>
                      <span className="text-[11px] text-[#8A72B2]">{formatDateTime(ev.created_at)}</span>
                    </div>
                    {ev.reason_text ? <p className="text-[#5C4A78]">{ev.reason_text}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Cancel button governed by permissions.can_cancel */}
          {context?.permissions.can_cancel ? (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCancelRequest()}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Cancelar solicitud
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </CommercialShell>
  );
}
