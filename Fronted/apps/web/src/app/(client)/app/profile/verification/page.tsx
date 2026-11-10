'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getCurrentProfile, getOwnedCommercialProfiles, submitProfileVerification } from '@beeapp/api-client';
import type { CommercialOwnedProfile, CurrentUserProfile, ProfileVerificationStatus } from '@beeapp/shared-types';
import { getWebAuth } from '@/lib/client/webAuth';
import { contactInitials } from '@/lib/client/contacts';
import {
  CommercialShell,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/client/beeservices/CommercialShell';
import {
  BadgeCheck,
  Check,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type RequirementItem = { text: string; done: boolean };

function requirements(profile: CurrentUserProfile | null, businesses: CommercialOwnedProfile[]): RequirementItem[] {
  const createdAt = Date.parse(profile?.created_at || '');
  return [
    {
      text: 'Perfil completo: nombre, ocupación y foto',
      done: Boolean(
        profile?.first_name?.trim()
          && profile?.last_name?.trim()
          && profile?.occupation?.trim()
          && profile?.avatar_file_id,
      ),
    },
    { text: 'Número de celular registrado', done: Boolean(profile?.phone_number?.trim()) },
    {
      text: 'Datos de empresa: nombre y actividad',
      done: businesses.some(
        (business) => business.display_name.trim() && (business.description.trim() || business.custom_activity_text?.trim()),
      ),
    },
    { text: 'Documento de identidad o RUT', done: Boolean(profile?.settings?.verification_request?.document_file_id) },
    {
      text: 'Al menos 30 días en Buddy',
      done: Number.isFinite(createdAt) && Date.now() - createdAt >= THIRTY_DAYS_MS,
    },
  ];
}

function identityVerificationPresentation(status: ProfileVerificationStatus) {
  switch (status) {
    case 'verificado':
      return {
        label: 'Verificado',
        hint: 'Tu insignia ya está activa en chats y en la red Buddy.',
        className: 'bg-[#C6F6D5] text-[#276749]',
        icon: ShieldCheck,
      };
    case 'en_revision':
      return {
        label: 'En revisión',
        hint: 'Estamos revisando tu solicitud. Te avisaremos cuando haya novedades.',
        className: 'bg-[#FEEBC8] text-[#C05621]',
        icon: Clock,
      };
    case 'rechazado':
      return {
        label: 'Rechazado',
        hint: 'Corrige los requisitos pendientes y vuelve a enviar la solicitud.',
        className: 'bg-[#FED7D7] text-[#9B1C1C]',
        icon: ShieldAlert,
      };
    default:
      return {
        label: 'Sin solicitar',
        hint: 'Completa los requisitos y envía tu solicitud para obtener la insignia.',
        className: 'bg-[#F3E8FF] text-[#54209E]',
        icon: BadgeCheck,
      };
  }
}

export default function IdentityVerificationPage() {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [businesses, setBusinesses] = useState<CommercialOwnedProfile[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getWebAuth()
      .then(async (auth) => {
        const [me, owned] = await Promise.all([
          getCurrentProfile(auth),
          getOwnedCommercialProfiles(auth).catch(() => ({ profiles: [] as CommercialOwnedProfile[] })),
        ]);
        setProfile(me.profile);
        setBusinesses(owned.profiles);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la verificación.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const status: ProfileVerificationStatus = profile?.verification_status || 'no_solicitado';
  const presentation = identityVerificationPresentation(status);
  const StatusIcon = presentation.icon;
  const items = requirements(profile, businesses);
  const doneCount = items.filter((item) => item.done).length;
  const progressPercent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const canRequest = status === 'no_solicitado' || status === 'rechazado';
  const pendingCount = items.filter((item) => !item.done).length;

  const accountName = useMemo(
    () => [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Tu cuenta',
    [profile],
  );

  const submit = async () => {
    setBusy(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      const response = await submitProfileVerification(auth);
      setProfile(response.profile);
      setNotice('Solicitud enviada a revisión.');
    } catch (submitError) {
      setNotice(submitError instanceof Error ? submitError.message : 'No fue posible enviar la solicitud.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <CommercialShell
      title="Verificación de identidad"
      description="Insignia de tu cuenta, separada de la suscripción"
      backHref="/app"
      wide
      compact
    >
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-[#261743]">Insignia de identidad</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#786593]">
              La verificación de cuenta es independiente de tu suscripción o de los negocios que administres.
            </p>
          </div>
          <div className="hidden shrink-0 flex-col items-end sm:flex">
            <span className="text-2xl font-extrabold leading-none text-[#7427D5]">
              {loading ? '…' : `${doneCount}/${items.length}`}
            </span>
            <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">
              Requisitos
            </span>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start">
          <section className="order-2 overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.06)] lg:order-1">
            <div className="border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:px-5">
              <h3 className="text-sm font-extrabold text-[#261743]">Checklist de verificación</h3>
              <p className="mt-0.5 text-xs text-[#786593]">
                {loading ? 'Cargando requisitos…' : `${doneCount} de ${items.length} completados (${progressPercent}%)`}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EDE5F5]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7427D5] to-[#9B6DD7] transition-[width]"
                  style={{ width: loading ? '0%' : `${progressPercent}%` }}
                />
              </div>
            </div>

            <ul className="space-y-2 p-4 sm:p-5">
              {items.map((item) => (
                <li
                  key={item.text}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                    item.done
                      ? 'border-[#D4EDDA] bg-[#F6FFF8]'
                      : 'border-[#F1EAF6] bg-[#FFFCF9]'
                  }`}
                >
                  {item.done ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide ${
                        item.done ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {item.done ? 'Listo' : 'Pendiente'}
                    </span>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#5E506B] [overflow-wrap:anywhere]">
                      {item.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Estado actual</p>
              <div className="mt-3 flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${presentation.className}`}>
                  <StatusIcon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${presentation.className}`}>
                    {presentation.label}
                  </span>
                  <p className="mt-2 text-xs leading-relaxed text-[#786593]">{presentation.hint}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8D1F1] bg-[#FFFCF9] p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Vista previa</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7427D5] text-sm font-extrabold text-white">
                  {contactInitials(accountName)}
                </span>
                <div className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-[#261743]">
                  <span className="truncate">{accountName}</span>
                  {status === 'verificado' ? (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-[#7427D5]" aria-hidden />
                  ) : (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-[#D8C4F0]" aria-hidden />
                  )}
                </div>
              </div>
              <p className="mt-2 text-[10px] text-[#B8A5D6]">
                {status === 'verificado'
                  ? 'La insignia azul aparece junto a tu nombre.'
                  : 'La insignia se activa al aprobar la verificación.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                type="button"
                className={`${primaryButtonClass} w-full gap-2`}
                disabled={!canRequest || busy || status === 'verificado' || status === 'en_revision'}
                onClick={() => void submit()}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                {busy
                  ? 'Enviando…'
                  : status === 'en_revision'
                    ? 'Solicitud en revisión'
                    : status === 'verificado'
                      ? 'Cuenta verificada'
                      : `Solicitar verificación${pendingCount > 0 ? ` (${pendingCount} pendientes)` : ''}`}
              </button>
              <Link href="/app/profile/subscription" className={`${secondaryButtonClass} w-full text-center`}>
                Ver suscripción
              </Link>
            </div>

            {notice ? (
              <p className="rounded-xl border border-[#E8D1F1] bg-[#FAF4FF] px-3 py-2 text-xs font-semibold text-[#5E1ABF]">
                {notice}
              </p>
            ) : null}
          </aside>
        </div>
      </div>
    </CommercialShell>
  );
}
