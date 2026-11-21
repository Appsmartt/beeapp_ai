'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  acceptCommercialRequestFixedItem,
  acceptCommercialRequestItemProposal,
  acceptCommercialRequestProposal,
  closeCommercialRequestItem,
  completeCommercialRequest,
  confirmCommercialPaymentReceived,
  createCommercialRequestItemProposal,
  createCommercialRequestProposal,
  createCommercialReservationHold,
  getCommercialPaymentProofAccess,
  getCommercialRequestFormalDetail,
  openCommercialProfileChat,
  rejectCommercialRequestItemProposal,
  rejectCommercialRequestProposal,
  reviewCommercialPaymentProof,
  transitionCommercialRequest,
  updateCommercialRequestItemOperationalStatus,
  withdrawCommercialRequestItemProposal,
  withdrawCommercialRequestProposal,
} from '@beeapp/api-client';
import type {
  CommercialRequestDetailItem,
  GetCommercialRequestFormalDetailResponse,
  UpdateCommercialRequestItemOperationalStatusPayload,
} from '@beeapp/shared-types';
import { getWebAuth } from '@/lib/client/webAuth';
import {
  formatCommercialRequestListDate,
  getCommercialModalityLabel,
  getCommercialRequestListStatusLabel,
  getCommercialRequestListStatusTone,
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

type OperationalNextStatus = UpdateCommercialRequestItemOperationalStatusPayload['next_status'];

const STATUS_BADGE_CLASS: Record<CommercialRequestListStatusTone, string> = {
  neutral: 'bg-[#F4EDFC] text-[#54209E] border-[#DFCFEF]',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ITEM_LIFECYCLE_LABELS: Record<string, { label: string; color: string }> = {
  pending_business: { label: 'Por revisar', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_customer: { label: 'Esperando respuesta del cliente', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  accepted: { label: 'Acordado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rechazado', color: 'bg-red-50 text-red-700 border-red-200' },
  withdrawn: { label: 'Retirado por cliente', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
  payment_pending: { label: 'Pendiente de pago', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  payment_submitted: { label: 'Comprobante enviado', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  confirmed: { label: 'Confirmado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  preparing: { label: 'En preparación', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ready_for_pickup: { label: 'Listo para recoger', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  shipped: { label: 'Enviado / En camino', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  delivered: { label: 'Entregado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_progress: { label: 'Servicio en curso', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  completed: { label: 'Completado', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  no_show: { label: 'Cliente no asistió', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelado', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
  expired: { label: 'Expirado', color: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
};

const PRODUCT_OPERATIONAL_OPTIONS: Array<{ value: OperationalNextStatus; label: string }> = [
  { value: 'preparing', label: 'En preparación' },
  { value: 'ready_for_pickup', label: 'Listo para recoger' },
  { value: 'shipped', label: 'Enviado / En camino' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const SERVICE_OPERATIONAL_OPTIONS: Array<{ value: OperationalNextStatus; label: string }> = [
  { value: 'in_progress', label: 'Servicio en curso' },
  { value: 'completed', label: 'Completado' },
  { value: 'no_show', label: 'Cliente no asistió (No-show)' },
  { value: 'cancelled', label: 'Cancelado' },
];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatHoldRemaining(expiresAt: string | null | undefined, nowMs: number): string | null {
  if (!expiresAt) return null;
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) return null;
  const diffSec = Math.floor((target - nowMs) / 1000);
  if (diffSec <= 0) return 'Reserva expirada';
  const min = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  return `${min}m ${String(sec).padStart(2, '0')}s restantes`;
}

export default function ManageRequestDetailView({
  businessId,
  requestId,
}: {
  businessId: string;
  requestId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<GetCommercialRequestFormalDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Per-item counterproposal modal state
  const [counterItem, setCounterItem] = useState<CommercialRequestDetailItem | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQty, setCounterQty] = useState('1');
  const [counterDate, setCounterDate] = useState('');
  const [counterTime, setCounterTime] = useState('09:00');
  const [counterNote, setCounterNote] = useState('');

  // Global proposal state
  const [globalProposalOpen, setGlobalProposalOpen] = useState(false);
  const [globalSubtotal, setGlobalSubtotal] = useState('');
  const [globalDeliveryFee, setGlobalDeliveryFee] = useState('');
  const [globalNote, setGlobalNote] = useState('');

  // Reservation hold state
  const [holdDate, setHoldDate] = useState('');
  const [holdTime, setHoldTime] = useState('09:00');

  // Proof rejection reason state
  const [rejectingProofId, setRejectingProofId] = useState<string | null>(null);
  const [proofRejectionReason, setProofRejectionReason] = useState('');

  // Request transition note modal
  const [transitionAction, setTransitionAction] = useState<'reject' | 'cancel' | null>(null);
  const [transitionNote, setTransitionNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = await getWebAuth();
      const response = await getCommercialRequestFormalDetail(auth, requestId);
      if (response.request.commercial_profile_id !== businessId) {
        setError('Esta solicitud no pertenece al negocio seleccionado.');
        setData(null);
      } else {
        setData(response);
      }
    } catch (loadError) {
      setError(actionError(loadError, 'No pudimos cargar el detalle de la solicitud.'));
    } finally {
      setLoading(false);
    }
  }, [businessId, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const runAction = async (fn: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setNotice('');
    try {
      await fn();
      setNotice(successMessage);
      await load();
    } catch (err) {
      setNotice(actionError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenChat = async () => {
    setBusy(true);
    try {
      const auth = await getWebAuth();
      const res = await openCommercialProfileChat(auth, businessId);
      router.push(`/app?openChat=${encodeURIComponent(res.conversation_id)}`);
    } catch (err) {
      setNotice(actionError(err, 'No fue posible abrir el chat.'));
      setBusy(false);
    }
  };

  const handleViewProof = async (proofId: string) => {
    try {
      const auth = await getWebAuth();
      const access = await getCommercialPaymentProofAccess(auth, proofId);
      if (access.url) {
        window.open(access.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setNotice(actionError(err, 'No se pudo abrir el comprobante.'));
    }
  };

  const openItemCounterModal = (item: CommercialRequestDetailItem) => {
    setCounterItem(item);
    setCounterPrice(String(item.final_unit_price_amount ?? item.unit_price_amount ?? 0));
    setCounterQty(String(item.final_quantity ?? item.quantity ?? 1));
    const startsRaw =
      item.final_starts_at ||
      (typeof item.original_terms?.requested_starts_at === 'string'
        ? item.original_terms.requested_starts_at
        : null);
    if (startsRaw) {
      const dt = new Date(startsRaw);
      if (!Number.isNaN(dt.getTime())) {
        setCounterDate(dt.toISOString().slice(0, 10));
        setCounterTime(dt.toTimeString().slice(0, 5));
      }
    } else {
      setCounterDate('');
      setCounterTime('09:00');
    }
    setCounterNote('');
  };

  const handleSubmitItemCounter = async () => {
    if (!counterItem) return;
    const price = Number(counterPrice);
    const qty = Math.max(1, Number(counterQty) || 1);
    if (!Number.isFinite(price) || price < 0) {
      setNotice('Ingresa un precio unitario válido.');
      return;
    }
    let startsIso: string | null = null;
    let endsIso: string | null = null;
    if (counterDate) {
      const startObj = new Date(`${counterDate}T${counterTime || '09:00'}:00`);
      if (!Number.isNaN(startObj.getTime())) {
        startsIso = startObj.toISOString();
        const durationMin = counterItem.duration_minutes || 60;
        endsIso = new Date(startObj.getTime() + durationMin * 60_000).toISOString();
      }
    }
    const tz = data?.context.business.timezone || 'America/Bogota';
    await runAction(async () => {
      const auth = await getWebAuth();
      await createCommercialRequestItemProposal(auth, counterItem.id, {
        proposed_unit_price_amount: price,
        proposed_quantity: qty,
        requested_modality: counterItem.final_modality || counterItem.modality,
        proposed_starts_at: startsIso,
        proposed_ends_at: endsIso,
        timezone: tz,
        note: counterNote.trim() || null,
      });
      setCounterItem(null);
    }, 'Contrapropuesta por ítem enviada al cliente.');
  };

  const handleSubmitGlobalProposal = async () => {
    if (!data) return;
    const sub = Number(globalSubtotal);
    const fee = globalDeliveryFee.trim() ? Number(globalDeliveryFee) : 0;
    if (!Number.isFinite(sub) || sub < 0) {
      setNotice('Ingresa un subtotal válido.');
      return;
    }
    await runAction(async () => {
      const auth = await getWebAuth();
      await createCommercialRequestProposal(auth, requestId, {
        subtotal_amount: sub,
        delivery_fee_amount: Number.isFinite(fee) ? fee : 0,
        total_amount: sub + (Number.isFinite(fee) ? fee : 0),
        note: globalNote.trim() || null,
      });
      setGlobalProposalOpen(false);
    }, 'Propuesta global enviada.');
  };

  const handleCreateHold = async () => {
    if (!holdDate) {
      setNotice('Selecciona una fecha para reservar el cupo.');
      return;
    }
    const startsObj = new Date(`${holdDate}T${holdTime || '09:00'}:00`);
    if (Number.isNaN(startsObj.getTime())) {
      setNotice('Fecha u hora inválida.');
      return;
    }
    const tz = data?.context.business.timezone || 'America/Bogota';
    await runAction(async () => {
      const auth = await getWebAuth();
      await createCommercialReservationHold(auth, requestId, {
        starts_at: startsObj.toISOString(),
        timezone: tz,
      });
    }, 'Reserva temporal creada para el cliente.');
  };

  const request = data?.request;
  const context = data?.context;
  const permissions = context?.permissions;
  const statusTone = request ? getCommercialRequestListStatusTone(request.status) : 'neutral';
  const statusLabel = request ? getCommercialRequestListStatusLabel(request.status) : '';
  const reservation = context?.reservation;
  const holdCountdown = reservation
    ? formatHoldRemaining(reservation.hold_expires_at, nowMs)
    : null;
  const allProposals = context?.timeline.proposals || [];
  const pendingGlobalProposals = allProposals.filter(
    (p) => p.status === 'pending' && !p.commerce_request_item_id,
  );
  const paymentProofs = context?.payment_proofs || [];
  const events = context?.timeline.events || [];
  const codAvailable = Boolean(context?.payment_options?.cash_on_delivery_available);

  return (
    <CommercialShell
      title={request ? `Solicitud ${request.code}` : 'Detalle de solicitud'}
      description="Gestión comercial, negociación por ítem, verificación de pago y ejecución"
      backHref={`/app/beeservices/manage/${businessId}/requests`}
      wide
    >
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || busy}
          className={secondaryButtonClass}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
        <button
          type="button"
          onClick={() => void handleOpenChat()}
          disabled={busy}
          className={primaryButtonClass}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Chats del negocio
        </button>
      </div>

      {loading ? <p className="text-sm text-[#8A72B2]">Cargando solicitud…</p> : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mb-4 rounded-2xl border border-[#D9B9EE] bg-[#F7EEFF] px-4 py-3 text-sm font-medium text-[#5E1ABF]">
          {notice}
        </div>
      ) : null}

      {request && context ? (
        <div className="space-y-6">
          {/* Header summary card */}
          <div className="rounded-2xl border border-[#EADFF3] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-extrabold text-[#2B1945]">{request.code}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[statusTone]}`}
                  >
                    {statusLabel}
                  </span>
                  {request.requested_modality ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F5EEFC] px-2.5 py-0.5 text-xs font-semibold text-[#5E1ABF]">
                      <Truck className="h-3 w-3" />
                      {getCommercialModalityLabel(request.requested_modality)}
                    </span>
                  ) : null}
                  {codAvailable ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Pago contraentrega disponible
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[#6E6083]">
                  Recibida el {formatCommercialRequestListDate(request.created_at)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-[#6E6083]">Total de la solicitud</p>
                <p className="text-xl font-extrabold text-[#5E1ABF]">
                  {moneyCop(request.total_amount)}
                </p>
                <p className="text-[11px] text-[#7D6C94]">
                  Subtotal {moneyCop(request.subtotal_amount)} · Domicilio{' '}
                  {moneyCop(request.delivery_fee_amount)}
                </p>
              </div>
            </div>

            {request.customer_note ? (
              <div className="mt-4 rounded-xl bg-[#FAF7FD] px-3.5 py-2.5 text-xs text-[#4C3C64]">
                <span className="font-bold">Nota del cliente:</span> {request.customer_note}
              </div>
            ) : null}

            {request.delivery_address ? (
              <div className="mt-2 rounded-xl bg-[#FAF7FD] px-3.5 py-2.5 text-xs text-[#4C3C64]">
                <span className="font-bold">Dirección de entrega:</span> {request.delivery_address}
                {request.delivery_reference ? ` (${request.delivery_reference})` : ''}
              </div>
            ) : null}

            {/* Primary Request Actions governed by context.permissions */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F0EAF6] pt-4">
              {permissions?.can_start_review ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      const auth = await getWebAuth();
                      await transitionCommercialRequest(auth, requestId, { action: 'start_review' });
                    }, 'Solicitud marcada en revisión.')
                  }
                  className={secondaryButtonClass}
                >
                  Iniciar revisión
                </button>
              ) : null}

              {permissions?.can_accept ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      const auth = await getWebAuth();
                      await transitionCommercialRequest(auth, requestId, { action: 'accept' });
                    }, 'Solicitud aceptada.')
                  }
                  className={primaryButtonClass}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Aceptar solicitud completa
                </button>
              ) : null}

              {permissions?.can_create_proposal ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setGlobalSubtotal(String(request.subtotal_amount ?? 0));
                    setGlobalDeliveryFee(String(request.delivery_fee_amount ?? 0));
                    setGlobalNote('');
                    setGlobalProposalOpen(true);
                  }}
                  className={secondaryButtonClass}
                >
                  Enviar propuesta global
                </button>
              ) : null}

              {permissions?.can_confirm_payment ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      const auth = await getWebAuth();
                      await confirmCommercialPaymentReceived(auth, requestId);
                    }, 'Pago confirmado como recibido.')
                  }
                  className={primaryButtonClass}
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  Confirmar pago recibido
                </button>
              ) : null}

              {permissions?.can_complete ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      const auth = await getWebAuth();
                      await completeCommercialRequest(auth, requestId, {});
                    }, 'Solicitud marcada como completada.')
                  }
                  className={primaryButtonClass}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Completar solicitud
                </button>
              ) : null}

              {permissions?.can_reject ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setTransitionAction('reject');
                    setTransitionNote('');
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Rechazar solicitud
                </button>
              ) : null}

              {permissions?.can_cancel ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setTransitionAction('cancel');
                    setTransitionNote('');
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Cancelar solicitud
                </button>
              ) : null}
            </div>
          </div>

          {/* Reservation card / Hold creator */}
          {reservation || permissions?.can_create_reservation_hold ? (
            <div className="rounded-2xl border border-[#EADFF3] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#2B1945]">
                  <CalendarClock className="h-4 w-4 text-[#5E1ABF]" />
                  Reserva y horario de servicio
                </h3>
                {holdCountdown ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    <Clock className="h-3.5 w-3.5" />
                    {holdCountdown}
                  </span>
                ) : null}
              </div>

              {reservation ? (
                <div className="mt-3 grid gap-2 text-xs text-[#4C3C64] sm:grid-cols-3">
                  <div className="rounded-xl bg-[#FAF7FD] p-3">
                    <p className="font-bold text-[#2B1945]">Inicio</p>
                    <p>{formatDateTime(reservation.starts_at)}</p>
                  </div>
                  <div className="rounded-xl bg-[#FAF7FD] p-3">
                    <p className="font-bold text-[#2B1945]">Fin estimado</p>
                    <p>{formatDateTime(reservation.ends_at)}</p>
                  </div>
                  <div className="rounded-xl bg-[#FAF7FD] p-3">
                    <p className="font-bold text-[#2B1945]">Estado de reserva</p>
                    <p className="capitalize">{reservation.status}</p>
                    <p className="text-[11px] text-[#7D6C94]">Zona: {reservation.timezone}</p>
                  </div>
                </div>
              ) : null}

              {permissions?.can_create_reservation_hold ? (
                <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-[#EFE6F7] bg-[#FCFAFF] p-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#53426B]">
                      Fecha del cupo
                    </label>
                    <input
                      type="date"
                      value={holdDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setHoldDate(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#53426B]">
                      Hora
                    </label>
                    <input
                      type="time"
                      value={holdTime}
                      onChange={(e) => setHoldTime(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleCreateHold()}
                    className={primaryButtonClass}
                  >
                    Reservar horario (Slot Hold)
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Global Pending Proposals */}
          {pendingGlobalProposals.length > 0 ? (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-5">
              <h3 className="text-sm font-extrabold text-purple-950">
                Propuestas globales en curso ({pendingGlobalProposals.length})
              </h3>
              <div className="mt-3 space-y-3">
                {pendingGlobalProposals.map((proposal) => {
                  const isCustomerProposal = proposal.proposed_by_profile_id === request.client_id;
                  return (
                    <div
                      key={proposal.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-200 bg-white p-3.5 text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#2B1945]">
                          {isCustomerProposal
                            ? 'Contrapropuesta del cliente'
                            : 'Enviada por tu negocio'}{' '}
                          · Total propuesto: {moneyCop(proposal.total_amount)}
                        </p>
                        <p className="text-[#6E6083]">
                          Subtotal {moneyCop(proposal.subtotal_amount)} · Domicilio{' '}
                          {moneyCop(proposal.delivery_fee_amount)}
                        </p>
                        {proposal.note ? (
                          <p className="mt-1 text-[#4C3C64]">Nota: “{proposal.note}”</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isCustomerProposal && permissions?.can_accept_proposal ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void runAction(async () => {
                                const auth = await getWebAuth();
                                await acceptCommercialRequestProposal(auth, proposal.id);
                              }, 'Propuesta aceptada.')
                            }
                            className={primaryButtonClass}
                          >
                            Aceptar propuesta
                          </button>
                        ) : null}
                        {isCustomerProposal && permissions?.can_reject_proposal ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void runAction(async () => {
                                const auth = await getWebAuth();
                                await rejectCommercialRequestProposal(auth, proposal.id, {});
                              }, 'Propuesta rechazada.')
                            }
                            className={secondaryButtonClass}
                          >
                            Rechazar
                          </button>
                        ) : null}
                        {!isCustomerProposal && permissions?.can_withdraw_proposal ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void runAction(async () => {
                                const auth = await getWebAuth();
                                await withdrawCommercialRequestProposal(auth, proposal.id, {});
                              }, 'Propuesta retirada.')
                            }
                            className={secondaryButtonClass}
                          >
                            Retirar propuesta
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Items list: item-level negotiation & operational status */}
          <div className="rounded-2xl border border-[#EADFF3] bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#2B1945]">
              <Package className="h-4 w-4 text-[#5E1ABF]" />
              Ítems de la solicitud ({request.items.length})
            </h3>

            <div className="mt-4 space-y-4">
              {request.items.map((item) => {
                const lifecycle = item.lifecycle_status || 'pending_business';
                const lifeInfo = ITEM_LIFECYCLE_LABELS[lifecycle] || {
                  label: lifecycle,
                  color: 'bg-neutral-100 text-neutral-700 border-neutral-200',
                };
                const activeProposal =
                  allProposals.find(
                    (p) => p.commerce_request_item_id === item.id && p.status === 'pending',
                  ) || null;
                const isService = item.offer_kind === 'service';
                const opOptions = isService
                  ? SERVICE_OPERATIONAL_OPTIONS
                  : PRODUCT_OPERATIONAL_OPTIONS;
                const displayQty = item.final_quantity ?? item.quantity;
                const displayUnitPrice = item.final_unit_price_amount ?? item.unit_price_amount;
                const displayLineTotal = item.final_line_total_amount ?? item.line_total_amount;
                const displayStartsAt =
                  item.final_starts_at ||
                  (typeof item.original_terms?.requested_starts_at === 'string'
                    ? item.original_terms.requested_starts_at
                    : null);
                const displayEndsAt =
                  item.final_ends_at ||
                  (typeof item.original_terms?.requested_ends_at === 'string'
                    ? item.original_terms.requested_ends_at
                    : null);
                const canUpdateOperational =
                  request.status === 'confirmed' ||
                  request.status === 'in_execution' ||
                  lifecycle === 'confirmed' ||
                  lifecycle === 'preparing' ||
                  lifecycle === 'ready_for_pickup' ||
                  lifecycle === 'shipped' ||
                  lifecycle === 'delivered' ||
                  lifecycle === 'in_progress' ||
                  (codAvailable && lifecycle === 'accepted');

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#EFE6F7] bg-[#FDFBFF] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-[#2B1945]">
                            {item.title}
                          </span>
                          <span className="rounded-full bg-[#F2E9FB] px-2.5 py-0.5 text-[11px] font-bold text-[#5E1ABF]">
                            {isService ? 'Servicio' : 'Producto'} × {displayQty}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${lifeInfo.color}`}
                          >
                            {lifeInfo.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#6E6083]">
                          Unitario: {moneyCop(displayUnitPrice)} · Subtotal línea:{' '}
                          <strong className="text-[#2B1945]">
                            {moneyCop(displayLineTotal)}
                          </strong>
                        </p>
                        {displayStartsAt ? (
                          <p className="mt-1 text-xs font-semibold text-[#5E1ABF]">
                            Horario solicitado: {formatDateTime(displayStartsAt)}
                            {displayEndsAt ? ` — ${formatDateTime(displayEndsAt)}` : ''}
                          </p>
                        ) : null}
                        {item.customer_note ? (
                          <p className="mt-1 text-xs text-[#594C67]">
                            Comentario: “{item.customer_note}”
                          </p>
                        ) : null}
                      </div>

                      {/* Operational status selector */}
                      {canUpdateOperational ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[11px] font-semibold text-[#6E6083]">
                            Actualizar estado operativo:
                          </span>
                          <select
                            value={
                              opOptions.some((o) => o.value === lifecycle) ? lifecycle : ''
                            }
                            disabled={busy}
                            onChange={(e) => {
                              const nextOp = e.target.value as OperationalNextStatus;
                              if (!nextOp) return;
                              void runAction(async () => {
                                const auth = await getWebAuth();
                                await updateCommercialRequestItemOperationalStatus(auth, item.id, {
                                  next_status: nextOp,
                                });
                              }, `Estado operativo de "${item.title}" actualizado.`);
                            }}
                            className="rounded-xl border border-[#DFCFEF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2B1945]"
                          >
                            <option value="" disabled>
                              Seleccionar estado…
                            </option>
                            {opOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>

                    {/* Active Item Proposal box */}
                    {activeProposal ? (
                      <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs">
                        {(() => {
                          const isCustomerProp =
                            activeProposal.proposed_by_profile_id === request.client_id;
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-bold text-purple-950">
                                  {isCustomerProp
                                    ? 'Contrapropuesta recibida del cliente'
                                    : 'Tu contrapropuesta enviada'}
                                </p>
                                <p className="text-purple-900">
                                  Precio unitario:{' '}
                                  {moneyCop(activeProposal.proposed_unit_price_amount)} · Cant:{' '}
                                  {activeProposal.proposed_quantity ?? displayQty} · Total línea:{' '}
                                  <strong>
                                    {moneyCop(activeProposal.proposed_line_total_amount)}
                                  </strong>
                                </p>
                                {activeProposal.proposed_starts_at ? (
                                  <p className="text-purple-900">
                                    Nuevo horario:{' '}
                                    {formatDateTime(activeProposal.proposed_starts_at)}
                                  </p>
                                ) : null}
                                {activeProposal.note ? (
                                  <p className="mt-0.5 italic text-purple-800">
                                    “{activeProposal.note}”
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {isCustomerProp ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        void runAction(async () => {
                                          const auth = await getWebAuth();
                                          await acceptCommercialRequestItemProposal(
                                            auth,
                                            activeProposal.id,
                                          );
                                        }, 'Contrapropuesta del cliente aceptada.')
                                      }
                                      className={primaryButtonClass}
                                    >
                                      Aceptar
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        void runAction(async () => {
                                          const auth = await getWebAuth();
                                          await rejectCommercialRequestItemProposal(
                                            auth,
                                            item.id,
                                            {},
                                          );
                                        }, 'Contrapropuesta rechazada.')
                                      }
                                      className={secondaryButtonClass}
                                    >
                                      Rechazar
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void runAction(async () => {
                                        const auth = await getWebAuth();
                                        await withdrawCommercialRequestItemProposal(
                                          auth,
                                          activeProposal.id,
                                          {},
                                        );
                                      }, 'Contrapropuesta retirada.')
                                    }
                                    className={secondaryButtonClass}
                                  >
                                    Retirar mi oferta
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}

                    {/* Item-level negotiation buttons */}
                    {lifecycle === 'pending_business' || lifecycle === 'pending_customer' ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#EFE6F7] pt-3">
                        {lifecycle === 'pending_business' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void runAction(async () => {
                                const auth = await getWebAuth();
                                await acceptCommercialRequestFixedItem(auth, item.id);
                              }, `Ítem "${item.title}" aceptado.`)
                            }
                            className="inline-flex h-8 items-center rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Aceptar ítem
                          </button>
                        ) : null}

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openItemCounterModal(item)}
                          className="inline-flex h-8 items-center rounded-xl border border-[#D9B9EE] bg-white px-3 text-xs font-bold text-[#5E1ABF] hover:bg-[#F7EEFF]"
                        >
                          Contraofertar ítem
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runAction(async () => {
                              const auth = await getWebAuth();
                              await closeCommercialRequestItem(auth, item.id, {
                                action: 'reject',
                                reason_text: 'Ítem no disponible actualmente.',
                              });
                            }, `Ítem "${item.title}" rechazado.`)
                          }
                          className="inline-flex h-8 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          Rechazar ítem
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Proofs Review Section */}
          <div className="rounded-2xl border border-[#EADFF3] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#2B1945]">
                <FileText className="h-4 w-4 text-[#5E1ABF]" />
                Comprobantes de pago ({paymentProofs.length})
              </h3>
              <span className="text-xs font-semibold text-[#6E6083]">
                Intentos del cliente: {context.payment_attempts.attempts_used} de{' '}
                {context.payment_attempts.max_attempts}
              </span>
            </div>

            {paymentProofs.length === 0 ? (
              <p className="mt-3 text-xs text-[#6E6083]">
                El cliente aún no ha adjuntado comprobantes de pago.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {paymentProofs.map((proof) => {
                  const isSubmitted = proof.status === 'submitted';
                  const isThirdAttempt = proof.is_final_attempt || proof.attempt_number >= 3;
                  return (
                    <div
                      key={proof.id}
                      className="rounded-xl border border-[#EFE6F7] bg-[#FAF7FD] p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-[#2B1945]">
                            Intento #{proof.attempt_number} de {proof.max_attempts} · Estado:{' '}
                            <span className="uppercase">{proof.status}</span>
                          </p>
                          <p className="text-[#6E6083]">
                            Enviado: {formatDateTime(proof.created_at)}
                          </p>
                          {proof.payment_reference ? (
                            <p className="mt-0.5 text-[#4C3C64]">
                              Referencia: <strong>{proof.payment_reference}</strong>
                            </p>
                          ) : null}
                          {proof.note ? (
                            <p className="text-[#4C3C64]">Nota: {proof.note}</p>
                          ) : null}
                          {proof.rejection_reason ? (
                            <p className="mt-1 font-semibold text-red-600">
                              Motivo de rechazo: {proof.rejection_reason}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleViewProof(proof.id)}
                            className={secondaryButtonClass}
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Ver archivo
                          </button>

                          {isSubmitted && permissions?.can_review_payment_proof ? (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(async () => {
                                    const auth = await getWebAuth();
                                    await reviewCommercialPaymentProof(auth, proof.id, {
                                      decision: 'confirmed',
                                    });
                                  }, 'Comprobante aprobado y pago confirmado.')
                                }
                                className={primaryButtonClass}
                              >
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                Aprobar pago
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setRejectingProofId(proof.id);
                                  setProofRejectionReason('');
                                }}
                                className="inline-flex h-10 items-center rounded-2xl border border-red-200 bg-red-50 px-3.5 text-xs font-bold text-red-700 hover:bg-red-100"
                              >
                                Rechazar comprobante
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {isSubmitted && isThirdAttempt ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>
                            Atención: Este es el intento final del cliente. Si rechazas este
                            comprobante, la solicitud se cancelará automáticamente.
                          </span>
                        </div>
                      ) : null}

                      {rejectingProofId === proof.id ? (
                        <div className="mt-3 space-y-2 rounded-xl border border-red-200 bg-white p-3">
                          <label className="block text-xs font-bold text-red-800">
                            Motivo del rechazo (obligatorio)
                          </label>
                          <textarea
                            rows={2}
                            value={proofRejectionReason}
                            onChange={(e) => setProofRejectionReason(e.target.value)}
                            placeholder="Ej. El comprobante está ilegible o el monto no coincide…"
                            className={fieldClass}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRejectingProofId(null)}
                              className={secondaryButtonClass}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={busy || !proofRejectionReason.trim()}
                              onClick={() =>
                                void runAction(async () => {
                                  const auth = await getWebAuth();
                                  await reviewCommercialPaymentProof(auth, proof.id, {
                                    decision: 'rejected',
                                    rejection_reason: proofRejectionReason.trim(),
                                  });
                                  setRejectingProofId(null);
                                }, 'Comprobante rechazado.')
                              }
                              className="inline-flex h-10 items-center rounded-2xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40"
                            >
                              Confirmar rechazo
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Events Timeline */}
          {events.length > 0 ? (
            <div className="rounded-2xl border border-[#EADFF3] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-extrabold text-[#2B1945]">
                Historial de eventos ({events.length})
              </h3>
              <ul className="mt-3 space-y-2.5">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start justify-between gap-3 border-b border-[#F4EEF9] pb-2 text-xs last:border-b-0"
                  >
                    <div>
                      <span className="font-bold text-[#2B1945]">{ev.event_type}</span>
                      {ev.previous_status || ev.new_status ? (
                        <span className="ml-2 text-[#6E6083]">
                          ({ev.previous_status || '—'} → {ev.new_status || '—'})
                        </span>
                      ) : null}
                      {ev.reason_text ? (
                        <p className="mt-0.5 text-[#594C67]">{ev.reason_text}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-[#8E7DA3]">
                      {formatDateTime(ev.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Modal: Per-item counterproposal */}
      {counterItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-[#2B1945]">
              Contraofertar ítem: {counterItem.title}
            </h3>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-[#4C3C64]">
                  Precio unitario propuesto (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-[#4C3C64]">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={counterQty}
                  onChange={(e) => setCounterQty(e.target.value)}
                  className={fieldClass}
                />
              </div>
              {counterItem.offer_kind === 'service' || counterItem.requires_booking ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block font-bold text-[#4C3C64]">Fecha propuesta</label>
                    <input
                      type="date"
                      value={counterDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setCounterDate(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-[#4C3C64]">Hora propuesta</label>
                    <input
                      type="time"
                      value={counterTime}
                      onChange={(e) => setCounterTime(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              ) : null}
              <div>
                <label className="mb-1 block font-bold text-[#4C3C64]">Nota para el cliente</label>
                <textarea
                  rows={2}
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  placeholder="Explica el ajuste de precio, cantidad o agenda…"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCounterItem(null)}
                className={secondaryButtonClass}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSubmitItemCounter()}
                className={primaryButtonClass}
              >
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Enviar contraoferta
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal: Global proposal */}
      {globalProposalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-[#2B1945]">Enviar propuesta global</h3>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-[#4C3C64]">
                  Subtotal propuesto (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={globalSubtotal}
                  onChange={(e) => setGlobalSubtotal(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-[#4C3C64]">
                  Costo de domicilio (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={globalDeliveryFee}
                  onChange={(e) => setGlobalDeliveryFee(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-[#4C3C64]">Nota</label>
                <textarea
                  rows={2}
                  value={globalNote}
                  onChange={(e) => setGlobalNote(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGlobalProposalOpen(false)}
                className={secondaryButtonClass}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSubmitGlobalProposal()}
                className={primaryButtonClass}
              >
                Enviar propuesta
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal: Reject or Cancel Request */}
      {transitionAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-[#2B1945]">
              {transitionAction === 'reject' ? 'Rechazar solicitud' : 'Cancelar solicitud'}
            </h3>
            <p className="mt-1 text-xs text-[#6E6083]">
              Indica un motivo para que el cliente reciba la notificación clara.
            </p>
            <textarea
              rows={3}
              value={transitionNote}
              onChange={(e) => setTransitionNote(e.target.value)}
              placeholder="Escribe el motivo…"
              className={`${fieldClass} mt-3`}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransitionAction(null)}
                className={secondaryButtonClass}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runAction(async () => {
                    const auth = await getWebAuth();
                    await transitionCommercialRequest(auth, requestId, {
                      action: transitionAction,
                      reason_text: transitionNote.trim() || null,
                    });
                    setTransitionAction(null);
                  }, transitionAction === 'reject' ? 'Solicitud rechazada.' : 'Solicitud cancelada.')
                }
                className="inline-flex h-10 items-center rounded-2xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CommercialShell>
  );
}
