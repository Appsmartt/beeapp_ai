'use client';

import { FormEvent, useEffect, useMemo, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Archive,
  Building2,
  Landmark,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Send,
  Timer,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  Wallet,
  Wrench,
} from 'lucide-react';
import type { CommercialModality } from '@beeapp/shared-types';
import {
  formatCommercialRequestListAmount,
  formatCommercialRequestListDate,
  getCommercialModalityLabel,
  getCommercialRequestListItemCountLabel,
  getCommercialRequestListStatusLabel,
  getCommercialRequestListStatusTone,
  getCommercialRequestListTypeLabel,
  type CommercialRequestListStatusTone,
} from '@/lib/client/beeservices/commercialRequestListPresentation';
import {
  archiveOwnedCommercialCatalog,
  archiveOwnedCommercialOffer,
  archiveOwnedCommercialPaymentMethod,
  completeCommercialRequest,
  createOwnedCommercialCatalog,
  createOwnedCommercialOffer,
  createOwnedCommercialPaymentMethod,
  getCommercialRequest,
  getOwnedBusinessSalesMetrics,
  getOwnedCommercialCatalogs,
  getOwnedCommercialOffer,
  getOwnedCommercialOffers,
  getOwnedCommercialPaymentMethods,
  getOwnedCommercialProfile,
  getOwnedCommercialRequests,
  getOwnedCommercialVerification,
  pauseOwnedCommercialCatalog,
  pauseOwnedCommercialOffer,
  publishOwnedCommercialCatalog,
  publishOwnedCommercialOffer,
  restoreOwnedCommercialCatalog,
  restoreOwnedCommercialOffer,
  saveOwnedCommercialVerification,
  submitOwnedCommercialVerification,
  transitionCommercialRequest,
  updateCommercialProfile,
  updateCommercialProfilePublication,
  updateOwnedCommercialOffer,
  updateOwnedCommercialOfferModalities,
} from '@beeapp/api-client';
import type {
  BusinessSalesMetrics,
  CommercialCatalog,
  CommercialOwnedOffer,
  CommercialOwnedPaymentMethod,
  CommercialOwnedProfile,
  CommercialPaymentMethodType,
  CommercialRequestDetail,
  CommercialRequestListItem,
  CommercialVerificationRequest,
  CommercialVerificationStatus,
} from '@beeapp/shared-types';
import { getWebAuth } from '@/lib/client/webAuth';
import { ListSkeleton, PulseBlock } from '@/components/client/RouteSkeleton';
import {
  CommercialShell,
  actionError,
  fieldClass,
  moneyCop,
  primaryButtonClass,
  secondaryButtonClass,
} from '../CommercialShell';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const hoursTimeFieldClass =
  'w-full min-w-0 rounded-lg border border-[#E8D1F1] bg-white px-2 py-0.5 text-sm text-neutral-900 outline-none focus:border-[#7427D5] disabled:cursor-not-allowed h-8';

function withSeconds(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  return text.length === 5 ? `${text}:00` : text;
}

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    loader()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((loadError) => {
        if (active) setError(actionError(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload: () => setTick((value) => value + 1), setError };
}

function StatusLine({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p className="text-sm text-[#8A72B2]">Cargando…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  return null;
}

export function ManageHub({ businessId }: { businessId: string }) {
  const { data, error, loading } = useAsync(async () => {
    const auth = await getWebAuth();
    return (await getOwnedCommercialProfile(auth, businessId)).profile;
  }, [businessId]);

  const links = [
    ['Perfil', 'profile'],
    ['Horario', 'hours'],
    ['Operación', 'operation'],
    ['Métodos de pago', 'payment-methods'],
    ['Catálogos', 'catalogs'],
    ['Ofertas', 'offers'],
    ['Solicitudes', 'requests'],
    ['Métricas', 'metrics'],
    ['Verificación', 'verification'],
  ] as const;

  return (
    <CommercialShell title={data?.display_name || 'Negocio'} description="Administra tu negocio" backHref="/app/beeservices/my-businesses">
      {loading ? <ListSkeleton rows={3} /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {data ? (
        <div className="space-y-4">
          <p className="text-sm text-[#594C67]">
            {data.city} · {data.publication_status} · {data.verification_status}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {links.map(([label, path]) => (
              <Link
                key={path}
                href={`/app/beeservices/manage/${businessId}/${path}`}
                className="rounded-2xl border border-[#F0EAF3] bg-white px-4 py-4 text-sm font-semibold text-[#261743] hover:bg-[#F6EAFE]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </CommercialShell>
  );
}

export function ManageProfile({ businessId }: { businessId: string }) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return (await getOwnedCommercialProfile(auth, businessId)).profile;
  }, [businessId]);
  const [notice, setNotice] = useState('');

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const auth = await getWebAuth();
      await updateCommercialProfile(auth, businessId, {
        display_name: String(form.get('display_name') || ''),
        description: String(form.get('description') || ''),
        city: String(form.get('city') || ''),
        address: String(form.get('address') || ''),
        phone_dial_code: String(form.get('phone_dial_code') || ''),
        phone_number: String(form.get('phone_number') || ''),
        public_email: String(form.get('public_email') || ''),
        is_address_public: form.get('is_address_public') === 'on',
        is_phone_public: form.get('is_phone_public') === 'on',
        is_email_public: form.get('is_email_public') === 'on',
      });
      setNotice('Perfil actualizado.');
      loaded.reload();
    } catch (saveError) {
      setNotice(actionError(saveError));
    }
  };

  const publish = async (status: 'published' | 'paused' | 'archived') => {
    try {
      const auth = await getWebAuth();
      await updateCommercialProfilePublication(auth, businessId, { publication_status: status });
      setNotice(
        status === 'published'
          ? 'Negocio publicado.'
          : status === 'paused'
            ? 'Negocio en pausa.'
            : 'Negocio archivado.',
      );
      loaded.reload();
    } catch (saveError) {
      setNotice(actionError(saveError));
    }
  };

  const profile = loaded.data;
  return (
    <CommercialShell title="Perfil del negocio" backHref={`/app/beeservices/manage/${businessId}`} wide compact>
      <StatusLine loading={loaded.loading} error={loaded.error} />
      {profile ? (
        <ProfileForm
          key={profile.updated_at || profile.id}
          profile={profile}
          onSubmit={save}
          onPublish={publish}
          notice={notice}
        />
      ) : null}
    </CommercialShell>
  );
}

const profileFieldLabelClass =
  'mb-1.5 block text-[13px] font-extrabold text-[#4E3B68]';

function profilePublicationPresentation(status: CommercialOwnedProfile['publication_status']) {
  switch (status) {
    case 'published':
      return {
        label: 'Publicado',
        hint: 'Tu negocio es visible para clientes en el marketplace.',
        className: 'bg-[#C6F6D5] text-[#276749]',
      };
    case 'paused':
      return {
        label: 'En pausa',
        hint: 'El perfil no aparece hasta que lo actives de nuevo.',
        className: 'bg-[#FEEBC8] text-[#C05621]',
      };
    case 'archived':
      return {
        label: 'Archivado',
        hint: 'El negocio quedó fuera del catálogo público.',
        className: 'bg-[#E2E8F0] text-[#4A5568]',
      };
    case 'suspended':
      return {
        label: 'Suspendido',
        hint: 'Contacta soporte si necesitas reactivar el negocio.',
        className: 'bg-[#FED7D7] text-[#9B1C1C]',
      };
    default:
      return {
        label: 'Sin publicar',
        hint: 'Completa el perfil y publícalo cuando esté listo.',
        className: 'bg-[#F3E8FF] text-[#54209E]',
      };
  }
}

function ProfileForm({
  profile,
  onSubmit,
  onPublish,
  notice,
}: {
  profile: CommercialOwnedProfile;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPublish: (status: 'published' | 'paused' | 'archived') => void;
  notice: string;
}) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [description, setDescription] = useState(profile.description || '');
  const [city, setCity] = useState(profile.city || '');
  const [address, setAddress] = useState(profile.address || '');
  const [phoneDialCode, setPhoneDialCode] = useState(profile.phone_dial_code || '+57');
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || '');
  const [publicEmail, setPublicEmail] = useState(profile.public_email || '');
  const [isAddressPublic, setIsAddressPublic] = useState(profile.is_address_public);
  const [isPhonePublic, setIsPhonePublic] = useState(profile.is_phone_public);
  const [isEmailPublic, setIsEmailPublic] = useState(profile.is_email_public);

  const publication = profilePublicationPresentation(profile.publication_status);
  const descriptionPreview = description.trim();
  const phonePreview =
    phoneNumber.trim() ? `${phoneDialCode.trim() || '+57'} ${phoneNumber.trim()}`.trim() : '';
  const canPublish = profile.publication_status !== 'suspended';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
          <BriefcaseBusiness className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-[#261743]">Cara pública del negocio</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#786593]">
            Nombre, contacto y ubicación son lo primero que ven tus clientes. Marca qué datos quieres mostrar.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20">
          <article className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.08)]">
            <div className="flex items-center gap-4 border-b border-[#F1EAF6] bg-gradient-to-br from-[#F6EAFE] to-white p-4 sm:p-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E8D1F1] bg-white shadow-sm">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8 text-[#7427D5]" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Vista previa</p>
                <h3 className="mt-0.5 text-lg font-extrabold leading-snug text-[#261743] [overflow-wrap:anywhere]">
                  {displayName.trim() || 'Sin nombre'}
                </h3>
                {city.trim() ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#7A579D]">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {city.trim()}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {descriptionPreview ? (
                <p className="text-sm leading-relaxed text-[#786593] [overflow-wrap:anywhere] line-clamp-4">
                  {descriptionPreview}
                </p>
              ) : (
                <p className="text-sm text-[#B8A5D6]">Añade una descripción para destacar tu negocio.</p>
              )}

              <ul className="space-y-2 text-xs text-[#5E506B]">
                {isAddressPublic && address.trim() ? (
                  <li className="flex gap-2 rounded-xl border border-[#F1EAF6] bg-[#FFFCF9] px-3 py-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
                    <span className="[overflow-wrap:anywhere]">{address.trim()}</span>
                  </li>
                ) : null}
                {isPhonePublic && phonePreview ? (
                  <li className="flex gap-2 rounded-xl border border-[#F1EAF6] bg-[#FFFCF9] px-3 py-2">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
                    <span>{phonePreview}</span>
                  </li>
                ) : null}
                {isEmailPublic && publicEmail.trim() ? (
                  <li className="flex gap-2 rounded-xl border border-[#F1EAF6] bg-[#FFFCF9] px-3 py-2">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
                    <span className="[overflow-wrap:anywhere]">{publicEmail.trim()}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </article>

          <div className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Estado en el marketplace</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${publication.className}`}>
                {publication.label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#786593]">{publication.hint}</p>
            {canPublish ? (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                <button
                  type="button"
                  className={`${primaryButtonClass} w-full text-sm`}
                  onClick={() => onPublish('published')}
                >
                  Publicar
                </button>
                <button
                  type="button"
                  className={`${secondaryButtonClass} w-full text-sm`}
                  onClick={() => onPublish('paused')}
                >
                  Pausar
                </button>
                <button
                  type="button"
                  className={`${secondaryButtonClass} w-full text-sm`}
                  onClick={() => onPublish('archived')}
                >
                  Archivar
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] shadow-[0_10px_30px_rgba(116,39,213,0.08)]">
          <div className="border-b border-[#F1EAF6] bg-white/90 px-4 py-4 backdrop-blur sm:px-5">
            <h3 className="text-base font-extrabold text-[#261743]">Datos del perfil</h3>
            <p className="mt-1 text-xs text-[#786593]">Los cambios se guardan sin afectar el estado de publicación.</p>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <section className="space-y-4">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Identidad</h4>
              <div>
                <label className={profileFieldLabelClass} htmlFor="profile-display-name">Nombre</label>
                <input
                  id="profile-display-name"
                  name="display_name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className={fieldClass}
                  required
                  maxLength={200}
                  placeholder="Nombre comercial"
                />
              </div>
              <div>
                <label className={profileFieldLabelClass} htmlFor="profile-description">Descripción</label>
                <textarea
                  id="profile-description"
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClass} min-h-[110px] resize-y`}
                  rows={4}
                  maxLength={6000}
                  placeholder="Cuéntale a tus clientes qué ofreces"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Ubicación</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 md:col-span-1">
                  <label className={profileFieldLabelClass} htmlFor="profile-city">Ciudad</label>
                  <input
                    id="profile-city"
                    name="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className={fieldClass}
                    placeholder="Ej. Medellín"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={profileFieldLabelClass} htmlFor="profile-address">Dirección</label>
                  <input
                    id="profile-address"
                    name="address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className={fieldClass}
                    placeholder="Calle, número, barrio"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8D1F1] bg-white px-3 py-3 text-sm font-semibold text-[#38294E]">
                <input
                  type="checkbox"
                  name="is_address_public"
                  checked={isAddressPublic}
                  onChange={(event) => setIsAddressPublic(event.target.checked)}
                  className="rounded border-[#C9A8E8] text-[#7427D5]"
                />
                Mostrar dirección a clientes
              </label>
            </section>

            <section className="space-y-4">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Contacto</h4>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,7rem)_1fr]">
                <div>
                  <label className={profileFieldLabelClass} htmlFor="profile-dial">Indicativo</label>
                  <input
                    id="profile-dial"
                    name="phone_dial_code"
                    value={phoneDialCode}
                    onChange={(event) => setPhoneDialCode(event.target.value)}
                    className={fieldClass}
                    placeholder="+57"
                    autoComplete="tel-country-code"
                  />
                </div>
                <div>
                  <label className={profileFieldLabelClass} htmlFor="profile-phone">Teléfono</label>
                  <input
                    id="profile-phone"
                    name="phone_number"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    className={fieldClass}
                    placeholder="300 000 0000"
                    autoComplete="tel-national"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8D1F1] bg-white px-3 py-3 text-sm font-semibold text-[#38294E]">
                <input
                  type="checkbox"
                  name="is_phone_public"
                  checked={isPhonePublic}
                  onChange={(event) => setIsPhonePublic(event.target.checked)}
                  className="rounded border-[#C9A8E8] text-[#7427D5]"
                />
                Mostrar teléfono a clientes
              </label>
              <div>
                <label className={profileFieldLabelClass} htmlFor="profile-email">Correo público</label>
                <input
                  id="profile-email"
                  name="public_email"
                  type="email"
                  value={publicEmail}
                  onChange={(event) => setPublicEmail(event.target.value)}
                  className={fieldClass}
                  placeholder="contacto@tunegocio.com"
                  autoComplete="email"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8D1F1] bg-white px-3 py-3 text-sm font-semibold text-[#38294E]">
                <input
                  type="checkbox"
                  name="is_email_public"
                  checked={isEmailPublic}
                  onChange={(event) => setIsEmailPublic(event.target.checked)}
                  className="rounded border-[#C9A8E8] text-[#7427D5]"
                />
                Mostrar correo a clientes
              </label>
            </section>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#F1EAF6] bg-[#FFFCF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            {notice ? (
              <p className="text-center text-xs font-semibold text-[#5E1ABF] sm:text-left">{notice}</p>
            ) : (
              <p className="text-center text-xs text-[#B8A5D6] sm:text-left">
                Guarda los datos del perfil; la publicación se controla aparte.
              </p>
            )}
            <button type="submit" className={`${primaryButtonClass} w-full sm:w-auto sm:min-w-[11rem]`}>
              Guardar cambios
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

type WeeklyHourRow = {
  day_of_week: number;
  is_closed: boolean;
  opens_at: string;
  closes_at: string;
};

function buildWeeklyHourRows(hours: CommercialOwnedProfile['hours'] | undefined): WeeklyHourRow[] {
  return DAYS.map((_, day) => {
    const row = hours?.find((item) => item.day_of_week === day);
    return {
      day_of_week: day,
      is_closed: row?.is_closed ?? true,
      opens_at: row?.opens_at?.slice(0, 5) || '09:00',
      closes_at: row?.closes_at?.slice(0, 5) || '18:00',
    };
  });
}

function HoursScheduleForm({
  businessId,
  initialHours,
}: {
  businessId: string;
  initialHours: CommercialOwnedProfile['hours'];
}) {
  const [rows, setRows] = useState<WeeklyHourRow[]>(() => buildWeeklyHourRows(initialHours));
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(buildWeeklyHourRows(initialHours));
  }, [initialHours]);

  const updateRow = (day: number, patch: Partial<WeeklyHourRow>) => {
    setRows((current) => current.map((row) => (
      row.day_of_week === day ? { ...row, ...patch } : row
    )));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    const hours = rows.map((row) => ({
      day_of_week: row.day_of_week,
      is_closed: row.is_closed,
      opens_at: row.is_closed ? null : withSeconds(row.opens_at),
      closes_at: row.is_closed ? null : withSeconds(row.closes_at),
    }));
    try {
      const auth = await getWebAuth();
      await updateCommercialProfile(auth, businessId, { hours });
      setNotice('Horario guardado.');
    } catch (saveError) {
      setNotice(actionError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const openDays = rows.filter((row) => !row.is_closed).length;

  const summarySuffix = openDays > 0
    ? `Abres ${openDays} ${openDays === 1 ? 'día' : 'días'} a la semana.`
    : 'Marca los días que atiendes.';

  const renderStatusToggle = (row: WeeklyHourRow, label: string) => {
    const closed = row.is_closed;
    return (
      <label className="flex cursor-pointer items-center justify-end gap-2 whitespace-nowrap md:justify-center">
        <span className={`text-[11px] font-extrabold ${closed ? 'text-[#9A8FB0]' : 'text-[#177245]'}`}>
          {closed ? 'Cerrado' : 'Abierto'}
        </span>
        <input
          type="checkbox"
          checked={closed}
          onChange={(event) => updateRow(row.day_of_week, { is_closed: event.target.checked })}
          className="h-3.5 w-3.5 rounded border-[#C9A8E8] text-[#7427D5]"
          aria-label={`${label} cerrado`}
        />
      </label>
    );
  };

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-2xl space-y-3">
      <p className="flex items-start gap-2 rounded-xl border border-[#E8D1F1] bg-[#FAF4FF] px-3 py-2 text-xs leading-snug text-[#786593]">
        <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
        <span>
          <span className="font-extrabold text-[#261743]">Horario de atención.</span>{' '}
          Visible al reservar. {summarySuffix}
        </span>
      </p>

      <div className="rounded-2xl border border-[#E7DDF2] bg-white">
        <table className="hidden w-full border-collapse md:table">
          <thead>
            <tr className="border-b border-[#F1EAF6] bg-[#FFFCF9] text-left text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">
              <th className="px-3 py-2 font-extrabold">Día</th>
              <th className="px-3 py-2 font-extrabold">Apertura</th>
              <th className="px-3 py-2 font-extrabold">Cierre</th>
              <th className="px-3 py-2 text-center font-extrabold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const label = DAYS[row.day_of_week];
              const closed = row.is_closed;
              const timeClass = `${hoursTimeFieldClass} ${closed ? 'opacity-45' : ''}`;
              return (
                <tr key={label} className={`border-b border-[#F1EAF6] last:border-b-0 ${closed ? 'bg-[#FAFAFB]' : 'bg-white'}`}>
                  <td className="px-3 py-1.5">
                    <span className={`text-sm font-extrabold ${closed ? 'text-[#9A8FB0]' : 'text-[#261743]'}`}>{label}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="time"
                      aria-label={`${label} apertura`}
                      value={row.opens_at}
                      disabled={closed}
                      onChange={(event) => updateRow(row.day_of_week, { opens_at: event.target.value })}
                      className={timeClass}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="time"
                      aria-label={`${label} cierre`}
                      value={row.closes_at}
                      disabled={closed}
                      onChange={(event) => updateRow(row.day_of_week, { closes_at: event.target.value })}
                      className={timeClass}
                    />
                  </td>
                  <td className="px-3 py-1.5">{renderStatusToggle(row, label)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <ul className="divide-y divide-[#F1EAF6] md:hidden">
          {rows.map((row) => {
            const label = DAYS[row.day_of_week];
            const closed = row.is_closed;
            const timeClass = `${hoursTimeFieldClass} ${closed ? 'opacity-45' : ''}`;
            return (
              <li key={label} className={`space-y-2 px-3 py-2.5 ${closed ? 'bg-[#FAFAFB]' : 'bg-white'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-extrabold ${closed ? 'text-[#9A8FB0]' : 'text-[#261743]'}`}>{label}</span>
                  {renderStatusToggle(row, label)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[10px] font-semibold text-[#786593]">
                    Apertura
                    <input
                      type="time"
                      value={row.opens_at}
                      disabled={closed}
                      onChange={(event) => updateRow(row.day_of_week, { opens_at: event.target.value })}
                      className={`${timeClass} mt-0.5`}
                    />
                  </label>
                  <label className="block text-[10px] font-semibold text-[#786593]">
                    Cierre
                    <input
                      type="time"
                      value={row.closes_at}
                      disabled={closed}
                      onChange={(event) => updateRow(row.day_of_week, { closes_at: event.target.value })}
                      className={`${timeClass} mt-0.5`}
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {notice ? (
          <p className="text-xs text-[#5E1ABF]">{notice}</p>
        ) : (
          <p className="text-xs text-[#B8A5D6]">Los cambios se publican al guardar.</p>
        )}
        <button type="submit" className={`${primaryButtonClass} h-9 w-full px-4 text-sm sm:w-auto`} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar horario'}
        </button>
      </div>
    </form>
  );
}

export function ManageHours({ businessId }: { businessId: string }) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return (await getOwnedCommercialProfile(auth, businessId)).profile.hours;
  }, [businessId]);

  return (
    <CommercialShell title="Horario" backHref={`/app/beeservices/manage/${businessId}`} wide compact>
      <StatusLine loading={loaded.loading} error={loaded.error} />
      {loaded.data ? <HoursScheduleForm businessId={businessId} initialHours={loaded.data} /> : null}
    </CommercialShell>
  );
}

type DeliveryFeeModeOption = NonNullable<CommercialOwnedProfile['delivery_fee_mode']>;

const DELIVERY_FEE_OPTIONS: Array<{
  value: DeliveryFeeModeOption;
  label: string;
  description: string;
}> = [
  {
    value: 'not_offered',
    label: 'No ofrezco domicilio',
    description: 'Solo atención en sitio o retiro por acordar.',
  },
  {
    value: 'free',
    label: 'Domicilio gratis',
    description: 'Entregas sin cargo adicional.',
  },
  {
    value: 'fixed',
    label: 'Costo fijo',
    description: 'Un monto único para todas las entregas.',
  },
  {
    value: 'to_be_confirmed',
    label: 'Por confirmar',
    description: 'El costo se define al cerrar la solicitud.',
  },
];

function operationPageIntro(offerType: CommercialOwnedProfile['offer_type']): string {
  if (offerType === 'services') {
    return 'Disponibilidad, tiempos de apartado para reservas y reglas de domicilio.';
  }
  if (offerType === 'products') {
    return 'Disponibilidad, apartado de inventario y reglas de domicilio.';
  }
  return 'Disponibilidad, tiempos de apartado y reglas de domicilio para productos y servicios.';
}

function operationSellsServices(offerType: CommercialOwnedProfile['offer_type']): boolean {
  return offerType !== 'products';
}

function operationSellsProducts(offerType: CommercialOwnedProfile['offer_type']): boolean {
  return offerType !== 'services';
}

function deliveryFeeModeLabel(mode: DeliveryFeeModeOption): string {
  return DELIVERY_FEE_OPTIONS.find((option) => option.value === mode)?.label || 'Domicilio';
}

export function ManageOperation({ businessId }: { businessId: string }) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return (await getOwnedCommercialProfile(auth, businessId)).profile;
  }, [businessId]);
  const [notice, setNotice] = useState('');

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const auth = await getWebAuth();
      await updateCommercialProfile(auth, businessId, {
        is_available: form.get('is_available') === 'on',
        cash_on_delivery_enabled: form.get('cash_on_delivery_enabled') === 'on',
        delivery_fee_mode: String(form.get('delivery_fee_mode') || 'not_offered') as CommercialOwnedProfile['delivery_fee_mode'],
        delivery_fee_amount: Number(form.get('delivery_fee_amount') || 0),
        booking_hold_minutes: Number(form.get('booking_hold_minutes') || 30),
        inventory_hold_minutes: Number(form.get('inventory_hold_minutes') || 30),
      });
      setNotice('Operación actualizada.');
      loaded.reload();
    } catch (saveError) {
      setNotice(actionError(saveError));
    }
  };

  const profile = loaded.data;
  return (
    <CommercialShell title="Operación" backHref={`/app/beeservices/manage/${businessId}`} wide compact>
      <StatusLine loading={loaded.loading} error={loaded.error} />
      {profile ? (
        <OperationForm
          key={profile.updated_at || profile.id}
          profile={profile}
          onSubmit={save}
          notice={notice}
        />
      ) : null}
    </CommercialShell>
  );
}

function OperationForm({
  profile,
  onSubmit,
  notice,
}: {
  profile: CommercialOwnedProfile;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  notice: string;
}) {
  const [isAvailable, setIsAvailable] = useState(profile.is_available);
  const [cashOnDelivery, setCashOnDelivery] = useState(profile.cash_on_delivery_enabled);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryFeeModeOption>(
    profile.delivery_fee_mode || 'not_offered',
  );
  const [deliveryFeeAmount, setDeliveryFeeAmount] = useState(
    String(profile.delivery_fee_amount ?? 0),
  );
  const [bookingHoldMinutes, setBookingHoldMinutes] = useState(
    String(profile.booking_hold_minutes ?? 30),
  );
  const [inventoryHoldMinutes, setInventoryHoldMinutes] = useState(
    String(profile.inventory_hold_minutes ?? 30),
  );

  const sellsServices = operationSellsServices(profile.offer_type);
  const sellsProducts = operationSellsProducts(profile.offer_type);
  const parsedDeliveryFee = Number(deliveryFeeAmount);
  const showFixedDeliveryAmount = deliveryMode === 'fixed';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
          <ClipboardList className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-[#261743]">Reglas del día a día</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#786593]">{operationPageIntro(profile.offer_type)}</p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start"
      >
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Resumen</p>
            <ul className="mt-3 space-y-2.5 text-xs text-[#5E506B]">
              <li className="flex items-start gap-2">
                <span
                  className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isAvailable ? 'bg-[#C6F6D5] text-[#276749]' : 'bg-[#E2E8F0] text-[#4A5568]'
                  }`}
                >
                  {isAvailable ? 'Abierto a pedidos' : 'Sin recibir pedidos'}
                </span>
              </li>
              <li className="flex gap-2 rounded-xl border border-[#F1EAF6] bg-[#FFFCF9] px-3 py-2">
                <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
                <span>{cashOnDelivery ? 'Contraentrega activa' : 'Sin contraentrega'}</span>
              </li>
              <li className="flex gap-2 rounded-xl border border-[#F1EAF6] bg-[#FFFCF9] px-3 py-2">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {deliveryFeeModeLabel(deliveryMode)}
                  {deliveryMode === 'fixed' && Number.isFinite(parsedDeliveryFee)
                    ? ` · ${moneyCop(parsedDeliveryFee)}`
                    : null}
                </span>
              </li>
              {sellsServices ? (
                <li className="flex gap-2 rounded-xl border border-[#F1EAF6] bg-[#FFFCF9] px-3 py-2">
                  <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
                  <span>Reservas apartadas {bookingHoldMinutes || '—'} min</span>
                </li>
              ) : null}
              {sellsProducts ? (
                <li className="flex gap-2 rounded-xl border border-[#F1EAF6] bg-[#FFFCF9] px-3 py-2">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
                  <span>Inventario apartado {inventoryHoldMinutes || '—'} min</span>
                </li>
              ) : null}
            </ul>
          </div>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] shadow-[0_10px_30px_rgba(116,39,213,0.08)]">
          <div className="border-b border-[#F1EAF6] bg-white/90 px-4 py-4 backdrop-blur sm:px-5">
            <h3 className="text-base font-extrabold text-[#261743]">Configuración operativa</h3>
            <p className="mt-1 text-xs text-[#786593]">Define cómo recibes solicitudes y entregas.</p>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <section className="space-y-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Disponibilidad</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8D1F1] bg-white px-3 py-3 text-sm font-semibold text-[#38294E]">
                  <input
                    type="checkbox"
                    name="is_available"
                    checked={isAvailable}
                    onChange={(event) => setIsAvailable(event.target.checked)}
                    className="mt-0.5 rounded border-[#C9A8E8] text-[#7427D5]"
                  />
                  <span>
                    <span className="block font-extrabold text-[#261743]">Recibir pedidos</span>
                    <span className="mt-0.5 block text-xs font-normal text-[#786593]">
                      Los clientes pueden enviarte nuevas solicitudes.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8D1F1] bg-white px-3 py-3 text-sm font-semibold text-[#38294E]">
                  <input
                    type="checkbox"
                    name="cash_on_delivery_enabled"
                    checked={cashOnDelivery}
                    onChange={(event) => setCashOnDelivery(event.target.checked)}
                    className="mt-0.5 rounded border-[#C9A8E8] text-[#7427D5]"
                  />
                  <span>
                    <span className="block font-extrabold text-[#261743]">Contraentrega</span>
                    <span className="mt-0.5 block text-xs font-normal text-[#786593]">
                      Acepta pago al momento de la entrega.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Domicilio</h4>
              <input type="hidden" name="delivery_fee_mode" value={deliveryMode} />
              <div className="grid gap-2 sm:grid-cols-2">
                {DELIVERY_FEE_OPTIONS.map((option) => {
                  const selected = deliveryMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDeliveryMode(option.value)}
                      className={`flex flex-col rounded-xl border px-3 py-3 text-left transition ${
                        selected
                          ? 'border-[#7427D5] bg-[#F6EAFE] shadow-sm'
                          : 'border-[#E7DDF2] bg-white hover:border-[#C9A8E8]'
                      }`}
                    >
                      <span className="text-sm font-extrabold text-[#261743]">{option.label}</span>
                      <span className="mt-1 text-xs leading-relaxed text-[#786593]">{option.description}</span>
                    </button>
                  );
                })}
              </div>
              {showFixedDeliveryAmount ? (
                <div className="max-w-xs">
                  <label className={profileFieldLabelClass} htmlFor="operation-delivery-fee">
                    Valor del domicilio (COP)
                  </label>
                  <input
                    id="operation-delivery-fee"
                    name="delivery_fee_amount"
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryFeeAmount}
                    onChange={(event) => setDeliveryFeeAmount(event.target.value)}
                    className={fieldClass}
                  />
                </div>
              ) : (
                <input type="hidden" name="delivery_fee_amount" value={deliveryFeeAmount} />
              )}
            </section>

            <section className="space-y-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">
                Tiempos de apartado
              </h4>
              <p className="text-xs leading-relaxed text-[#786593]">
                Cuánto tiempo se reserva un cupo o una unidad antes de liberarse si no se confirma.
              </p>
              <div className={`grid gap-4 ${sellsServices && sellsProducts ? 'sm:grid-cols-2' : 'max-w-xs'}`}>
                {sellsServices ? (
                  <div>
                    <label className={profileFieldLabelClass} htmlFor="operation-booking-hold">
                      Reservas (minutos)
                    </label>
                    <input
                      id="operation-booking-hold"
                      name="booking_hold_minutes"
                      type="number"
                      min="5"
                      max="240"
                      value={bookingHoldMinutes}
                      onChange={(event) => setBookingHoldMinutes(event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                ) : (
                  <input type="hidden" name="booking_hold_minutes" value={bookingHoldMinutes} />
                )}
                {sellsProducts ? (
                  <div>
                    <label className={profileFieldLabelClass} htmlFor="operation-inventory-hold">
                      Inventario (minutos)
                    </label>
                    <input
                      id="operation-inventory-hold"
                      name="inventory_hold_minutes"
                      type="number"
                      min="5"
                      max="240"
                      value={inventoryHoldMinutes}
                      onChange={(event) => setInventoryHoldMinutes(event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                ) : (
                  <input type="hidden" name="inventory_hold_minutes" value={inventoryHoldMinutes} />
                )}
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#F1EAF6] bg-[#FFFCF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            {notice ? (
              <p className="text-center text-xs font-semibold text-[#5E1ABF] sm:text-left">{notice}</p>
            ) : (
              <p className="text-center text-xs text-[#B8A5D6] sm:text-left">
                Los cambios aplican de inmediato para nuevas solicitudes.
              </p>
            )}
            <button type="submit" className={`${primaryButtonClass} w-full sm:w-auto sm:min-w-[11rem]`}>
              Guardar cambios
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function paymentMethodTypeLabel(type: CommercialPaymentMethodType): string {
  const labels: Record<CommercialPaymentMethodType, string> = {
    nequi: 'Nequi',
    daviplata: 'Daviplata',
    breb: 'Bre-B',
    bank_account: 'Cuenta bancaria',
  };
  return labels[type];
}

function paymentMethodAccent(type: CommercialPaymentMethodType): {
  stripe: string;
  chip: string;
  iconWrap: string;
  dot: string;
} {
  switch (type) {
    case 'nequi':
      return {
        stripe: 'bg-gradient-to-r from-[#6A1B9A] via-[#8E24AA] to-[#AB47BC]',
        chip: 'bg-[#F3E5F5] text-[#6A1B9A]',
        iconWrap: 'bg-[#F3E5F5] text-[#7B1FA2]',
        dot: 'bg-[#8E24AA]',
      };
    case 'daviplata':
      return {
        stripe: 'bg-gradient-to-r from-[#C62828] via-[#E53935] to-[#EF5350]',
        chip: 'bg-[#FFEBEE] text-[#C62828]',
        iconWrap: 'bg-[#FFEBEE] text-[#D32F2F]',
        dot: 'bg-[#E53935]',
      };
    case 'breb':
      return {
        stripe: 'bg-gradient-to-r from-[#5E1ABF] via-[#7427D5] to-[#9B6DD7]',
        chip: 'bg-[#F6EAFE] text-[#5E1ABF]',
        iconWrap: 'bg-[#F6EAFE] text-[#7427D5]',
        dot: 'bg-[#7427D5]',
      };
    default:
      return {
        stripe: 'bg-gradient-to-r from-[#37474F] via-[#546E7A] to-[#78909C]',
        chip: 'bg-[#ECEFF1] text-[#37474F]',
        iconWrap: 'bg-[#ECEFF1] text-[#455A64]',
        dot: 'bg-[#546E7A]',
      };
  }
}

function paymentMethodCredential(method: CommercialOwnedPaymentMethod): {
  primary: string;
  secondary: string | null;
} {
  if (method.bank_account) {
    const tail = method.bank_account.account_number.slice(-4);
    return {
      primary: `•••• ${tail}`,
      secondary: `${method.bank_account.bank_name} · ${method.bank_account.account_holder_name}`,
    };
  }
  if (method.mobile_account) {
    return {
      primary: method.mobile_account.payment_key,
      secondary: method.mobile_account.account_holder_name,
    };
  }
  return { primary: paymentMethodTypeLabel(method.payment_method_type), secondary: null };
}

function PaymentMethodCard({
  method,
  onArchive,
}: {
  method: CommercialOwnedPaymentMethod;
  onArchive: () => void;
}) {
  const isBank = method.payment_method_type === 'bank_account';
  const Icon = isBank ? Landmark : Wallet;
  const accent = paymentMethodAccent(method.payment_method_type);
  const credential = paymentMethodCredential(method);

  return (
    <li className="group overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_8px_24px_rgba(116,39,213,0.07)] transition hover:border-[#C9A8E8] hover:shadow-[0_12px_32px_rgba(116,39,213,0.11)]">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <div className={`h-1.5 w-full shrink-0 sm:h-auto sm:w-1.5 ${accent.stripe}`} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:flex-row md:items-center md:gap-5 md:p-5">
          <div className="flex items-start gap-3 md:shrink-0">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent.iconWrap}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="rounded-full bg-[#EBFBEE] px-2.5 py-1 text-[10px] font-extrabold text-[#177245] sm:hidden">
              Activo
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8A72B2]">
                {paymentMethodTypeLabel(method.payment_method_type)}
              </span>
              <span className="hidden rounded-full bg-[#EBFBEE] px-2.5 py-0.5 text-[10px] font-extrabold text-[#177245] sm:inline">
                Activo
              </span>
            </div>
            <p className="mt-1 text-base font-extrabold leading-snug text-[#261743] md:text-lg [overflow-wrap:anywhere]">
              {method.display_name}
            </p>
            <div
              className={`mt-2 inline-flex max-w-full rounded-xl px-3 py-2 font-mono text-sm font-semibold tracking-wide ${accent.chip} [overflow-wrap:anywhere] md:mt-2.5`}
            >
              {credential.primary}
            </div>
            {credential.secondary ? (
              <p className="mt-1.5 text-xs leading-relaxed text-[#786593] [overflow-wrap:anywhere]">
                {credential.secondary}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#E8D1F1] bg-[#FFFCF9] px-4 text-xs font-semibold text-[#5E506B] transition group-hover:border-[#D8C4F0] group-hover:text-[#5E1ABF] md:h-10 md:w-auto"
            onClick={onArchive}
          >
            <Archive className="h-3.5 w-3.5" aria-hidden />
            Archivar
          </button>
        </div>
      </div>
    </li>
  );
}

function PaymentMethodCreateForm({
  businessId,
  onCreated,
  onNotice,
}: {
  businessId: string;
  onCreated: () => void;
  onNotice: (message: string) => void;
}) {
  const [methodType, setMethodType] = useState<CommercialPaymentMethodType>('nequi');
  const [saving, setSaving] = useState(false);
  const isBank = methodType === 'bank_account';

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    try {
      const auth = await getWebAuth();
      await createOwnedCommercialPaymentMethod(auth, businessId, {
        payment_method_type: methodType,
        display_name: String(data.get('display_name') || methodType),
        ...(isBank
          ? {
            bank_account: {
              account_holder_name: String(data.get('holder') || ''),
              account_holder_document_type: 'CC',
              account_holder_document_number: String(data.get('document') || ''),
              bank_name: String(data.get('bank') || ''),
              account_type: 'savings',
              account_number: String(data.get('account') || ''),
            },
          }
          : {
            mobile_account: {
              wallet_type: methodType,
              payment_key: String(data.get('key') || ''),
              account_holder_name: String(data.get('holder') || '') || null,
            },
          }),
      });
      form.reset();
      setMethodType('nequi');
      onNotice('Método agregado.');
      onCreated();
    } catch (saveError) {
      onNotice(actionError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const paymentFieldLabel = 'mb-1.5 block text-[11px] font-extrabold text-[#4E3B68]';
  const typeOptions: CommercialPaymentMethodType[] = ['nequi', 'daviplata', 'breb', 'bank_account'];

  return (
    <form
      onSubmit={create}
      className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] shadow-[0_10px_30px_rgba(116,39,213,0.08)]"
    >
      <div className="border-b border-[#F1EAF6] bg-white/80 px-4 py-4 backdrop-blur sm:px-5">
        <h3 className="text-base font-extrabold text-[#261743]">Nuevo método</h3>
        <p className="mt-1 text-xs text-[#786593]">Visible cuando un cliente debe pagarte.</p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Tipo de cobro</p>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((type) => {
              const selected = methodType === type;
              const accent = paymentMethodAccent(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMethodType(type)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                    selected
                      ? 'border-[#7427D5] bg-[#7427D5] text-white shadow-sm'
                      : `border-[#E7DDF2] bg-white text-[#5E506B] hover:border-[#C9A8E8]`
                  }`}
                >
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${selected ? 'bg-white/90' : accent.dot}`} />
                  {paymentMethodTypeLabel(type)}
                </button>
              );
            })}
          </div>
        </div>
        <label className={paymentFieldLabel}>
          Nombre visible
          <input name="display_name" placeholder="Ej. Nequi personal" className={fieldClass} required />
        </label>
      {isBank ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={paymentFieldLabel}>
            Titular
            <input name="holder" placeholder="Nombre completo" className={fieldClass} required />
          </label>
          <label className={paymentFieldLabel}>
            Documento
            <input name="document" placeholder="Cédula" className={fieldClass} required />
          </label>
          <label className={paymentFieldLabel}>
            Banco
            <input name="bank" placeholder="Ej. Bancolombia" className={fieldClass} required />
          </label>
          <label className={paymentFieldLabel}>
            Número de cuenta
            <input name="account" placeholder="Número de cuenta" className={fieldClass} required />
          </label>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={paymentFieldLabel}>
            Titular (opcional)
            <input name="holder" placeholder="Nombre del titular" className={fieldClass} />
          </label>
          <label className={paymentFieldLabel}>
            {methodType === 'breb' ? 'Llave Bre-B' : 'Celular o llave'}
            <input name="key" placeholder={methodType === 'breb' ? '@usuario' : '300 123 4567'} className={fieldClass} required />
          </label>
        </div>
      )}
        <div className="flex flex-col gap-2 border-t border-[#F1EAF6] pt-4 sm:flex-row sm:justify-end">
          <button type="submit" className={`${primaryButtonClass} inline-flex w-full items-center justify-center gap-2 sm:w-auto`} disabled={saving}>
            <Plus className="h-4 w-4" aria-hidden />
            {saving ? 'Agregando…' : 'Agregar método'}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ManagePayments({ businessId }: { businessId: string }) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return (await getOwnedCommercialPaymentMethods(auth, businessId)).payment_methods;
  }, [businessId]);
  const [notice, setNotice] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);

  const activeMethods = (loaded.data || []).filter((item) => item.status === 'active');

  const archive = async (method: CommercialOwnedPaymentMethod) => {
    try {
      const auth = await getWebAuth();
      await archiveOwnedCommercialPaymentMethod(auth, businessId, method.id);
      setNotice('Método archivado.');
      loaded.reload();
    } catch (saveError) {
      setNotice(actionError(saveError));
    }
  };

  const closeComposer = () => setComposerOpen(false);
  const openComposer = () => setComposerOpen(true);

  const composerForm = (
    <PaymentMethodCreateForm
      businessId={businessId}
      onCreated={() => {
        loaded.reload();
        setComposerOpen(false);
      }}
      onNotice={setNotice}
    />
  );

  return (
    <CommercialShell title="Métodos de pago" backHref={`/app/beeservices/manage/${businessId}`} wide compact>
      <StatusLine loading={loaded.loading} error={loaded.error} />
      {!loaded.loading ? (
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-[#261743]">Cuentas para recibir pagos</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#786593]">
                Publica métodos claros y verificables. Tus clientes verán exactamente dónde transferirte.
              </p>
            </div>
            <div className="hidden shrink-0 flex-col items-end text-right sm:flex">
              <span className="text-2xl font-extrabold leading-none text-[#7427D5]">{activeMethods.length}</span>
              <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">
                {activeMethods.length === 1 ? 'Activo' : 'Activos'}
              </span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start xl:gap-6">
            <div className="space-y-4">
              {composerOpen ? <div className="lg:hidden">{composerForm}</div> : null}

              <section className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.06)]">
                <div className="flex flex-col gap-3 border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#261743]">Métodos activos</h3>
                    <p className="mt-0.5 text-xs text-[#786593]">
                      {activeMethods.length === 0
                        ? 'Ninguna cuenta publicada todavía'
                        : `${activeMethods.length} ${activeMethods.length === 1 ? 'cuenta configurada' : 'cuentas configuradas'}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComposerOpen((open) => !open)}
                    className={`inline-flex w-full items-center justify-center gap-2 sm:w-auto lg:hidden ${composerOpen ? secondaryButtonClass : primaryButtonClass}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    {composerOpen ? 'Cerrar' : 'Agregar método'}
                  </button>
                </div>

                <div className="p-4 sm:p-5">
                  {activeMethods.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E7DDF2] bg-[#FFFCF9] px-5 py-8 text-center sm:py-10 lg:py-12">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
                        <Wallet className="h-6 w-6" aria-hidden />
                      </span>
                      <p className="mt-4 text-sm font-extrabold text-[#261743]">Aún no tienes métodos publicados</p>
                      <p className="mt-1 text-xs text-[#786593]">Nequi, Daviplata, Bre-B o cuenta bancaria.</p>
                      <p className="mt-2 text-xs font-semibold text-[#8A72B2] lg:hidden">Completa el formulario debajo.</p>
                      <p className="mt-2 hidden text-xs font-semibold text-[#8A72B2] lg:block">Completa el formulario a la derecha.</p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {activeMethods.map((item) => (
                        <PaymentMethodCard
                          key={item.id}
                          method={item}
                          onArchive={() => void archive(item)}
                        />
                      ))}
                    </ul>
                  )}
                </div>

                {notice ? (
                  <p className="border-t border-[#F1EAF6] bg-[#FAF4FF] px-4 py-3 text-center text-xs font-semibold text-[#5E1ABF] sm:px-5 sm:text-left">
                    {notice}
                  </p>
                ) : null}
              </section>
            </div>

            <aside className="hidden space-y-4 lg:block lg:sticky lg:top-20">
              {composerOpen || activeMethods.length === 0 ? (
                composerForm
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] p-5 shadow-[0_10px_30px_rgba(116,39,213,0.08)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
                    <Plus className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-[#261743]">Otra cuenta</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#786593]">
                    Ofrece más de una opción de pago para facilitar las transferencias.
                  </p>
                  <button type="button" className={`${primaryButtonClass} mt-4 w-full`} onClick={openComposer}>
                    Agregar método
                  </button>
                </div>
              )}
              {composerOpen && activeMethods.length > 0 ? (
                <button type="button" className={`${secondaryButtonClass} w-full`} onClick={closeComposer}>
                  Cerrar formulario
                </button>
              ) : null}
            </aside>
          </div>

          {activeMethods.length === 0 ? (
            <div className="lg:hidden">{composerForm}</div>
          ) : null}
        </div>
      ) : null}
    </CommercialShell>
  );
}

export function ManageCatalogs({ businessId, archived = false }: { businessId: string; archived?: boolean }) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    const response = await getOwnedCommercialCatalogs(auth, businessId, { include_archived: archived });
    return response.catalogs.filter((catalog) => (
      archived ? catalog.status === 'archived' : catalog.status !== 'archived'
    ));
  }, [businessId, archived]);
  const [notice, setNotice] = useState('');

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      loaded.reload();
    } catch (saveError) {
      setNotice(actionError(saveError));
    }
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const auth = await getWebAuth();
      await createOwnedCommercialCatalog(auth, businessId, {
        name: String(form.get('name') || ''),
        description: String(form.get('description') || ''),
      });
    });
    event.currentTarget.reset();
  };

  return (
    <CommercialShell
      title={archived ? 'Catálogos archivados' : 'Catálogos'}
      backHref={archived ? `/app/beeservices/manage/${businessId}/catalogs` : `/app/beeservices/manage/${businessId}`}
    >
      <StatusLine loading={loaded.loading} error={loaded.error} />
      {!archived ? (
        <div className="mb-4 flex justify-end">
          <Link href={`/app/beeservices/manage/${businessId}/catalogs/archived`} className="text-xs font-semibold text-[#7427D5]">Ver archivados</Link>
        </div>
      ) : null}
      <CatalogList businessId={businessId} catalogs={loaded.data || []} archived={archived} onRun={run} />
      {!archived ? (
        <form onSubmit={create} className="mt-4 space-y-2">
          <input name="name" placeholder="Nuevo catálogo" className={fieldClass} required />
          <input name="description" placeholder="Descripción" className={fieldClass} />
          <button type="submit" className={primaryButtonClass}>Crear catálogo</button>
        </form>
      ) : null}
      {notice ? <p className="mt-3 text-sm text-rose-600">{notice}</p> : null}
    </CommercialShell>
  );
}

function CatalogList({
  businessId,
  catalogs,
  archived,
  onRun,
}: {
  businessId: string;
  catalogs: CommercialCatalog[];
  archived: boolean;
  onRun: (action: () => Promise<unknown>) => Promise<void>;
}) {
  return (
    <ul className="space-y-2">
      {catalogs.map((catalog) => (
        <li key={catalog.id} className="rounded-xl border border-[#F0EAF3] bg-white px-3 py-3">
          <p className="text-sm font-semibold">{catalog.name}</p>
          <p className="text-xs text-[#8A72B2]">{catalog.status || 'published'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/app/beeservices/manage/${businessId}/offers?catalog=${catalog.id}`} className={secondaryButtonClass}>Ofertas</Link>
            {archived ? (
              <button type="button" className={secondaryButtonClass} onClick={() => void onRun(async () => {
                const auth = await getWebAuth();
                await restoreOwnedCommercialCatalog(auth, businessId, catalog.id);
              })}>Restaurar</button>
            ) : (
              <>
                <button type="button" className={secondaryButtonClass} onClick={() => void onRun(async () => {
                  const auth = await getWebAuth();
                  if (catalog.status === 'paused') await publishOwnedCommercialCatalog(auth, businessId, catalog.id);
                  else await pauseOwnedCommercialCatalog(auth, businessId, catalog.id);
                })}>{catalog.status === 'paused' ? 'Publicar' : 'Pausar'}</button>
                <button type="button" className={secondaryButtonClass} onClick={() => void onRun(async () => {
                  const auth = await getWebAuth();
                  await archiveOwnedCommercialCatalog(auth, businessId, catalog.id);
                })}>Archivar</button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ManageOffers({
  businessId,
  archived = false,
  catalogId,
  embedded = false,
  heading,
}: {
  businessId: string;
  archived?: boolean;
  catalogId?: string;
  embedded?: boolean;
  heading?: string;
}) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    const [offers, catalogs] = await Promise.all([
      getOwnedCommercialOffers(auth, businessId, { include_archived: archived, catalog_id: catalogId }),
      getOwnedCommercialCatalogs(auth, businessId),
    ]);
    return {
      offers: offers.offers.filter((offer) => (archived ? offer.status === 'archived' : offer.status !== 'archived')),
      catalogs: catalogs.catalogs.filter((catalog) => catalog.status !== 'archived'),
    };
  }, [businessId, archived, catalogId]);
  const [notice, setNotice] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const auth = await getWebAuth();
      await createOwnedCommercialOffer(auth, businessId, {
        catalog_id: String(data.get('catalog_id') || ''),
        offer_kind: String(data.get('offer_kind') || 'product') as 'product' | 'service',
        title: String(data.get('title') || ''),
        description: String(data.get('description') || ''),
        base_price_amount: Number(data.get('price') || 0),
        pricing_strategy: 'fixed',
        currency_code: 'COP',
      });
      form.reset();
      setNotice('Oferta creada.');
      loaded.reload();
    } catch (saveError) {
      setNotice(actionError(saveError));
    }
  };

  const offers = loaded.data?.offers || [];
  const noun = heading === 'Servicios' ? 'servicio' : heading === 'Productos' ? 'producto' : 'oferta';
  const archivedWord = noun === 'oferta'
    ? (offers.length === 1 ? 'archivada' : 'archivadas')
    : (offers.length === 1 ? 'archivado' : 'archivados');
  const countLabel = archived
    ? `${offers.length} ${offers.length === 1 ? noun : `${noun}s`} ${archivedWord}`
    : `${offers.length} ${offers.length === 1 ? noun : `${noun}s`}`;
  const formTitle = heading === 'Servicios'
    ? 'Nuevo servicio'
    : heading === 'Productos'
      ? 'Nuevo producto'
      : 'Nueva oferta';
  const defaultKind = heading === 'Servicios' ? 'service' : 'product';
  const emptyNoun = heading === 'Servicios' ? 'servicios' : heading === 'Productos' ? 'productos' : 'ofertas';

  const offersBody = (
    <div className="space-y-5">
      {!loaded.loading ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {embedded && heading ? (
              <h2 className="text-lg font-extrabold text-[#261743]">{heading}</h2>
            ) : null}
            <p className="text-sm font-semibold text-[#594C67]">{countLabel}</p>
          </div>
          {!archived ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/app/beeservices/manage/${businessId}/offers/archived`} className={secondaryButtonClass}>Ver archivadas</Link>
              <button
                type="button"
                onClick={() => setComposerOpen((open) => !open)}
                className={composerOpen ? secondaryButtonClass : primaryButtonClass}
              >
                {composerOpen ? 'Cerrar' : formTitle}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {composerOpen && !archived && !loaded.loading ? (
        <form
          onSubmit={create}
          className="rounded-[18px] border border-[#E7DDF2] bg-white p-4 shadow-[0_8px_24px_rgba(116,39,213,0.06)] sm:p-5"
        >
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-[#261743]">{formTitle}</h3>
            <p className="mt-1 text-xs text-[#786593]">Queda publicado en el catálogo del negocio.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            <label className="block text-xs font-semibold text-[#4E3B68]">
              Catálogo
              <select name="catalog_id" className={fieldClass} required defaultValue={catalogId || ''}>
                <option value="" disabled>Elige un catálogo</option>
                {(loaded.data?.catalogs || []).map((catalog) => (
                  <option key={catalog.id} value={catalog.id}>{catalog.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#4E3B68]">
              Tipo
              <select name="offer_kind" className={fieldClass} defaultValue={defaultKind}>
                <option value="product">Producto</option>
                <option value="service">Servicio</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#4E3B68]">
              Nombre
              <input name="title" placeholder="Ej. Corte clásico" className={fieldClass} required />
            </label>
            <label className="block text-xs font-semibold text-[#4E3B68]">
              Descripción
              <input name="description" placeholder="Qué incluye" className={fieldClass} />
            </label>
            <label className="block text-xs font-semibold text-[#4E3B68]">
              Precio COP
              <input name="price" type="number" min="0" placeholder="35000" className={fieldClass} />
            </label>
            <button type="submit" className={`${primaryButtonClass} w-full`}>Crear</button>
          </div>
        </form>
      ) : null}
      {notice ? <p className="text-sm text-[#5E1ABF]">{notice}</p> : null}

      <section className="min-w-0">
        {loaded.loading ? <ListSkeleton /> : null}
        {loaded.error ? <p className="text-sm text-rose-600">{loaded.error}</p> : null}
        {!loaded.loading && !loaded.error && offers.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#E7DDF2] bg-white px-6 py-10 text-center">
            <p className="text-sm font-semibold text-[#261743]">Todavía no hay {emptyNoun}</p>
            <p className="mt-1 text-xs text-[#786593]">
              {archived ? 'No hay elementos archivados.' : 'Crea el primero con precio, descripción y catálogo.'}
            </p>
          </div>
        ) : null}
        {!loaded.loading && offers.length > 0 ? (
          <ul
            className="grid justify-start gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 260px))' }}
          >
            {offers.map((offer) => (
              <OfferRow key={offer.id} businessId={businessId} offer={offer} archived={archived} onChanged={loaded.reload} onError={setNotice} />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );

  if (embedded) {
    return <div className="pb-28">{offersBody}</div>;
  }

  return (
    <CommercialShell
      title={heading || (archived ? 'Ofertas archivadas' : 'Ofertas')}
      backHref={`/app/beeservices/manage/${businessId}`}
      wide
    >
      {offersBody}
    </CommercialShell>
  );
}

function OfferRow({
  businessId,
  offer,
  archived,
  onChanged,
  onError,
}: {
  businessId: string;
  offer: CommercialOwnedOffer;
  archived: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      onChanged();
    } catch (saveError) {
      onError(actionError(saveError));
    }
  };

  const status = offerStatusCopy(offer);
  const cover = offer.images.find((image) => image.is_primary && image.url)?.url
    || offer.images.find((image) => image.url)?.url
    || null;
  const kindLabel = offer.offer_kind === 'product' ? 'Producto' : 'Servicio';
  const href = `/app/beeservices/manage/${businessId}/offers/${offer.id}`;
  const compactActionClass =
    'inline-flex h-8 items-center justify-center rounded-lg border border-[#E8D1F1] bg-white px-3 text-xs font-semibold text-[#5E1ABF] hover:bg-[#F6EAFE]';
  const KindIcon = offer.offer_kind === 'product' ? Package : BriefcaseBusiness;

  const renderActions = () => archived ? (
    <button
      type="button"
      className={compactActionClass}
      onClick={() => void run(async () => {
        const auth = await getWebAuth();
        await restoreOwnedCommercialOffer(auth, businessId, offer.id);
      })}
    >
      Restaurar
    </button>
  ) : (
    <>
      <button
        type="button"
        className={compactActionClass}
        onClick={() => void run(async () => {
          const auth = await getWebAuth();
          if (offer.status === 'paused') await publishOwnedCommercialOffer(auth, businessId, offer.id);
          else await pauseOwnedCommercialOffer(auth, businessId, offer.id);
        })}
      >
        {offer.status === 'paused' ? 'Publicar' : 'Pausar'}
      </button>
      <button
        type="button"
        className={compactActionClass}
        onClick={() => void run(async () => {
          const auth = await getWebAuth();
          await archiveOwnedCommercialOffer(auth, businessId, offer.id);
        })}
      >
        Archivar
      </button>
    </>
  );

  return (
    <li className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-sm transition hover:border-[#C9A8E8]">
      <div className="flex items-start gap-3 p-3 md:hidden">
        <Link href={href} className="shrink-0" aria-label={`Abrir ${offer.title}`}>
          {cover ? (
            <img src={cover} alt="" className="h-14 w-14 rounded-xl bg-[#F6EAFE] object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F6EAFE] text-[#7427D5]">
              <KindIcon className="h-6 w-6" />
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} className="block min-w-0">
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#7427D5]">{kindLabel}</span>
            <span className="mt-0.5 block text-sm font-extrabold leading-snug text-[#261743] [overflow-wrap:anywhere]">{offer.title}</span>
            {offer.description ? (
              <span className="mt-0.5 block text-[11px] leading-snug text-[#786593] line-clamp-2 [overflow-wrap:anywhere]">
                {offer.description}
              </span>
            ) : null}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-extrabold text-[#38294E]">{moneyCop(offer.base_price_amount)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${status.className}`}>{status.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{renderActions()}</div>
        </div>
        <Link href={href} className="shrink-0 self-center p-0.5 text-[#B8A5D6] hover:text-[#7427D5]" aria-label={`Abrir ${offer.title}`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="hidden h-full flex-col md:flex">
        <Link href={href} className="block min-w-0">
          <div className="relative h-28 bg-[#F6EAFE]">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-[#7427D5]">
                <KindIcon className="h-7 w-7" />
              </span>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#7427D5]">
              {kindLabel}
            </span>
            <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${status.className}`}>
              {status.label}
            </span>
          </div>
          <div className="space-y-1 p-3">
            <p className="text-sm font-extrabold leading-snug text-[#261743] [overflow-wrap:anywhere]">{offer.title}</p>
            {offer.description ? (
              <p className="line-clamp-2 text-xs leading-snug text-[#786593] [overflow-wrap:anywhere]">{offer.description}</p>
            ) : null}
            <p className="text-sm font-extrabold text-[#7427D5]">{moneyCop(offer.base_price_amount)}</p>
          </div>
        </Link>
        <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[#F1EAF6] px-3 py-2.5">
          {renderActions()}
        </div>
      </div>
    </li>
  );
}

function offerStatusCopy(offer: CommercialOwnedOffer): { label: string; className: string } {
  if (offer.status === 'paused') return { label: 'Pausado', className: 'bg-[#FFF4E6] text-[#9A5B00]' };
  if (offer.status === 'archived') return { label: 'Archivado', className: 'bg-[#F1F0F3] text-[#6D6875]' };
  if (!offer.is_available) return { label: 'No disponible', className: 'bg-[#FFF5F5] text-[#C92A2A]' };
  return { label: 'Publicado', className: 'bg-[#EBFBEE] text-[#177245]' };
}

const PRODUCT_OFFER_MODALITIES: CommercialModality[] = [
  'delivery',
  'pickup',
  'at_establishment',
  'in_person',
  'buddy_chat',
  'phone_call',
];

const SERVICE_OFFER_MODALITIES: CommercialModality[] = [
  'at_establishment',
  'in_person',
  'home_visit',
  'virtual',
  'buddy_chat',
  'phone_call',
];

function activeOfferModalities(offer: CommercialOwnedOffer): CommercialModality[] {
  return offer.modalities
    .filter((record) => record.status !== 'archived')
    .map((record) => record.modality);
}

const offerFieldLabelClass =
  'mb-1.5 block text-[13px] font-extrabold text-[#4E3B68]';

export function ManageOfferEditor({ businessId, offerId }: { businessId: string; offerId: string }) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return (await getOwnedCommercialOffer(auth, businessId, offerId)).offer;
  }, [businessId, offerId]);
  const [notice, setNotice] = useState('');
  const offer = loaded.data;
  const shellTitle = offer?.offer_kind === 'product' ? 'Producto' : offer ? 'Servicio' : 'Editar oferta';

  return (
    <CommercialShell title={shellTitle} backHref={`/app/beeservices/manage/${businessId}/offers`} wide compact>
      <StatusLine loading={loaded.loading} error={loaded.error} />
      {offer ? (
        <OfferEditorForm
          businessId={businessId}
          offerId={offerId}
          offer={offer}
          notice={notice}
          setNotice={setNotice}
          onSaved={loaded.reload}
        />
      ) : null}
    </CommercialShell>
  );
}

function OfferEditorForm({
  businessId,
  offerId,
  offer,
  notice,
  setNotice,
  onSaved,
}: {
  businessId: string;
  offerId: string;
  offer: CommercialOwnedOffer;
  notice: string;
  setNotice: (value: string) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(offer.title);
  const [description, setDescription] = useState(offer.description || '');
  const [price, setPrice] = useState(
    offer.base_price_amount === null ? '' : String(offer.base_price_amount),
  );
  const [stock, setStock] = useState(
    offer.stock_quantity === null ? '' : String(offer.stock_quantity),
  );
  const [duration, setDuration] = useState(
    offer.duration_minutes === null ? '' : String(offer.duration_minutes),
  );
  const [requiresBooking, setRequiresBooking] = useState(offer.requires_booking);
  const [isAvailable, setIsAvailable] = useState(offer.is_available);
  const [modalities, setModalities] = useState<CommercialModality[]>(
    () => activeOfferModalities(offer),
  );
  const [saving, setSaving] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setTitle(offer.title);
    setDescription(offer.description || '');
    setPrice(offer.base_price_amount === null ? '' : String(offer.base_price_amount));
    setStock(offer.stock_quantity === null ? '' : String(offer.stock_quantity));
    setDuration(offer.duration_minutes === null ? '' : String(offer.duration_minutes));
    setRequiresBooking(offer.requires_booking);
    setIsAvailable(offer.is_available);
    setModalities(activeOfferModalities(offer));
    setActiveImageIndex(0);
  }, [offer]);

  const isProduct = offer.offer_kind === 'product';
  const modalityOptions = isProduct ? PRODUCT_OFFER_MODALITIES : SERVICE_OFFER_MODALITIES;
  const status = offerStatusCopy(offer);
  const sortedImages = [...offer.images].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1;
    }
    return (left.sort_order || 0) - (right.sort_order || 0);
  });
  const parsedDuration = Number(duration);
  const parsedPrice = Number(price);
  const galleryImages = sortedImages.filter((image) => Boolean(image.url));
  const safeImageIndex = galleryImages.length > 0
    ? Math.min(activeImageIndex, galleryImages.length - 1)
    : 0;
  const activeImageUrl = galleryImages[safeImageIndex]?.url || null;

  const previewMeta = (
    <>
      {description.trim() ? (
        <section className="rounded-2xl border border-[#F1EAF6] bg-[#FFFCF9] p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#8A72B2]">Descripción</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#786593] [overflow-wrap:anywhere]">
            {description.trim()}
          </p>
        </section>
      ) : null}
      {requiresBooking && !isProduct ? (
        <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-[#FAF4FF] p-4">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#7427D5]" aria-hidden />
          <span>
            <span className="block text-sm font-extrabold text-[#261743]">Servicio con reserva</span>
            <span className="mt-1 block text-xs leading-relaxed text-[#786593]">
              El horario será una propuesta hasta que el negocio lo acepte.
            </span>
          </span>
        </div>
      ) : null}
      {!isProduct && Number.isFinite(parsedDuration) && parsedDuration > 0 ? (
        <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-[#FAF4FF] p-4">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#7427D5]" aria-hidden />
          <span>
            <span className="block text-sm font-extrabold text-[#261743]">Duración estimada</span>
            <span className="mt-1 block text-xs text-[#786593]">{parsedDuration} minutos</span>
          </span>
        </div>
      ) : null}
      <section className="rounded-2xl border border-[#F1EAF6] bg-[#FFFCF9] p-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#8A72B2]">Modalidades activas</h3>
        {modalities.length === 0 ? (
          <p className="mt-2 text-xs text-[#8A72B2]">Sin modalidades seleccionadas.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {modalities.map((modality) => (
              <span
                key={modality}
                className="rounded-full bg-[#F3E8FF] px-3 py-1 text-[11px] font-extrabold text-[#54209E]"
              >
                {getCommercialModalityLabel(modality)}
              </span>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const toggleModality = (modality: CommercialModality) => {
    setModalities((current) => (
      current.includes(modality)
        ? current.filter((item) => item !== modality)
        : [...current, modality]
    ));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const auth = await getWebAuth();
      await updateOwnedCommercialOffer(auth, businessId, offerId, {
        title: title.trim(),
        description: description.trim() || null,
        base_price_amount: price.trim() ? Number(price) : null,
        stock_quantity: stock.trim() ? Number(stock) : null,
        duration_minutes: duration.trim() ? Number(duration) : null,
        requires_booking: requiresBooking,
        is_available: isAvailable,
      });
      await updateOwnedCommercialOfferModalities(auth, businessId, offerId, {
        modalities,
      });
      setNotice('Oferta guardada.');
      onSaved();
    } catch (saveError) {
      setNotice(actionError(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="mb-4 flex items-start gap-2 rounded-xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] to-[#FFFCF9] px-3 py-2 text-xs leading-snug text-[#786593] md:mb-5">
        <ShoppingBag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7427D5]" aria-hidden />
        <span>
          Los cambios se reflejan al instante en la vista previa.
          {isProduct ? ' Ajusta precio e inventario para tus clientes.' : ' Define duración, reserva y modalidades del servicio.'}
        </span>
      </p>

      <div className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20">
          <article className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.08)]">
            {galleryImages.length > 0 ? (
              <>
                <div className="relative aspect-[5/4] bg-[#F6EAFE] sm:aspect-[16/10] lg:aspect-[5/4]">
                  {activeImageUrl ? (
                    <img src={activeImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                {galleryImages.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto border-t border-[#F1EAF6] p-3 [scrollbar-width:thin]">
                    {galleryImages.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        aria-label={`Ver imagen ${index + 1}`}
                        aria-pressed={index === safeImageIndex}
                        className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${
                          index === safeImageIndex
                            ? 'border-[#7427D5] ring-2 ring-[#E8D1F1]'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={image.url!} alt="" className="h-14 w-14 object-cover sm:h-16 sm:w-16" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex aspect-[5/4] items-center justify-center bg-[#F6EAFE] text-[#7427D5] sm:aspect-[16/10] lg:aspect-[5/4]">
                {isProduct ? <Package className="h-12 w-12" aria-hidden /> : <Wrench className="h-12 w-12" aria-hidden />}
              </div>
            )}

            <div className="border-t border-[#F1EAF6] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[#7A579D]">
                {isProduct ? <ShoppingBag className="h-4 w-4" aria-hidden /> : <Wrench className="h-4 w-4" aria-hidden />}
                <span className="text-[10px] font-extrabold uppercase tracking-wide">
                  {isProduct ? 'Producto' : 'Servicio'}
                </span>
                <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-extrabold leading-snug text-[#261743] sm:text-xl [overflow-wrap:anywhere]">
                {title.trim() || 'Sin nombre'}
              </h2>
              <p className="mt-1 text-base font-extrabold text-[#7427D5] sm:text-lg">
                {Number.isFinite(parsedPrice) && price.trim() ? moneyCop(parsedPrice) : 'Precio pendiente'}
              </p>
            </div>
          </article>

          <div className="hidden space-y-3 lg:block">{previewMeta}</div>
        </aside>

        <form
          onSubmit={save}
          className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] shadow-[0_10px_30px_rgba(116,39,213,0.08)]"
        >
          <div className="border-b border-[#F1EAF6] bg-white/90 px-4 py-4 backdrop-blur sm:px-5">
            <h2 className="text-base font-extrabold text-[#261743]">Editar {isProduct ? 'producto' : 'servicio'}</h2>
            <p className="mt-1 text-xs text-[#786593]">Completa la información visible en tu catálogo.</p>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <section className="space-y-4">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Información básica</h3>
              <div>
                <label className={offerFieldLabelClass} htmlFor="offer-title">Nombre</label>
                <input
                  id="offer-title"
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={fieldClass}
                  required
                  maxLength={200}
                  placeholder="Nombre de la oferta"
                />
              </div>
              <div>
                <label className={offerFieldLabelClass} htmlFor="offer-description">Descripción</label>
                <textarea
                  id="offer-description"
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClass} min-h-[100px] resize-y`}
                  rows={4}
                  maxLength={6000}
                  placeholder="Describe tu oferta"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Precio y {isProduct ? 'inventario' : 'duración'}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={offerFieldLabelClass} htmlFor="offer-price">Precio (COP)</label>
                  <input
                    id="offer-price"
                    name="price"
                    type="number"
                    min="0"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className={fieldClass}
                  />
                </div>
                {isProduct ? (
                  <div>
                    <label className={offerFieldLabelClass} htmlFor="offer-stock">Inventario</label>
                    <input
                      id="offer-stock"
                      name="stock"
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(event) => setStock(event.target.value)}
                      className={fieldClass}
                      placeholder="Unidades disponibles"
                    />
                  </div>
                ) : (
                  <div>
                    <label className={offerFieldLabelClass} htmlFor="offer-duration">Duración (minutos)</label>
                    <input
                      id="offer-duration"
                      name="duration"
                      type="number"
                      min="0"
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      className={fieldClass}
                      placeholder="Ej. 45"
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Disponibilidad</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8D1F1] bg-white px-3 py-3 text-sm font-semibold text-[#38294E]">
                  <input
                    type="checkbox"
                    checked={requiresBooking}
                    onChange={(event) => setRequiresBooking(event.target.checked)}
                    className="rounded border-[#C9A8E8] text-[#7427D5]"
                  />
                  Requiere reserva
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8D1F1] bg-white px-3 py-3 text-sm font-semibold text-[#38294E]">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(event) => setIsAvailable(event.target.checked)}
                    className="rounded border-[#C9A8E8] text-[#7427D5]"
                  />
                  Disponible para clientes
                </label>
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Modalidades</h3>
              <p className="mt-1 mb-3 text-xs text-[#786593]">Selecciona cómo pueden solicitar esta oferta.</p>
              <ButtonRow modalities={modalityOptions} selected={modalities} onToggle={toggleModality} />
            </section>

            <div className="space-y-3 lg:hidden">{previewMeta}</div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#F1EAF6] bg-[#FFFCF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            {notice ? <p className="text-center text-xs font-semibold text-[#5E1ABF] sm:text-left">{notice}</p> : (
              <p className="text-center text-xs text-[#B8A5D6] sm:text-left">Guarda para publicar los cambios en el catálogo.</p>
            )}
            <button type="submit" className={`${primaryButtonClass} w-full sm:w-auto sm:min-w-[11rem]`} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ButtonRow({
  modalities,
  selected,
  onToggle,
}: {
  modalities: CommercialModality[];
  selected: CommercialModality[];
  onToggle: (modality: CommercialModality) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {modalities.map((modality) => {
        const active = selected.includes(modality);
        return (
          <button
            key={modality}
            type="button"
            onClick={() => onToggle(modality)}
            className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
              active
                ? 'border-[#7427D5] bg-[#7427D5] text-white shadow-sm'
                : 'border-[#E7DDF2] bg-white text-[#5E506B] hover:border-[#C9A8E8]'
            }`}
          >
            {getCommercialModalityLabel(modality)}
          </button>
        );
      })}
    </div>
  );
}

const verificationFieldLabel = 'mb-1.5 block text-[11px] font-extrabold text-[#4E3B68]';

function verificationStatusPresentation(status: CommercialVerificationStatus): {
  label: string;
  className: string;
  hint: string;
  icon: 'check' | 'alert' | 'pending';
} {
  switch (status) {
    case 'verified':
      return {
        label: 'Verificado',
        className: 'bg-[#EBFBEE] text-[#177245]',
        hint: 'Tu negocio ya cuenta con verificación aprobada.',
        icon: 'check',
      };
    case 'pending_review':
      return {
        label: 'En revisión',
        className: 'bg-[#FFF4E6] text-[#9A5B00]',
        hint: 'Recibimos tu solicitud. Te avisaremos cuando haya una respuesta.',
        icon: 'pending',
      };
    case 'requires_correction':
      return {
        label: 'Requiere corrección',
        className: 'bg-[#FFF5F5] text-[#C92A2A]',
        hint: 'Actualiza los datos y vuelve a enviar la solicitud.',
        icon: 'alert',
      };
    case 'rejected':
      return {
        label: 'Rechazada',
        className: 'bg-[#FFF5F5] text-[#C92A2A]',
        hint: 'La verificación no fue aprobada. Revisa los datos y el soporte.',
        icon: 'alert',
      };
    case 'suspended':
      return {
        label: 'Suspendida',
        className: 'bg-[#F1F0F3] text-[#6D6875]',
        hint: 'La verificación está suspendida. Contacta soporte si necesitas ayuda.',
        icon: 'alert',
      };
    case 'draft':
      return {
        label: 'Borrador',
        className: 'bg-[#F6EAFE] text-[#5E1ABF]',
        hint: 'Completa el formulario y envíalo cuando esté listo.',
        icon: 'pending',
      };
    default:
      return {
        label: 'Sin solicitud',
        className: 'bg-[#F6EAFE] text-[#5E1ABF]',
        hint: 'Completa los datos legales para solicitar la verificación del negocio.',
        icon: 'pending',
      };
  }
}

export function ManageVerification({ businessId }: { businessId: string }) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return getOwnedCommercialVerification(auth, businessId);
  }, [businessId]);
  const [notice, setNotice] = useState('');

  const save = async (event: FormEvent<HTMLFormElement>, submit: boolean) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const auth = await getWebAuth();
      await saveOwnedCommercialVerification(auth, businessId, {
        applicant_type: String(form.get('applicant_type') || 'natural') as 'natural' | 'legal',
        legal_name: String(form.get('legal_name') || ''),
        tax_id: String(form.get('tax_id') || ''),
        business_address: String(form.get('business_address') || ''),
        review_note: String(form.get('review_note') || ''),
        declaration_accepted: true,
        declaration_version: 'web-1',
      });
      if (submit) await submitOwnedCommercialVerification(auth, businessId);
      setNotice(submit ? 'Verificación enviada.' : 'Borrador guardado.');
      loaded.reload();
    } catch (saveError) {
      setNotice(actionError(saveError));
    }
  };

  const verificationStatus = loaded.data?.verification_status ?? 'not_requested';
  const status = verificationStatusPresentation(verificationStatus);
  const request = loaded.data?.request ?? null;
  const StatusIcon = status.icon === 'check' ? ShieldCheck : ShieldAlert;

  return (
    <CommercialShell title="Verificación del negocio" backHref={`/app/beeservices/manage/${businessId}`} wide compact>
      <StatusLine loading={loaded.loading} error={loaded.error} />
      {!loaded.loading && loaded.data ? (
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-[#261743]">Identidad del negocio</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#786593]">
                Revisamos tus datos legales para generar confianza con compradores y reservas formales.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${status.className}`}>
                <StatusIcon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Estado actual</p>
                <p className="mt-0.5 text-sm font-extrabold text-[#261743]">{status.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#786593]">{status.hint}</p>
              </div>
            </div>
            <span className={`self-start rounded-full px-3 py-1 text-[11px] font-extrabold sm:self-center ${status.className}`}>
              {status.label}
            </span>
          </div>

          {request?.review_reason_text ? (
            <div className="rounded-2xl border border-[#FFD8D8] bg-[#FFF5F5] px-4 py-3 text-sm text-[#9B1C1C]">
              <p className="font-extrabold">Observación del revisor</p>
              <p className="mt-1 text-xs leading-relaxed [overflow-wrap:anywhere]">{request.review_reason_text}</p>
            </div>
          ) : null}

          <VerificationForm
            request={request}
            isEditable={request?.is_editable ?? true}
            notice={notice}
            onSave={save}
          />
        </div>
      ) : null}
    </CommercialShell>
  );
}

function VerificationForm({
  request,
  isEditable,
  notice,
  onSave,
}: {
  request: CommercialVerificationRequest | null;
  isEditable: boolean;
  notice: string;
  onSave: (event: FormEvent<HTMLFormElement>, submit: boolean) => void;
}) {
  const [applicantType, setApplicantType] = useState<'natural' | 'legal'>(request?.applicant_type || 'natural');

  useEffect(() => {
    setApplicantType(request?.applicant_type || 'natural');
  }, [request]);

  const submitForReview = (event: MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;
    if (!form.reportValidity()) return;
    onSave({ preventDefault() {}, currentTarget: form } as FormEvent<HTMLFormElement>, true);
  };

  return (
    <form
      className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] shadow-[0_10px_30px_rgba(116,39,213,0.08)]"
      onSubmit={(event) => onSave(event, false)}
    >
      <div className="border-b border-[#F1EAF6] bg-white/85 px-4 py-4 backdrop-blur sm:px-5">
        <h3 className="text-base font-extrabold text-[#261743]">Datos de verificación</h3>
        <p className="mt-1 text-xs text-[#786593]">
          {isEditable ? 'Puedes guardar un borrador y enviarlo cuando esté completo.' : 'La solicitud ya no admite cambios en línea.'}
        </p>
      </div>

      <fieldset disabled={!isEditable} className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Tipo de solicitante</p>
          <input type="hidden" name="applicant_type" value={applicantType} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([
              { value: 'natural' as const, label: 'Persona natural', Icon: User },
              { value: 'legal' as const, label: 'Persona jurídica', Icon: Building2 },
            ]).map(({ value, label, Icon }) => {
              const selected = applicantType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setApplicantType(value)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    selected
                      ? 'border-[#7427D5] bg-[#F6EAFE] shadow-sm'
                      : 'border-[#E7DDF2] bg-white hover:border-[#C9A8E8]'
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-white text-[#7427D5]' : 'bg-[#FAF4FF] text-[#8A72B2]'}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-sm font-extrabold text-[#261743]">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={verificationFieldLabel}>
            {applicantType === 'legal' ? 'Razón social' : 'Nombre legal'}
            <input
              name="legal_name"
              defaultValue={request?.legal_name || ''}
              placeholder={applicantType === 'legal' ? 'Ej. Appsmartt SAS' : 'Ej. Juan Pérez'}
              className={fieldClass}
              required
            />
          </label>
          <label className={verificationFieldLabel}>
            {applicantType === 'legal' ? 'NIT' : 'Cédula'}
            <input
              name="tax_id"
              defaultValue={request?.tax_id || ''}
              placeholder={applicantType === 'legal' ? '900.123.456-7' : '1.234.567.890'}
              className={fieldClass}
              required
            />
          </label>
        </div>

        <label className={verificationFieldLabel}>
          Dirección del negocio
          <input
            name="business_address"
            defaultValue={request?.business_address || ''}
            placeholder="Calle, ciudad, departamento"
            className={fieldClass}
            required
          />
        </label>

        <label className={verificationFieldLabel}>
          Nota para el revisor (opcional)
          <textarea
            name="review_note"
            defaultValue={request?.review_note || ''}
            placeholder="Contexto útil para la revisión"
            className={`${fieldClass} min-h-[88px] resize-y`}
            rows={3}
          />
        </label>

        <label className="flex cursor-pointer gap-3 rounded-xl border border-[#E8D1F1] bg-[#FFFCF9] p-3 sm:items-start">
          <input type="checkbox" required defaultChecked className="mt-0.5 h-4 w-4 rounded border-[#C9A8E8] text-[#7427D5]" />
          <span className="text-xs leading-relaxed text-[#594C67]">
            Declaro que la información es veraz y autorizo su revisión para fines de verificación del negocio.
          </span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-[#F1EAF6] bg-[#FFFCF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        {notice ? (
          <p className="text-xs font-semibold text-[#5E1ABF]">{notice}</p>
        ) : (
          <p className="text-xs text-[#B8A5D6]">Guarda borrador o envía cuando todo esté correcto.</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="submit" className={`${secondaryButtonClass} w-full sm:w-auto`} disabled={!isEditable}>
            Guardar borrador
          </button>
          <button
            type="button"
            className={`${primaryButtonClass} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
            disabled={!isEditable}
            onClick={submitForReview}
          >
            <Send className="h-4 w-4" aria-hidden />
            Enviar a revisión
          </button>
        </div>
      </div>
    </form>
  );
}

const METRIC_GRAINS = [
  { key: 'day', label: 'Día' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
] as const;

const WEEKDAY_LABELS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function todayIsoDate(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftAnchor(anchor: string, grain: 'day' | 'week' | 'month', direction: -1 | 1): string {
  const [year, month, day] = anchor.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (grain === 'day') date.setDate(date.getDate() + direction);
  else if (grain === 'week') date.setDate(date.getDate() + (direction * 7));
  else date.setMonth(date.getMonth() + direction);
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

function bucketLabel(dateValue: string, grain: 'day' | 'week' | 'month'): string {
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (grain === 'week') return WEEKDAY_LABELS[date.getDay()] || '';
  return String(date.getDate());
}

function formatUnits(units: number): string {
  const rounded = Math.round(Number(units) * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString('es-CO')
    : rounded.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  return rounded === 1 ? `${text} unidad` : `${text} unidades`;
}

export function ManageMetrics({ businessId }: { businessId: string }) {
  const [grain, setGrain] = useState<'day' | 'week' | 'month'>('month');
  const [anchor, setAnchor] = useState(todayIsoDate);
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return getOwnedBusinessSalesMetrics(auth, businessId, { grain, anchor });
  }, [businessId, grain, anchor]);

  const periodEnd = loaded.data?.period.end || anchor;
  const canGoNext = periodEnd < todayIsoDate();

  return (
    <CommercialShell
      title="Métricas"
      description="Ventas completadas del negocio"
      backHref={`/app/beeservices/manage/${businessId}`}
      wide
    >
      <div className="flex w-full max-w-md rounded-2xl bg-white p-1 shadow-[0_8px_24px_rgba(116,39,213,0.05)]">
        {METRIC_GRAINS.map((option) => {
          const selected = option.key === grain;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              className={`h-10 flex-1 rounded-xl text-sm font-extrabold transition ${selected ? 'bg-[#7427D5] text-white' : 'text-[#6D5C7B] hover:bg-[#F6F1FA]'}`}
              onClick={() => setGrain(option.key)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E7DDF2] bg-white text-[#7427D5]"
          aria-label="Periodo anterior"
          onClick={() => setAnchor((current) => shiftAnchor(current, grain, -1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 text-center text-base font-extrabold text-[#261743]">
          {loaded.data?.period.label || 'Cargando periodo'}
        </p>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E7DDF2] bg-white text-[#7427D5] disabled:bg-[#F7F4FA] disabled:text-[#C8B8D8]"
          aria-label="Periodo siguiente"
          disabled={!canGoNext}
          onClick={() => setAnchor((current) => shiftAnchor(current, grain, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loaded.loading && !loaded.data ? <MetricsSkeleton /> : null}
      {loaded.error ? <p className="mt-4 text-sm text-rose-600">{loaded.error}</p> : null}
      {loaded.data ? (
        <div className={loaded.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <MetricsBody metrics={loaded.data} grain={grain} />
        </div>
      ) : null}
    </CommercialShell>
  );
}

function MetricsSkeleton() {
  return (
    <div className="mt-4 space-y-4" aria-busy="true" aria-label="Cargando métricas">
      <div className="grid gap-3 sm:grid-cols-2">
        <PulseBlock className="h-28 rounded-[18px]" />
        <PulseBlock className="h-28 rounded-[18px]" />
      </div>
      <PulseBlock className="h-64 rounded-[18px]" />
    </div>
  );
}

function MetricsBody({
  metrics,
  grain,
}: {
  metrics: BusinessSalesMetrics;
  grain: 'day' | 'week' | 'month';
}) {
  const salesCount = Number(metrics.totals.sales_count) || 0;
  const maxBucketAmount = Math.max(0, ...metrics.buckets.map((bucket) => Number(bucket.amount) || 0));

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-[18px] border border-[#E7DDF2] bg-white p-5 shadow-[0_8px_24px_rgba(116,39,213,0.05)]">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#786593]">Dinero ganado</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#261743]">{moneyCop(metrics.totals.amount)}</p>
          <p className="mt-2 text-xs text-[#88709E]">{metrics.period.label}</p>
        </article>
        <article className="rounded-[18px] border border-[#E7DDF2] bg-white p-5 shadow-[0_8px_24px_rgba(116,39,213,0.05)]">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#786593]">Ventas</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#261743]">{salesCount}</p>
          <p className="mt-2 text-xs text-[#88709E]">Completadas</p>
        </article>
      </div>

      {salesCount === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#E7DDF2] bg-white px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
            <BarChart3 className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-extrabold text-[#261743]">No hay ventas completadas en este periodo</p>
          <p className="mt-1 text-xs text-[#786593]">Cuando se complete una venta, el total y el detalle aparecerán aquí.</p>
        </div>
      ) : null}

      <div className={`grid items-start gap-4 ${grain === 'day' ? '' : 'lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]'}`}>
        {grain === 'day' ? null : (
          <section className="rounded-[18px] border border-[#E7DDF2] bg-white p-5">
            <h2 className="text-base font-extrabold text-[#261743]">Ventas por día</h2>
            <p className="mt-1 text-xs text-[#786593]">Altura según el dinero ganado cada día.</p>
            <div className="mt-4 flex items-end gap-1 overflow-x-auto pb-1">
              {metrics.buckets.map((bucket) => {
                const amount = Number(bucket.amount) || 0;
                const height = maxBucketAmount > 0 ? Math.max(8, Math.round((amount / maxBucketAmount) * 120)) : 8;
                return (
                  <div key={bucket.date} className="flex w-7 shrink-0 flex-col items-center" title={`${bucketLabel(bucket.date, grain)} · ${moneyCop(amount)}`}>
                    <div className="flex h-[120px] items-end">
                      <span
                        className={`block w-3.5 rounded-lg ${amount > 0 ? 'bg-[#7427D5]' : 'bg-[#E7DFF0]'}`}
                        style={{ height }}
                      />
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-[#786593]">{bucketLabel(bucket.date, grain)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-[18px] border border-[#E7DDF2] bg-white p-5">
          <h2 className="text-base font-extrabold text-[#261743]">Más vendidos</h2>
          <p className="mt-1 text-xs leading-5 text-[#786593]">Productos y servicios con más unidades en este periodo.</p>
          {metrics.top_offers.length === 0 ? (
            <p className="mt-4 text-sm text-[#6D5C7B]">Todavía no hay productos o servicios vendidos en este periodo.</p>
          ) : (
            <ul className="mt-3">
              {metrics.top_offers.map((offer, index) => (
                <li key={`${offer.id || offer.title}-${index}`} className="flex items-center gap-3 border-b border-[#F1EAF6] py-3 last:border-b-0 last:pb-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F6EAFE] text-sm font-extrabold text-[#7427D5]">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-[#261743]">{offer.title}</span>
                    <span className="mt-0.5 block text-xs text-[#786593]">
                      {offer.offer_kind === 'service' ? 'Servicio' : 'Producto'} · {formatUnits(offer.units)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-[#261743]">{moneyCop(offer.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

type CommercialRequestFilterKey =
  | 'all'
  | 'needs_business'
  | 'waiting_customer'
  | 'payment_pending'
  | 'payment_review'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

const COMMERCIAL_REQUEST_FILTERS: Array<{
  key: CommercialRequestFilterKey;
  label: string;
  statuses?: Array<CommercialRequestListItem['status']>;
}> = [
  { key: 'all', label: 'Todas' },
  { key: 'needs_business', label: 'Por atender', statuses: ['submitted', 'under_review'] },
  { key: 'waiting_customer', label: 'Cliente', statuses: ['proposal_sent', 'accepted'] },
  { key: 'payment_pending', label: 'Pago pendiente', statuses: ['payment_pending'] },
  { key: 'payment_review', label: 'Comprobante', statuses: ['payment_submitted'] },
  { key: 'in_progress', label: 'En proceso', statuses: ['confirmed'] },
  { key: 'completed', label: 'Completadas', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cerradas', statuses: ['cancelled', 'rejected', 'expired'] },
];

const STATUS_TONE_CLASS: Record<CommercialRequestListStatusTone, string> = {
  neutral: 'bg-[#F4EDFC] text-[#54209E]',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-700',
};

function RequestTypeIcon({
  requestType,
}: {
  requestType: CommercialRequestListItem['request_type'];
}) {
  if (requestType === 'booking_request' || requestType === 'mixed_request') {
    return <CalendarDays className="h-[19px] w-[19px] text-[#7427D5]" />;
  }
  if (requestType === 'service_request') {
    return <Wrench className="h-[19px] w-[19px] text-[#7427D5]" />;
  }
  return <Package className="h-[19px] w-[19px] text-[#7427D5]" />;
}

export function ManageRequests({ businessId, embedded = false }: { businessId: string; embedded?: boolean }) {
  const [activeFilter, setActiveFilter] = useState<CommercialRequestFilterKey>('all');
  const selectedFilter = COMMERCIAL_REQUEST_FILTERS.find((item) => item.key === activeFilter)
    || COMMERCIAL_REQUEST_FILTERS[0];

  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return (await getOwnedCommercialRequests(auth, businessId, {
      limit: 50,
      statuses: selectedFilter.statuses,
    })).requests;
  }, [businessId, selectedFilter.key]);

  const requests = loaded.data || [];

  const attentionCount = useMemo(() => (
    requests.filter((request) => (
      request.status === 'submitted' || request.status === 'under_review'
    )).length
  ), [requests]);

  const body = (
    <ManageRequestsBody
      businessId={businessId}
      requests={requests}
      loading={loaded.loading}
      error={loaded.error}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      attentionCount={attentionCount}
      embedded={embedded}
    />
  );

  if (embedded) return <div className="pb-4">{body}</div>;

  return (
    <CommercialShell title="Solicitudes del negocio" backHref={`/app/beeservices/manage/${businessId}`}>
      {body}
    </CommercialShell>
  );
}

function ManageRequestsBody({
  businessId,
  requests,
  loading,
  error,
  activeFilter,
  onFilterChange,
  attentionCount,
  embedded,
}: {
  businessId: string;
  requests: CommercialRequestListItem[];
  loading: boolean;
  error: string;
  activeFilter: CommercialRequestFilterKey;
  onFilterChange: (key: CommercialRequestFilterKey) => void;
  attentionCount: number;
  embedded: boolean;
}) {
  return (
    <div className="space-y-5">
      {!embedded ? (
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#88709E]">
            Operación comercial
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#38294E]">Solicitudes</h1>
        </div>
      ) : null}

      <div className="flex items-center gap-4 overflow-hidden rounded-[20px] bg-[#261743] p-[18px]">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[17px] font-extrabold text-white">Controla cada venta</p>
          <p className="mt-1.5 text-[13px] leading-[19px] text-[#DCC8FF]">
            Compras, servicios y reservas que requieren seguimiento.
          </p>
        </div>
        <div className="flex min-w-[76px] flex-col items-center rounded-2xl border border-[#5A3D87] bg-[#3C2860] px-2.5 py-2.5">
          <span className="text-[22px] font-extrabold leading-none text-white">
            {loading ? '…' : requests.length}
          </span>
          <span className="mt-0.5 text-[10px] font-extrabold text-[#DCC8FF]">
            {requests.length === 1 ? 'solicitud' : 'solicitudes'}
          </span>
        </div>
      </div>

      {attentionCount > 0 ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#F0D9FF] bg-[#FAF4FF] px-4 py-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7427D5]" aria-hidden />
          <p className="text-sm font-semibold text-[#4E346F]">
            {attentionCount === 1
              ? 'Tienes 1 solicitud que requiere respuesta.'
              : `Tienes ${attentionCount} solicitudes que requieren respuesta.`}
          </p>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-extrabold text-[#6D5C7B]">Filtrar por estado</p>
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {COMMERCIAL_REQUEST_FILTERS.map((filter) => {
            const isActive = filter.key === activeFilter;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => onFilterChange(filter.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                  isActive
                    ? 'border-[#7427D5] bg-[#7427D5] text-white shadow-sm'
                    : 'border-[#E7DDF2] bg-white text-[#5E506B] hover:border-[#C9A8E8] hover:bg-[#FCFAFF]'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="rounded-[18px] border border-[#E7DDF2] bg-white p-4">
          <ListSkeleton />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <RequestList businessId={businessId} requests={requests} />
      ) : null}
    </div>
  );
}

function RequestList({ businessId, requests }: { businessId: string; requests: CommercialRequestListItem[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#DDD0EA] bg-white px-6 py-12 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
          <ClipboardList className="h-7 w-7" />
        </span>
        <p className="mt-4 text-base font-extrabold text-[#38294E]">No hay solicitudes aquí</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#786593]">
          Las solicitudes que coincidan con este filtro aparecerán en este espacio.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => {
        const statusTone = getCommercialRequestListStatusTone(request.status);
        const needsAttention = (
          request.status === 'submitted' || request.status === 'under_review'
        );
        const modality = request.requested_modality as CommercialModality | null;

        return (
          <li key={request.id}>
            <Link
              href={`/app/beeservices/manage/${businessId}/requests/${request.id}`}
              className={`block rounded-[18px] border bg-white p-4 shadow-[0_8px_24px_rgba(116,39,213,0.05)] transition hover:border-[#C9A8E8] hover:shadow-[0_10px_28px_rgba(116,39,213,0.08)] ${
                needsAttention
                  ? 'border-[#DCC4F5] ring-1 ring-[#E8D1F8]'
                  : 'border-[#E7DDF2]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6EAFE]">
                  <RequestTypeIcon requestType={request.request_type} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#8A72B2]">
                        {getCommercialRequestListTypeLabel(request.request_type)}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-extrabold text-[#261743]">
                        {request.code}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#8B769D]" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${STATUS_TONE_CLASS[statusTone]}`}>
                      {getCommercialRequestListStatusLabel(request.status)}
                    </span>
                    <span className="text-[11px] font-semibold text-[#8A72B2]">
                      {getCommercialRequestListItemCountLabel(request.item_count)}
                    </span>
                  </div>

                  <div className="mt-3 h-px bg-[#F1EAF6]" />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#786593]">
                    <span className="min-w-0 truncate font-medium">
                      {modality
                        ? getCommercialModalityLabel(modality)
                        : 'Modalidad por confirmar'}
                    </span>
                    <span className="shrink-0">
                      {formatCommercialRequestListDate(request.created_at)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-[#F1EAF6] pt-3">
                    <span className="text-xs font-extrabold text-[#88709E]">Total</span>
                    <span className="text-base font-extrabold text-[#261743]">
                      {formatCommercialRequestListAmount(
                        request.total_amount,
                        request.currency_code,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ManageRequestDetail({ businessId, requestId }: { businessId: string; requestId: string }) {
  const loaded = useAsync(async () => {
    const auth = await getWebAuth();
    return (await getCommercialRequest(auth, requestId)).request;
  }, [requestId]);
  const [notice, setNotice] = useState('');

  const act = async (action: 'start_review' | 'accept' | 'reject' | 'complete') => {
    try {
      const auth = await getWebAuth();
      if (action === 'complete') await completeCommercialRequest(auth, requestId, {});
      else await transitionCommercialRequest(auth, requestId, { action });
      setNotice('Solicitud actualizada.');
      loaded.reload();
    } catch (saveError) {
      setNotice(actionError(saveError));
    }
  };

  return (
    <CommercialShell title="Solicitud" backHref={`/app/beeservices/manage/${businessId}/requests`}>
      <StatusLine loading={loaded.loading} error={loaded.error} />
      {loaded.data ? <RequestBody request={loaded.data} onAct={act} notice={notice} /> : null}
    </CommercialShell>
  );
}

function RequestBody({
  request,
  onAct,
  notice,
}: {
  request: CommercialRequestDetail;
  onAct: (action: 'start_review' | 'accept' | 'reject' | 'complete') => void;
  notice: string;
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold">{request.code} · {request.status}</p>
      <p className="text-[#594C67]">{request.customer_note || 'Sin nota del cliente'}</p>
      <ul className="space-y-2">
        {request.items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[#F0EAF3] bg-white px-3 py-2">
            {item.title} × {item.quantity} · {moneyCop(item.line_total_amount)}
          </li>
        ))}
      </ul>
      <p>Total {moneyCop(request.total_amount)}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass} onClick={() => onAct('start_review')}>Revisar</button>
        <button type="button" className={primaryButtonClass} onClick={() => onAct('accept')}>Aceptar</button>
        <button type="button" className={secondaryButtonClass} onClick={() => onAct('reject')}>Rechazar</button>
        <button type="button" className={secondaryButtonClass} onClick={() => onAct('complete')}>Completar</button>
      </div>
      {notice ? <p className="text-[#5E1ABF]">{notice}</p> : null}
    </div>
  );
}
