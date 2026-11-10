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
  startBillingCheckout,
  submitProfileVerification,
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

function cop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

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
  const [periodLabel, setPeriodLabel] = useState('');
  const [usageLabel, setUsageLabel] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
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
      setUpgradePlans(plans.filter((item) => item.purchasable && item.id !== plan?.id));
      const end = subscriptionPayload.subscription?.current_period_end;
      const cancelledAt = subscriptionPayload.subscription?.cancelled_at;
      setPeriodLabel(end
        ? `${cancelledAt ? 'Acceso hasta' : 'Vigente hasta'} ${new Date(String(end)).toLocaleString('es-CO')}. Si no hay otro pago, vuelves a Free.`
        : '');
      const usage = subscriptionPayload.usage;
      const creditCap = plan?.entitlements?.aiCredits;
      const minuteCap = plan?.entitlements?.callMinutes;
      const capText = (value: unknown) => (typeof value === 'number' ? ` de ${value}` : '');
      setUsageLabel(
        `IA: ${Number(usage?.aiCredits || 0)}${capText(creditCap)} créditos · Llamadas: ${Number(usage?.callMinutes || 0)}${capText(minuteCap)} min`,
      );

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
  const isFreePlan = !activePlan || activePlan.id === 'free';

  const handleUpgrade = async (planId: string) => {
    setPlanBusy(true);
    setError('');
    try {
      const checkout = await startBillingCheckout({
        planId,
        billingPeriod: billingCycle,
        redirectUrl: `${window.location.origin}/app/profile/subscription`,
      });
      window.location.assign(checkout.url);
    } catch (upgradeError) {
      setError(upgradeError instanceof Error ? upgradeError.message : 'No se pudo abrir el pago.');
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
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#E7DDF2] bg-white px-6 py-12 text-xs text-[#786593]">
        <Loader2 className="h-4 w-4 animate-spin text-[#7427D5]" />
        Cargando plan y almacenamiento…
      </div>
    );
  }

  return (
    <div className="select-none space-y-5">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>
      ) : null}

      <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-[#261743]">Tu plan y beneficios</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#786593]">
            Consulta consumo, renueva cuando quieras y solicita la insignia de cuenta verificada.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.08)]">
            <div className="border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                    Plan activo: {activePlan?.name ?? 'Sin plan'}
                  </span>
                </div>
                <span className="rounded-full border border-[#E8D1F1] bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-[#5E506B]">
                  {isFreePlan ? 'Plan básico' : 'Suscripción pagada'}
                </span>
              </div>
              {activePlan?.description ? (
                <p className="mt-2 text-xs leading-relaxed text-[#786593]">{activePlan.description}</p>
              ) : null}
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="rounded-2xl border border-[#E8D1F1] bg-[#FFFCF9] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-extrabold text-[#261743]">
                    <Database className="h-4 w-4 text-[#7427D5]" aria-hidden />
                    Almacenamiento
                  </div>
                  <span className="text-[#786593]">{storageLabel}</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#EDE5F5]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7427D5] to-[#9B6DD7] transition-[width]"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>

              {periodLabel ? (
                <p className="rounded-xl border border-[#F1EAF6] bg-[#FAF4FF] px-3 py-2.5 text-xs leading-relaxed text-[#786593]">
                  {periodLabel}
                </p>
              ) : null}

              {usageLabel ? (
                <p className="text-xs font-semibold text-[#5E506B]">{usageLabel}</p>
              ) : null}

              {benefits.length > 0 ? (
                <div className="border-t border-[#F1EAF6] pt-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Incluye tu plan</p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-xs text-[#5E506B]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7427D5]" aria-hidden />
                        <span className="leading-relaxed">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!isFreePlan && upgradePlans.length > 0 ? (
                <button
                  type="button"
                  disabled={planBusy}
                  onClick={() => void handleCancelPlan()}
                  className="w-full rounded-xl border border-[#E8D1F1] bg-white px-3 py-2.5 text-xs font-extrabold text-[#5E506B] transition hover:border-[#C9A8E8] hover:bg-[#F6EAFE] disabled:opacity-50"
                >
                  No renovar al final del periodo
                </button>
              ) : null}

              {upgradePlans.length === 0 && !isFreePlan ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={planBusy}
                    onClick={() => void handleCancelPlan()}
                    className="flex-1 rounded-xl border border-[#E8D1F1] bg-white px-3 py-2.5 text-xs font-extrabold text-[#5E506B] disabled:opacity-50"
                  >
                    Cancelar suscripción
                  </button>
                  <button
                    type="button"
                    disabled={planBusy}
                    onClick={() => void handleReactivatePlan()}
                    className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Reactivar suscripción
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          {upgradePlans.length > 0 ? (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#261743]">Planes disponibles</h3>
                <p className="mt-0.5 text-xs text-[#786593]">Elige ciclo de facturación y continúa con Wompi.</p>
              </div>

              <div className="flex rounded-xl border border-[#E8D1F1] bg-[#F6EAFE]/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 rounded-lg py-2 font-extrabold transition ${
                    billingCycle === 'monthly'
                      ? 'bg-[#7427D5] text-white shadow-sm'
                      : 'text-[#786593] hover:text-[#54209E]'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`flex-1 rounded-lg py-2 font-extrabold transition ${
                    billingCycle === 'yearly'
                      ? 'bg-[#7427D5] text-white shadow-sm'
                      : 'text-[#786593] hover:text-[#54209E]'
                  }`}
                >
                  Anual
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {upgradePlans.map((plan) => {
                  const price = billingCycle === 'yearly' ? Number(plan.yearly_price) : Number(plan.monthly_price);
                  const highlights = planHighlights(plan);
                  return (
                    <article
                      key={plan.id}
                      className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] shadow-[0_8px_24px_rgba(116,39,213,0.07)]"
                    >
                      <div className="h-1.5 bg-gradient-to-r from-[#5E1ABF] via-[#7427D5] to-[#9B6DD7]" aria-hidden />
                      <div className="flex flex-1 flex-col space-y-4 p-4 sm:p-5">
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F6EAFE] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#54209E]">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                          {plan.name}
                        </span>
                        {plan.description ? (
                          <p className="text-xs leading-relaxed text-[#786593]">{plan.description}</p>
                        ) : null}
                        <div className="flex items-end gap-1">
                          <span className="text-2xl font-extrabold tracking-tight text-[#261743] sm:text-3xl">
                            {cop(price)}
                          </span>
                          <span className="pb-1 text-sm text-[#8A72B2]">{billingCycle === 'yearly' ? '/año' : '/mes'}</span>
                        </div>
                        <button
                          type="button"
                          disabled={planBusy || price <= 0}
                          onClick={() => void handleUpgrade(plan.id)}
                          className="w-full rounded-xl bg-[#7427D5] py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#5E1ABF] disabled:opacity-50"
                        >
                          {planBusy ? 'Abriendo Wompi…' : `Pagar ${plan.name}`}
                        </button>
                        {highlights.length > 0 ? (
                          <ul className="space-y-2 border-t border-[#F1EAF6] pt-3 text-xs text-[#5E506B]">
                            {highlights.slice(0, 6).map((item) => (
                              <li key={item} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="text-center text-[10px] text-[#8A72B2]">
                El pago cubre un periodo. Sin renovación, la cuenta vuelve a Free.
              </p>
            </section>
          ) : null}
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] shadow-[0_10px_30px_rgba(116,39,213,0.08)] xl:sticky xl:top-24">
          <div className="border-b border-[#F1EAF6] bg-white/90 px-4 py-4 backdrop-blur sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
                <BadgeCheck className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-[#261743]">Buddy Verify</h3>
                <p className="mt-0.5 text-xs text-[#786593]">Insignia oficial de cuenta verificada.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-2xl border border-[#E8D1F1] bg-white p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Vista previa</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7427D5] text-sm font-extrabold text-white">
                  {contactInitials(accountName)}
                </div>
                <div className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-[#261743]">
                  <span className="truncate">{accountName}</span>
                  <BadgeCheck className="h-4 w-4 shrink-0 text-[#7427D5]" aria-hidden />
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {VERIFY_BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#F1EAF6] bg-white p-3"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#54209E]">
                      <Icon className="h-3.5 w-3.5 text-[#7427D5]" aria-hidden />
                      {item.title}
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#786593]">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <div>
              <p className="text-[11px] font-extrabold text-[#4E3B68]">Requisitos para solicitar</p>
              {requirements.length === 0 ? (
                <p className="mt-2 text-xs text-[#786593]">No hay requisitos disponibles.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {requirements.map((r) => (
                    <li key={r.text} className="flex items-start gap-2 text-xs text-[#5E506B]">
                      {r.done ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      ) : (
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                      )}
                      <span className={r.done ? 'text-[#261743]' : 'text-[#786593]'}>{r.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {verifyError ? <p className="text-xs text-rose-600">{verifyError}</p> : null}

            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={verifyRequested || verifySubmitting || pendingReqs > 0}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                verifyRequested
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'bg-[#7427D5] text-white hover:bg-[#5E1ABF] disabled:cursor-not-allowed disabled:opacity-50'
              }`}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {verifyRequested
                ? 'Solicitud en revisión'
                : verifySubmitting
                  ? 'Enviando…'
                  : `Solicitar verificación (${pendingReqs} pendientes)`}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
