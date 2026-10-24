'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { contactInitials } from '@/lib/client/contacts';
import { getWebAuth } from '@/lib/client/liveData';
import {
  getCurrentWebProfile,
  getCurrentWebStorageSummary,
  getMySubscription,
  listPublicPlans,
  submitProfileVerification,
  subscribeToPlan,
  cancelSubscription,
  reactivateSubscription,
  type PublicPlan,
} from '@beeapp/api-client';
import type { CurrentUserProfile } from '@beeapp/shared-types';
import {
  Check, Sparkles, Database, ShieldCheck, BadgeCheck, Store, Search, MessageCircle, Clock, Loader2,
} from 'lucide-react';

const VERIFY_BENEFITS = [
  { icon: ShieldCheck, title: 'Identidad confirmada', desc: 'La insignia azul aparece junto a tu nombre en chats, contactos y estados.' },
  { icon: Store, title: 'Más confianza al vender', desc: 'Los clientes ven que tu negocio fue revisado por el equipo de Buddy.' },
  { icon: Search, title: 'Mejor posición en la red', desc: 'Las cuentas verificadas se destacan en los resultados de búsqueda.' },
  { icon: MessageCircle, title: 'Menos suplantación', desc: 'La insignia distingue tu cuenta real de cualquier intento de imitación.' },
];

type RequirementItem = { text: string; done: boolean };

function planHighlights(plan: PublicPlan | null): string[] {
  if (!plan) return [];
  if (Array.isArray(plan.highlights) && plan.highlights.length > 0) {
    return plan.highlights;
  }
  const features = plan.features;
  if (Array.isArray(features)) {
    return features.map(String);
  }
  if (features && typeof features === 'object') {
    return Object.values(features as Record<string, unknown>).map(String);
  }
  return plan.description ? [plan.description] : [];
}

function buildRequirements(profile: CurrentUserProfile | null): RequirementItem[] {
  if (!profile) return [];
  const hasProfile = Boolean(
    profile.first_name?.trim()
    && profile.last_name?.trim()
    && profile.occupation?.trim()
    && profile.avatar_file_id,
  );
  const phoneVerified = Boolean(profile.phone_number?.trim());
  const verificationRequest = profile.settings?.verification_request ?? null;
  const verificationStatus = profile.verification_status ?? verificationRequest?.status ?? 'no_solicitado';
  const pendingFromApi = verificationRequest?.pending_requirements ?? [];

  const base: RequirementItem[] = [
    { text: 'Perfil completo: nombre, ocupación y foto de perfil', done: hasProfile },
    { text: 'Número de celular registrado', done: phoneVerified },
    { text: 'Ocupación o actividad registrada', done: Boolean(profile.occupation?.trim()) },
  ];

  const dynamic = pendingFromApi.map((text) => ({ text, done: false }));
  const submission: RequirementItem = {
    text: 'Solicitud de verificación enviada o aprobada',
    done: verificationStatus === 'en_revision' || verificationStatus === 'verificado',
  };

  return [...base, ...dynamic, submission];
}

export function SubscriptionPanel() {
  const { profile } = useAuth();
  const accountName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Tu cuenta';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePlan, setActivePlan] = useState<PublicPlan | null>(null);
  const [upgradePlans, setUpgradePlans] = useState<PublicPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [storageLabel, setStorageLabel] = useState('');
  const [storagePercent, setStoragePercent] = useState(0);
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [verifyRequested, setVerifyRequested] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subscriptionPayload, plans, storageResponse, profileResponse] = await Promise.all([
        getMySubscription(),
        listPublicPlans(),
        getCurrentWebStorageSummary().catch(() => null),
        getCurrentWebProfile().catch(() => null),
      ]);

      const plan = subscriptionPayload.plan ?? plans.find((p) => p.id === 'free') ?? null;
      setActivePlan(plan);
      setUpgradePlans(plans.filter((p) => p.id !== plan?.id));

      const storage = storageResponse?.storage;
      if (storage) {
        const usedBytes = Number(storage.used_bytes ?? 0);
        const quotaBytes = Number(storage.quota_bytes ?? 0);
        const pct = storage.usage_percentage ?? (quotaBytes ? Math.round((usedBytes / quotaBytes) * 100) : 0);
        setStoragePercent(Math.min(100, Math.max(0, pct)));
        const usedGb = usedBytes / (1024 ** 3);
        const quotaGb = quotaBytes / (1024 ** 3);
        setStorageLabel(
          quotaBytes
            ? `${usedGb.toFixed(1)} GB de ${quotaGb.toFixed(1)} GB (${Math.round(pct)}%)`
            : `${usedGb.toFixed(1)} GB en uso`,
        );
      } else {
        setStoragePercent(0);
        setStorageLabel('Almacenamiento no disponible');
      }

      setRequirements(buildRequirements(profileResponse?.profile ?? null));
      const vStatus = profileResponse?.profile?.verification_status
        ?? profileResponse?.profile?.settings?.verification_request?.status
        ?? 'no_solicitado';
      setVerifyRequested(vStatus === 'en_revision' || vStatus === 'verificado');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar tu suscripción.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingReqs = requirements.filter((r) => !r.done).length;
  const benefits = useMemo(() => planHighlights(activePlan), [activePlan]);
  const plusPlan = upgradePlans.find((p) => p.id === 'plus') ?? upgradePlans[0] ?? null;
  const isFreePlan = !activePlan || activePlan.id === 'free';

  const handleUpgrade = async () => {
    if (!plusPlan) return;
    setPlanBusy(true);
    setError('');
    try {
      await subscribeToPlan(plusPlan.id, billingCycle);
      await loadData();
    } catch (upgradeError) {
      setError(upgradeError instanceof Error ? upgradeError.message : 'No fue posible cambiar el plan.');
    } finally {
      setPlanBusy(false);
    }
  };

  const handleCancelPlan = async () => {
    setPlanBusy(true);
    setError('');
    try {
      await cancelSubscription();
      await loadData();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'No fue posible cancelar.');
    } finally {
      setPlanBusy(false);
    }
  };

  const handleReactivatePlan = async () => {
    setPlanBusy(true);
    setError('');
    try {
      await reactivateSubscription();
      await loadData();
    } catch (reactivateError) {
      setError(reactivateError instanceof Error ? reactivateError.message : 'No fue posible reactivar.');
    } finally {
      setPlanBusy(false);
    }
  };

  const handleVerify = async () => {
    setVerifyError('');
    setVerifySubmitting(true);
    try {
      const auth = await getWebAuth();
      await submitProfileVerification(auth);
      setVerifyRequested(true);
      await loadData();
    } catch (submitError) {
      setVerifyError(submitError instanceof Error ? submitError.message : 'No fue posible enviar la solicitud.');
    } finally {
      setVerifySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-xs text-neutral-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando plan y almacenamiento…
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {error ? (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">{error}</div>
      ) : null}

      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Mi plan actual
        </span>

        <div className="p-5 rounded-3xl bg-neutral-900 text-white space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Plan activo: {activePlan?.name ?? 'Sin plan'}
              </span>
            </div>
            <span className="text-[10px] font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700">
              {isFreePlan ? 'Básico' : 'Suscripción'}
            </span>
          </div>

          {activePlan?.description ? (
            <p className="text-xs text-neutral-400 font-normal leading-relaxed">{activePlan.description}</p>
          ) : null}

          <div className="p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <Database className="w-4 h-4 text-brand-primary" />
                <span className="font-semibold">Almacenamiento</span>
              </div>
              <span className="text-neutral-400 font-normal">{storageLabel}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-700 overflow-hidden">
              <div className="h-full bg-brand-primary rounded-full" style={{ width: `${storagePercent}%` }} />
            </div>
          </div>

          {plusPlan && isFreePlan ? (
            <>
              <div className="flex bg-neutral-800 p-1 rounded-xl text-xs font-normal">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors ${
                    billingCycle === 'monthly' ? 'bg-brand-primary text-white font-semibold' : 'text-neutral-400'
                  }`}
                >
                  Mensual (${Number(plusPlan.monthly_price).toFixed(2)}/mes)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors ${
                    billingCycle === 'yearly' ? 'bg-brand-primary text-white font-semibold' : 'text-neutral-400'
                  }`}
                >
                  Anual (${Number(plusPlan.yearly_price / 12).toFixed(2)}/mes)
                </button>
              </div>

              {benefits.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs text-neutral-300">
                  {benefits.map((b) => (
                    <div key={b} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-brand-primary shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                disabled={planBusy}
                onClick={() => void handleUpgrade()}
                className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-brand-dark disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{planBusy ? 'Procesando…' : `Mejorar a ${plusPlan.name}`}</span>
              </button>
              <p className="text-[10px] text-neutral-500 text-center">
                El cobro con pasarela se activará más adelante; el plan se actualiza en tu cuenta.
              </p>
            </>
          ) : !isFreePlan ? (
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={planBusy}
                onClick={() => void handleCancelPlan()}
                className="w-full h-10 rounded-xl border border-neutral-600 text-neutral-200 text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50"
              >
                Cancelar suscripción
              </button>
              <button
                type="button"
                disabled={planBusy}
                onClick={() => void handleReactivatePlan()}
                className="w-full h-10 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                Reactivar suscripción
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Verificación comercial
        </span>

        <div className="p-5 rounded-3xl bg-brand-primary/5 border border-brand-primary/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-neutral-900">Buddy Verify (Insignia azul)</h4>
              <p className="text-[11px] text-neutral-500 font-normal">Insignia oficial de verificación para cuentas y empresas.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 space-y-2">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Vista previa de tu cuenta</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white font-bold text-sm flex items-center justify-center">
                {contactInitials(accountName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900">
                  <span>{accountName}</span>
                  <BadgeCheck className="w-4 h-4 text-brand-primary shrink-0" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {VERIFY_BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-2.5 bg-white rounded-xl border border-neutral-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-brand-primary font-semibold text-[11px]">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-normal leading-tight">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-neutral-700">Requisitos para solicitar:</span>
            {requirements.length === 0 ? (
              <p className="text-xs text-neutral-500">No hay requisitos disponibles.</p>
            ) : (
              <div className="space-y-1.5">
                {requirements.map((r) => (
                  <div key={r.text} className="flex items-center gap-2 text-xs font-normal text-neutral-700">
                    {r.done ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className={r.done ? 'text-neutral-800' : 'text-neutral-500'}>{r.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {verifyError ? (
            <p className="text-xs text-red-600">{verifyError}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={verifyRequested || verifySubmitting || pendingReqs > 0}
            className={`w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs ${
              verifyRequested
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-brand-primary text-white hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {verifyRequested
                ? 'Solicitud en revisión'
                : verifySubmitting
                  ? 'Enviando…'
                  : `Solicitar verificación (${pendingReqs} pendientes)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
