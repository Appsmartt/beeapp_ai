'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  Edit3,
  Mail,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  Phone,
  Plus,
  RefreshCw,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  createCommercialRequest,
  getCommercialCities,
  getCommercialCountries,
  getCommercialRequests,
  getOwnedCommercialProfiles,
  getPublicCommercialCategories,
  getPublicCommercialOffer,
  getPublicCommercialOffers,
  getPublicCommercialProfile,
  getPublicCommercialProfiles,
  openCommercialProfileChat,
} from '@beeapp/api-client';
import type {
  CommercialCategory,
  CommercialModality,
  CommercialOfferType,
  CommercialPaymentPolicy,
  CommercialProfileHour,
  CommercialPublicOffer,
  CommercialPublicProfile,
  CommercialRequestListItem,
} from '@beeapp/shared-types';
import { getWebAuth } from '@/lib/client/webAuth';
import {
  addCartLine,
  getCartTotalQuantity,
  getOrCreateCartIdempotencyKey,
  readBusinessCart,
  removeCartLine,
  resetCartIdempotencyKey,
  updateCartLine,
  updateCartLineQuantity,
  writeBusinessCart,
  type WebBusinessCart,
} from '@/lib/client/businessCart';
import { ListSkeleton } from '@/components/client/RouteSkeleton';
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
  CommercialShell,
  actionError,
  fieldClass,
  moneyCop,
  primaryButtonClass,
  secondaryButtonClass,
} from '../CommercialShell';
import CustomerRequestDetailView from './CustomerRequestDetailView';

const MODALITY_LABEL: Record<CommercialModality, string> = {
  at_establishment: 'En el local',
  in_person: 'Presencial',
  virtual: 'Virtual',
  home_visit: 'Visita a domicilio',
  delivery: 'Entrega a domicilio',
  pickup: 'Recoger en negocio',
  phone_call: 'Llamada telefónica',
  buddy_chat: 'Chat Buddy',
};

const PAYMENT_POLICY_LABEL: Record<CommercialPaymentPolicy, string> = {
  not_required: 'No requiere pago anticipado',
  required_before_confirmation: 'Pago requerido antes de confirmar',
  required_after_service: 'Pago al finalizar el servicio',
  to_be_agreed: 'Pago a convenir con el negocio',
};

function initialsOf(value: string): string {
  return (
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'B'
  );
}

function formatOfferPrice(offer: CommercialPublicOffer): string {
  if (offer.pricing_strategy === 'free') return 'Gratis';
  if (offer.pricing_strategy === 'to_be_confirmed') return 'Precio por confirmar';
  if (offer.pricing_strategy === 'starting_at') {
    return offer.base_price_amount != null
      ? `Desde ${moneyCop(offer.base_price_amount)}`
      : 'Precio desde por confirmar';
  }
  return offer.base_price_amount != null ? moneyCop(offer.base_price_amount) : 'Precio por confirmar';
}

function computeDiscountPercent(offer: CommercialPublicOffer): number | null {
  if (offer.discount_percent && offer.discount_percent > 0) {
    return Math.round(offer.discount_percent);
  }
  if (
    offer.original_price_amount != null
    && offer.base_price_amount != null
    && offer.original_price_amount > offer.base_price_amount
    && offer.original_price_amount > 0
  ) {
    return Math.round(
      ((offer.original_price_amount - offer.base_price_amount) / offer.original_price_amount) * 100,
    );
  }
  return null;
}

export function isBusinessProfileOpenNow(profile: CommercialPublicProfile | null): {
  isOpen: boolean;
  label: string;
} {
  if (!profile) return { isOpen: true, label: 'Disponible' };
  if (profile.is_available === false) {
    return { isOpen: false, label: 'Cerrado temporalmente' };
  }
  if (typeof profile.is_open_now === 'boolean') {
    return {
      isOpen: profile.is_open_now,
      label: profile.is_open_now ? 'Abierto ahora' : 'Cerrado en este horario',
    };
  }
  const hours = profile.hours || [];
  if (hours.length === 0) {
    return { isOpen: true, label: 'Abierto' };
  }
  const tz = profile.timezone || 'America/Bogota';
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '00';
    const minStr = parts.find((p) => p.type === 'minute')?.value || '00';
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const dayOfWeek = dayMap[weekdayStr] ?? now.getDay();
    const rule = hours.find((h) => h.day_of_week === dayOfWeek);
    if (!rule || rule.is_closed || !rule.opens_at || !rule.closes_at) {
      return { isOpen: false, label: 'Cerrado hoy' };
    }
    const currentHm = `${hourStr.padStart(2, '0')}:${minStr.padStart(2, '0')}`;
    const openHm = rule.opens_at.slice(0, 5);
    const closeHm = rule.closes_at.slice(0, 5);
    const isOpen = currentHm >= openHm && currentHm <= closeHm;
    return {
      isOpen,
      label: isOpen ? `Abierto (${openHm} - ${closeHm})` : `Cerrado · Abre ${openHm}`,
    };
  } catch {
    return { isOpen: true, label: 'Abierto' };
  }
}

/* =========================================================================
 * 1. PublicResults
 * ========================================================================= */
export function PublicResults({ query }: { query: string }) {
  const [searchInput, setSearchInput] = useState(query || '');
  const [activeQuery, setActiveQuery] = useState(query || '');
  const [offerType, setOfferType] = useState<CommercialOfferType | ''>('');
  const [modality, setModality] = useState<CommercialModality | ''>('');
  const [countryCode, setCountryCode] = useState('');
  const [city, setCity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [ordering, setOrdering] = useState<'recent' | 'name'>('recent');
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 12;

  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<CommercialCategory[]>([]);
  const [profiles, setProfiles] = useState<CommercialPublicProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearchInput(query || '');
    setActiveQuery(query || '');
    setPage(1);
  }, [query]);

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then((auth) => getCommercialCountries(auth))
      .then((res) => {
        if (active) setCountries((res.countries || []).map((c) => c.country_code));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      setCity('');
      return undefined;
    }
    let active = true;
    getWebAuth()
      .then((auth) => getCommercialCities(auth, countryCode))
      .then((res) => {
        if (active) setCities((res.cities || []).map((c) => c.city));
      })
      .catch(() => {
        if (active) setCities([]);
      });
    return () => {
      active = false;
    };
  }, [countryCode]);

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then((auth) =>
        getPublicCommercialCategories(auth, {
          country_code: countryCode || undefined,
          city: city || undefined,
          offer_type: offerType || undefined,
          limit: 50,
        }),
      )
      .then((res) => {
        if (active) setCategories(res.categories || []);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, [countryCode, city, offerType]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const response = await getPublicCommercialProfiles(auth, {
        search: activeQuery.trim() || undefined,
        offer_type: offerType || undefined,
        modality: modality || undefined,
        country_code: countryCode || undefined,
        city: city || undefined,
        category_id: categoryId || undefined,
        verified_only: verifiedOnly || undefined,
        delivery_only: deliveryOnly || undefined,
        ordering,
        limit: PAGE_LIMIT,
        offset: (page - 1) * PAGE_LIMIT,
      });
      setProfiles(response.profiles || []);
      setTotalCount(response.count ?? response.profiles?.length ?? 0);
    } catch (loadError) {
      setError(actionError(loadError));
    } finally {
      setLoading(false);
    }
  }, [
    activeQuery,
    categoryId,
    city,
    countryCode,
    deliveryOnly,
    modality,
    offerType,
    ordering,
    page,
    verifiedOnly,
  ]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT));

  return (
    <CommercialShell
      title="Resultados de búsqueda"
      description={
        activeQuery
          ? `Búsqueda: "${activeQuery}" (${totalCount} negocios)`
          : `${totalCount} negocios publicados`
      }
      backHref="/app/beeservices"
      wide
    >
      <div className="space-y-4">
        {/* Inline search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setActiveQuery(searchInput.trim());
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar negocio, producto o servicio..."
            className="min-w-0 flex-1 rounded-xl border border-[#E8D1F1] bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#7427D5]"
          />
          <button type="submit" className={`${primaryButtonClass} shrink-0`}>
            Buscar
          </button>
        </form>

        {/* Complete filters grid */}
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <select
            value={offerType}
            onChange={(e) => {
              setOfferType(e.target.value as CommercialOfferType | '');
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">Tipo: Todos</option>
            <option value="products">Productos</option>
            <option value="services">Servicios</option>
            <option value="mixed">Productos y servicios</option>
          </select>

          <select
            value={modality}
            onChange={(e) => {
              setModality(e.target.value as CommercialModality | '');
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">Modalidad: Todas</option>
            {(Object.entries(MODALITY_LABEL) as Array<[CommercialModality, string]>).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setCity('');
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">País: Todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={city}
            disabled={!countryCode}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">Ciudad: Todas</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">Categoría: Todas</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value as 'recent' | 'name');
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="recent">Orden: Más recientes</option>
            <option value="name">Orden: Nombre (A-Z)</option>
          </select>
        </div>

        {/* Toggle chips & removable filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setVerifiedOnly((v) => !v);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              verifiedOnly
                ? 'bg-[#7427D5] text-white'
                : 'border border-[#E2D6F0] bg-white text-[#5C4A78]'
            }`}
          >
            Solo verificados
          </button>

          <button
            type="button"
            onClick={() => {
              setDeliveryOnly((v) => !v);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              deliveryOnly
                ? 'bg-[#7427D5] text-white'
                : 'border border-[#E2D6F0] bg-white text-[#5C4A78]'
            }`}
          >
            Con domicilio
          </button>

          {activeQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setActiveQuery('');
                setPage(1);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-[#F4EDFC] px-3 py-1 text-xs font-bold text-[#7427D5]"
            >
              <span>Texto: {activeQuery}</span>
              <X className="h-3 w-3" />
            </button>
          ) : null}

          {offerType ? (
            <button
              type="button"
              onClick={() => setOfferType('')}
              className="inline-flex items-center gap-1 rounded-full bg-[#F4EDFC] px-3 py-1 text-xs font-bold text-[#7427D5]"
            >
              <span>Tipo: {offerType}</span>
              <X className="h-3 w-3" />
            </button>
          ) : null}

          {modality ? (
            <button
              type="button"
              onClick={() => setModality('')}
              className="inline-flex items-center gap-1 rounded-full bg-[#F4EDFC] px-3 py-1 text-xs font-bold text-[#7427D5]"
            >
              <span>{MODALITY_LABEL[modality]}</span>
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {loading ? <ListSkeleton rows={4} /> : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadProfiles()}
              className="mt-2 rounded-full bg-[#7427D5] px-4 py-1.5 text-xs font-semibold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading && !error && profiles.length === 0 ? (
          <p className="rounded-2xl border border-[#E7D9F0] bg-[#FAF7FD] p-6 text-center text-sm text-[#8A72B2]">
            No hay negocios que coincidan con estos filtros.
          </p>
        ) : null}

        <ul className="grid gap-3 sm:grid-cols-2">
          {profiles.map((profile) => (
            <li key={profile.id}>
              <Link
                href={`/app/beeservices/profile/${profile.id}`}
                className="flex items-start gap-3 rounded-2xl border border-[#F0EAF3] bg-white p-4 hover:border-[#C9A8E8] hover:bg-[#FCFAFD] transition"
              >
                {profile.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.logo_url}
                    alt={profile.display_name}
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F3EEFC] text-base font-extrabold text-[#7427D5]">
                    {initialsOf(profile.display_name)}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-extrabold text-[#261743]">
                      {profile.display_name}
                    </span>
                    {profile.is_verified ? (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-[#7427D5]" />
                    ) : null}
                  </div>

                  {profile.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#594C67]">{profile.description}</p>
                  ) : null}

                  <p className="mt-1 flex items-center gap-1 text-xs text-[#6C7892]">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {profile.city || 'Sin ciudad'}
                      {profile.country_code ? `, ${profile.country_code}` : ''}
                    </span>
                  </p>

                  {profile.modalities.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {profile.modalities.slice(0, 3).map((m) => (
                        <span
                          key={m}
                          className="rounded-full bg-[#F7F1FB] px-2 py-0.5 text-[10px] font-semibold text-[#7427D5]"
                        >
                          {MODALITY_LABEL[m] || m}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={secondaryButtonClass}
            >
              Anterior
            </button>
            <span className="text-xs font-bold text-[#5C4A78]">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={secondaryButtonClass}
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </div>
    </CommercialShell>
  );
}

/* =========================================================================
 * 2. PublicProfile
 * ========================================================================= */
export function PublicProfile({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CommercialPublicProfile | null>(null);
  const [offers, setOffers] = useState<CommercialPublicOffer[]>([]);
  const [tab, setTab] = useState<'products' | 'services' | 'info'>('products');
  const [cartCount, setCartCount] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setCartCount(getCartTotalQuantity());
  }, []);

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then(async (auth) => {
        const [profileResponse, offerResponse, ownedRes] = await Promise.all([
          getPublicCommercialProfile(auth, profileId),
          getPublicCommercialOffers(auth, profileId, { limit: 60 }),
          getOwnedCommercialProfiles(auth).catch(() => ({ profiles: [] })),
        ]);
        if (!active) return;
        const loadedProfile = profileResponse.profile;
        const loadedOffers = offerResponse.offers || [];
        setProfile(loadedProfile);
        setOffers(loadedOffers);
        setIsOwner((ownedRes.profiles || []).some((p) => p.id === profileId));

        const hasProducts = loadedOffers.some((o) => o.offer_kind === 'product');
        const hasServices = loadedOffers.some((o) => o.offer_kind === 'service');
        if (!hasProducts && hasServices) {
          setTab('services');
        }
      })
      .catch((loadError) => {
        if (active) setError(actionError(loadError));
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  const chat = async () => {
    try {
      const auth = await getWebAuth();
      const res = await openCommercialProfileChat(auth, profileId);
      router.push(`/app?openChat=${encodeURIComponent(res.conversation_id)}`);
    } catch (chatError) {
      setNotice(actionError(chatError));
    }
  };

  const handleAddToCart = (offer: CommercialPublicOffer) => {
    if (!profile) return;
    const currentCart = readBusinessCart();
    if (
      currentCart
      && currentCart.profileId !== profile.id
      && currentCart.lines.length > 0
    ) {
      const confirmed = window.confirm(
        `Tu carrito actual tiene productos de "${currentCart.profileName}". ¿Deseas vaciarlo y agregar "${offer.title}" de "${profile.display_name}"?`,
      );
      if (!confirmed) return;
    }
    const updated = addCartLine(
      {
        id: profile.id,
        name: profile.display_name,
        deliveryFeeMode: profile.delivery_fee_mode,
        modalities: profile.modalities,
      },
      {
        offerId: offer.id,
        title: offer.title,
        unitPrice: offer.base_price_amount,
        quantity: 1,
        kind: offer.offer_kind,
        requiresBooking: offer.requires_booking,
        modalities: offer.modalities,
        durationMinutes: offer.duration_minutes,
      },
    );
    setCartCount(getCartTotalQuantity(updated));
    setNotice(`"${offer.title}" se agregó al carrito.`);
  };

  const openState = isBusinessProfileOpenNow(profile);
  const productOffers = offers.filter((o) => o.offer_kind === 'product');
  const serviceOffers = offers.filter((o) => o.offer_kind === 'service');

  return (
    <CommercialShell
      title={profile?.display_name || 'Negocio'}
      description={
        profile
          ? `${profile.city || 'Sin ciudad'}${profile.country_code ? `, ${profile.country_code}` : ''}`
          : undefined
      }
      backHref="/app/beeservices"
      wide
    >
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {profile ? (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#E7DDF2] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              {profile.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo_url}
                  alt={profile.display_name}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F3EEFC] text-xl font-extrabold text-[#7427D5]">
                  {initialsOf(profile.display_name)}
                </span>
              )}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-[#261743]">{profile.display_name}</h2>
                  {profile.is_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F4EDFC] px-2.5 py-0.5 text-xs font-bold text-[#7427D5]">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verificado
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      openState.isOpen
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {openState.label}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#7427D5]">
                  {profile.category?.name || profile.custom_activity_text || 'Comercio en Buddy'}
                </p>
                <p className="text-sm text-[#594C67]">{profile.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={primaryButtonClass} onClick={() => void chat()}>
                <MessageSquare className="mr-1.5 inline h-4 w-4" />
                Escribir
              </button>
              <Link href="/app/beeservices/cart" className={`${secondaryButtonClass} relative`}>
                <ShoppingCart className="mr-1.5 inline h-4 w-4" />
                Carrito
                {cartCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-[#7427D5] px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
              {isOwner ? (
                <Link
                  href={`/app/beeservices/manage/${profile.id}`}
                  className={secondaryButtonClass}
                >
                  <Edit3 className="mr-1.5 inline h-3.5 w-3.5" />
                  Administrar
                </Link>
              ) : null}
            </div>
          </div>

          {notice ? (
            <p className="rounded-xl border border-[#E2D6F0] bg-[#FAF4FF] px-4 py-2.5 text-sm font-medium text-[#5E1ABF]">
              {notice}
            </p>
          ) : null}

          {/* Tabs: Productos / Servicios / Información */}
          <div className="flex flex-wrap gap-2 border-b border-[#E7DDF2] pb-2">
            <button
              type="button"
              onClick={() => setTab('products')}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-extrabold transition sm:px-4 ${
                tab === 'products'
                  ? 'bg-[#7427D5] text-white'
                  : 'bg-[#F7F1FB] text-[#5C4A78] hover:bg-[#EFE4FA]'
              }`}
            >
              Productos ({productOffers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('services')}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-extrabold transition sm:px-4 ${
                tab === 'services'
                  ? 'bg-[#7427D5] text-white'
                  : 'bg-[#F7F1FB] text-[#5C4A78] hover:bg-[#EFE4FA]'
              }`}
            >
              Servicios ({serviceOffers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('info')}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-extrabold transition sm:px-4 ${
                tab === 'info'
                  ? 'bg-[#7427D5] text-white'
                  : 'bg-[#F7F1FB] text-[#5C4A78] hover:bg-[#EFE4FA]'
              }`}
            >
              Información
            </button>
          </div>

          {tab === 'products' ? (
            <OfferList offers={productOffers} onAddToCart={handleAddToCart} />
          ) : tab === 'services' ? (
            <OfferList offers={serviceOffers} onAddToCart={handleAddToCart} />
          ) : (
            <div className="grid gap-4 rounded-2xl border border-[#E7DDF2] bg-white p-5 text-xs sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-[#261743]">Ubicación y contacto</h3>
                <p className="flex items-center gap-2 text-[#594C67]">
                  <MapPin className="h-4 w-4 text-[#7427D5]" />
                  <span>
                    {profile.city}
                    {profile.country_code ? `, ${profile.country_code}` : ''}
                  </span>
                </p>
                {profile.location?.is_address_public && profile.location.address ? (
                  <p className="text-[#594C67]">Dirección: {profile.location.address}</p>
                ) : null}
                {profile.location?.neighborhood ? (
                  <p className="text-[#594C67]">Barrio: {profile.location.neighborhood}</p>
                ) : null}
                {profile.location?.location_reference ? (
                  <p className="text-[#594C67]">Referencia: {profile.location.location_reference}</p>
                ) : null}
                {profile.contact?.is_phone_public && profile.contact.phone_number ? (
                  <p className="flex items-center gap-2 text-[#594C67]">
                    <Phone className="h-4 w-4 text-[#7427D5]" />
                    <span>
                      {profile.contact.phone_dial_code || ''} {profile.contact.phone_number}
                    </span>
                  </p>
                ) : null}
                {profile.contact?.is_email_public && profile.contact.email ? (
                  <p className="flex items-center gap-2 text-[#594C67]">
                    <Mail className="h-4 w-4 text-[#7427D5]" />
                    <span>{profile.contact.email}</span>
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-[#261743]">Modalidades y operación</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.modalities.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-[#F7F1FB] px-2.5 py-1 text-xs font-semibold text-[#7427D5]"
                    >
                      {MODALITY_LABEL[m] || m}
                    </span>
                  ))}
                </div>
                <p className="pt-2 text-[#594C67]">
                  <strong>Domicilio:</strong>{' '}
                  {profile.delivery_fee_mode === 'free'
                    ? 'Gratis'
                    : profile.delivery_fee_mode === 'to_be_confirmed'
                      ? 'Valor por confirmar con el negocio'
                      : profile.delivery_fee_mode === 'fixed'
                        ? 'Tarifa fija configurada por el negocio'
                        : 'No ofrece entrega a domicilio'}
                </p>
                <p className="text-[#786593]">
                  Los pagos se coordinan directamente con los medios autorizados por el comercio.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </CommercialShell>
  );
}

function OfferList({
  offers,
  onAddToCart,
}: {
  offers: CommercialPublicOffer[];
  onAddToCart: (offer: CommercialPublicOffer) => void;
}) {
  if (offers.length === 0) {
    return <p className="text-sm text-[#8A72B2]">No hay ofertas publicadas en esta sección.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {offers.map((offer) => {
        const primaryImg =
          offer.images.find((img) => img.is_primary && img.url)?.url
          || offer.images.find((img) => img.url)?.url
          || null;
        const discountPct = computeDiscountPercent(offer);

        return (
          <li
            key={offer.id}
            className="flex flex-col items-start gap-3 rounded-2xl border border-[#F0EAF3] bg-white p-3.5 shadow-sm sm:flex-row"
          >
            <Link
              href={`/app/beeservices/offer/${offer.id}`}
              className="relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F6EAFE] text-[#7427D5] sm:h-20 sm:w-20"
            >
              {primaryImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImg} alt={offer.title} className="h-full w-full object-cover" />
              ) : offer.offer_kind === 'service' ? (
                <Wrench className="h-6 w-6" />
              ) : (
                <Package className="h-6 w-6" />
              )}
              {discountPct ? (
                <span className="absolute left-1 top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  -{discountPct}%
                </span>
              ) : null}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/app/beeservices/offer/${offer.id}`}
                className="block truncate text-sm font-extrabold text-[#261743] hover:text-[#7427D5]"
              >
                {offer.title}
              </Link>
              {offer.description ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-[#786593]">{offer.description}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {offer.original_price_amount != null
                && offer.base_price_amount != null
                && offer.original_price_amount > offer.base_price_amount ? (
                  <span className="text-xs text-[#8A72B2] line-through">
                    {moneyCop(offer.original_price_amount)}
                  </span>
                ) : null}
                <span className="text-sm font-extrabold text-[#7427D5]">
                  {formatOfferPrice(offer)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {offer.offer_kind === 'service' ? (
                  <Link
                    href={
                      offer.requires_booking
                        ? `/app/beeservices/request/booking/${offer.id}`
                        : `/app/beeservices/request/service/${offer.id}`
                    }
                    className={secondaryButtonClass}
                  >
                    {offer.requires_booking ? 'Reservar' : 'Solicitar'}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => onAddToCart(offer)}
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* =========================================================================
 * 3. PublicOffer
 * ========================================================================= */
export function PublicOffer({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [offer, setOffer] = useState<CommercialPublicOffer | null>(null);
  const [profile, setProfile] = useState<CommercialPublicProfile | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then(async (auth) => {
        const response = await getPublicCommercialOffer(auth, offerId);
        const [profileRes, ownedRes] = await Promise.all([
          getPublicCommercialProfile(auth, response.offer.commercial_profile_id),
          getOwnedCommercialProfiles(auth).catch(() => ({ profiles: [] })),
        ]);
        if (!active) return;
        setOffer(response.offer);
        setProfile(profileRes.profile);
        const firstImg =
          response.offer.images.find((i) => i.is_primary && i.url)?.url
          || response.offer.images.find((i) => i.url)?.url
          || null;
        setActiveImageUrl(firstImg);
        setIsOwner(
          (ownedRes.profiles || []).some((p) => p.id === response.offer.commercial_profile_id),
        );
      })
      .catch((loadError) => {
        if (active) setError(actionError(loadError));
      });
    return () => {
      active = false;
    };
  }, [offerId]);

  const add = () => {
    if (!offer) return;
    const currentCart = readBusinessCart();
    if (
      currentCart
      && currentCart.profileId !== offer.commercial_profile_id
      && currentCart.lines.length > 0
    ) {
      const ok = window.confirm(
        `Tu carrito tiene productos de "${currentCart.profileName}". ¿Deseas reemplazarlo por "${profile?.display_name || 'este negocio'}"?`,
      );
      if (!ok) return;
    }
    addCartLine(
      {
        id: offer.commercial_profile_id,
        name: profile?.display_name || 'Negocio',
        deliveryFeeMode: profile?.delivery_fee_mode,
        modalities: profile?.modalities,
      },
      {
        offerId: offer.id,
        title: offer.title,
        unitPrice: offer.base_price_amount,
        quantity: 1,
        kind: offer.offer_kind,
        requiresBooking: offer.requires_booking,
        modalities: offer.modalities,
        durationMinutes: offer.duration_minutes,
      },
    );
    setNotice('Agregado al carrito.');
  };

  const openChat = async () => {
    if (!offer) return;
    try {
      const auth = await getWebAuth();
      const res = await openCommercialProfileChat(auth, offer.commercial_profile_id);
      router.push(`/app?openChat=${encodeURIComponent(res.conversation_id)}`);
    } catch (err) {
      setNotice(actionError(err));
    }
  };

  const discountPct = offer ? computeDiscountPercent(offer) : null;
  const openState = isBusinessProfileOpenNow(profile);
  const validImages = (offer?.images || []).filter((img) => Boolean(img.url));

  return (
    <CommercialShell
      title={offer?.title || 'Oferta'}
      description={profile?.display_name}
      backHref={
        offer ? `/app/beeservices/profile/${offer.commercial_profile_id}` : '/app/beeservices'
      }
      wide
    >
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {offer ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative flex h-72 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#E7DDF2] bg-[#F6EAFE]">
              {activeImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImageUrl}
                  alt={offer.title}
                  className="h-full w-full object-contain"
                />
              ) : offer.offer_kind === 'service' ? (
                <Wrench className="h-14 w-14 text-[#7427D5]" />
              ) : (
                <Package className="h-14 w-14 text-[#7427D5]" />
              )}
              {discountPct ? (
                <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-extrabold text-white shadow">
                  -{discountPct}% OFF
                </span>
              ) : null}
            </div>

            {validImages.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {validImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageUrl(img.url)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                      activeImageUrl === img.url ? 'border-[#7427D5]' : 'border-transparent'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url!} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Offer Details */}
          <div className="space-y-4 rounded-2xl border border-[#E7DDF2] bg-white p-5 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[#F4EDFC] px-3 py-1 text-xs font-extrabold text-[#7427D5]">
                {offer.offer_kind === 'product'
                  ? 'Producto'
                  : offer.requires_booking
                    ? 'Servicio con reserva'
                    : 'Servicio'}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  openState.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                }`}
              >
                {openState.label}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#261743]">{offer.title}</h2>
              <Link
                href={`/app/beeservices/profile/${offer.commercial_profile_id}`}
                className="mt-1 inline-block text-xs font-bold text-[#7427D5] hover:underline"
              >
                {profile?.display_name || 'Ver negocio'}
              </Link>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              {offer.original_price_amount != null
              && offer.base_price_amount != null
              && offer.original_price_amount > offer.base_price_amount ? (
                <span className="text-sm text-[#8A72B2] line-through">
                  {moneyCop(offer.original_price_amount)}
                </span>
              ) : null}
              <span className="text-2xl font-extrabold text-[#7427D5]">
                {formatOfferPrice(offer)}
              </span>
            </div>

            {offer.description ? (
              <div className="text-xs leading-relaxed text-[#594C67]">
                <p className={expandedDesc ? '' : 'line-clamp-4'}>{offer.description}</p>
                {offer.description.length > 180 ? (
                  <button
                    type="button"
                    onClick={() => setExpandedDesc((v) => !v)}
                    className="mt-1 font-bold text-[#7427D5]"
                  >
                    {expandedDesc ? 'Ver menos' : 'Ver más'}
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Service & Modality Metadata */}
            <div className="space-y-2 border-t border-[#F1EAF6] pt-3 text-xs">
              {offer.duration_minutes ? (
                <p className="flex items-center gap-1.5 text-[#594C67]">
                  <Clock className="h-4 w-4 text-[#7427D5]" />
                  <span>Duración estimada: {offer.duration_minutes} minutos</span>
                </p>
              ) : null}

              {offer.payment_policy ? (
                <p className="text-[#594C67]">
                  <strong>Política de pago:</strong> {PAYMENT_POLICY_LABEL[offer.payment_policy]}
                </p>
              ) : null}

              {offer.modalities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {offer.modalities.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-[#F7F1FB] px-2.5 py-1 text-[11px] font-semibold text-[#5C4A78]"
                    >
                      {MODALITY_LABEL[m] || m}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {offer.offer_kind === 'service' ? (
                <Link
                  href={
                    offer.requires_booking
                      ? `/app/beeservices/request/booking/${offer.id}`
                      : `/app/beeservices/request/service/${offer.id}`
                  }
                  className={primaryButtonClass}
                >
                  {offer.requires_booking ? 'Reservar horario' : 'Solicitar servicio'}
                </Link>
              ) : null}

              <button
                type="button"
                className={offer.offer_kind === 'product' ? primaryButtonClass : secondaryButtonClass}
                onClick={add}
              >
                Agregar al carrito
              </button>

              <Link href="/app/beeservices/cart" className={secondaryButtonClass}>
                Ver carrito
              </Link>

              <button type="button" onClick={() => void openChat()} className={secondaryButtonClass}>
                <MessageSquare className="mr-1.5 inline h-4 w-4" />
                Preguntar al negocio
              </button>

              {isOwner ? (
                <Link
                  href={`/app/beeservices/manage/${offer.commercial_profile_id}/offers/${offer.id}`}
                  className={secondaryButtonClass}
                >
                  <Edit3 className="mr-1.5 inline h-3.5 w-3.5" />
                  Editar oferta
                </Link>
              ) : null}
            </div>

            {notice ? <p className="text-xs font-semibold text-[#5E1ABF]">{notice}</p> : null}
          </div>
        </div>
      ) : null}
    </CommercialShell>
  );
}

/* =========================================================================
 * 5. OfferRequestForm (Reservas y Servicios con Horarios del Negocio)
 * ========================================================================= */
function buildHalfHourSlots(rule: CommercialProfileHour | undefined): string[] {
  if (!rule || rule.is_closed) return [];
  const openStr = (rule.opens_at || '08:00').slice(0, 5);
  const closeStr = (rule.closes_at || '18:00').slice(0, 5);
  const [openH, openM] = openStr.split(':').map(Number);
  const [closeH, closeM] = closeStr.split(':').map(Number);
  const startMins = (Number.isFinite(openH) ? openH : 8) * 60 + (Number.isFinite(openM) ? openM : 0);
  const endMins = (Number.isFinite(closeH) ? closeH : 18) * 60 + (Number.isFinite(closeM) ? closeM : 0);
  const slots: string[] = [];
  for (let m = startMins; m < endMins; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export function OfferRequestForm({ offerId, booking }: { offerId: string; booking: boolean }) {
  const router = useRouter();
  const [offer, setOffer] = useState<CommercialPublicOffer | null>(null);
  const [profile, setProfile] = useState<CommercialPublicProfile | null>(null);
  const [modality, setModality] = useState<CommercialModality>('at_establishment');
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [selectedSlot, setSelectedSlot] = useState('09:00');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then(async (auth) => {
        const response = await getPublicCommercialOffer(auth, offerId);
        const profileRes = await getPublicCommercialProfile(
          auth,
          response.offer.commercial_profile_id,
        );
        if (!active) return;
        setOffer(response.offer);
        setProfile(profileRes.profile);
        if (response.offer.modalities.length > 0) {
          setModality(response.offer.modalities[0]);
        }
      })
      .catch((loadError) => {
        if (active) setError(actionError(loadError));
      });
    return () => {
      active = false;
    };
  }, [offerId]);

  const minDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const selectedDayRule = useMemo(() => {
    if (!selectedDate || !profile?.hours?.length) return undefined;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return profile.hours.find((h) => h.day_of_week === dt.getDay());
  }, [profile?.hours, selectedDate]);

  const availableSlots = useMemo(() => {
    if (!profile?.hours?.length) {
      return [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      ];
    }
    return buildHalfHourSlots(selectedDayRule);
  }, [profile?.hours?.length, selectedDayRule]);

  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(availableSlots[0]);
    }
  }, [availableSlots, selectedSlot]);

  const needsAddress = modality === 'delivery' || modality === 'home_visit';
  const businessTimezone =
    profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const computeStartsAndEndsIso = () => {
    if (!booking && !offer?.requires_booking) {
      return { startsIso: null, endsIso: null };
    }
    const localDt = new Date(`${selectedDate}T${selectedSlot}:00`);
    const startsIso = localDt.toISOString();
    const durationMins = offer?.duration_minutes || 60;
    const endsIso = new Date(localDt.getTime() + durationMins * 60_000).toISOString();
    return { startsIso, endsIso };
  };

  const handleAddToUnifiedCart = () => {
    if (!offer || !profile) return;
    if ((booking || offer.requires_booking) && availableSlots.length === 0) {
      setError('El negocio está cerrado en la fecha seleccionada. Elige otro día.');
      return;
    }
    const { startsIso, endsIso } = computeStartsAndEndsIso();
    addCartLine(
      {
        id: profile.id,
        name: profile.display_name,
        deliveryFeeMode: profile.delivery_fee_mode,
        modalities: profile.modalities,
      },
      {
        offerId: offer.id,
        title: offer.title,
        unitPrice: offer.base_price_amount,
        quantity,
        kind: offer.offer_kind,
        requiresBooking: booking || offer.requires_booking,
        lineComment: note.trim() || undefined,
        requestedModality: modality,
        requestedStartsAt: startsIso,
        requestedEndsAt: endsIso,
        timezone: businessTimezone,
        durationMinutes: offer.duration_minutes,
        modalities: offer.modalities,
      },
    );
    setNotice('Agregado al carrito unificado.');
    router.push('/app/beeservices/cart');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!offer) return;
    if ((booking || offer.requires_booking) && availableSlots.length === 0) {
      setError('El negocio está cerrado en la fecha seleccionada.');
      return;
    }
    if (needsAddress && !deliveryAddress.trim()) {
      setError('Ingresa la dirección para esta modalidad.');
      return;
    }
    const { startsIso, endsIso } = computeStartsAndEndsIso();
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const response = await createCommercialRequest(auth, crypto.randomUUID(), {
        request_type: booking || offer.requires_booking ? 'booking_request' : 'service_request',
        commercial_profile_id: offer.commercial_profile_id,
        requested_modality: modality,
        customer_note: note.trim() || undefined,
        delivery_address: needsAddress ? deliveryAddress.trim() : undefined,
        delivery_reference: needsAddress && deliveryReference.trim() ? deliveryReference.trim() : undefined,
        items: [
          {
            commercial_offer_id: offer.id,
            quantity,
            line_comment: note.trim() || undefined,
            requested_modality: modality,
            requested_starts_at: startsIso,
            requested_ends_at: endsIso,
            timezone: businessTimezone,
          },
        ],
      });
      router.push(`/app/beeservices/request/${response.request.request_id}`);
    } catch (submitError) {
      setError(actionError(submitError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CommercialShell
      title={booking ? 'Reservar horario' : 'Solicitar servicio'}
      description={offer ? `${offer.title} · ${formatOfferPrice(offer)}` : undefined}
      backHref={offer ? `/app/beeservices/offer/${offer.id}` : '/app/beeservices'}
    >
      {offer ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="rounded-xl border border-[#F0EAF3] bg-[#FAF7FD] p-3 text-xs text-[#594C67]">
            <p className="font-bold text-[#261743]">{formatOfferPrice(offer)}</p>
            {offer.duration_minutes ? (
              <p className="mt-0.5">Duración por sesión: {offer.duration_minutes} minutos</p>
            ) : null}
            <p className="mt-0.5">Zona horaria del negocio: {businessTimezone}</p>
          </div>

          <label className="block text-xs font-semibold text-[#5C4A78]">
            Modalidad
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as CommercialModality)}
              className={fieldClass}
            >
              {(offer.modalities.length
                ? offer.modalities
                : (['at_establishment'] as CommercialModality[])
              ).map((m) => (
                <option key={m} value={m}>
                  {MODALITY_LABEL[m]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#5C4A78]">
            Cantidad
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className={fieldClass}
            />
          </label>

          {booking || offer.requires_booking ? (
            <div className="space-y-3 rounded-xl border border-[#E7D9F0] bg-[#FCFAFD] p-3.5">
              <label className="block text-xs font-semibold text-[#5C4A78]">
                Fecha de la reserva
                <input
                  type="date"
                  min={minDateStr}
                  value={selectedDate}
                  required
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={fieldClass}
                />
              </label>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-[#5C4A78]">
                  Bloque horario disponible (30 min)
                </p>
                {availableSlots.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    El negocio se encuentra cerrado en el día seleccionado. Por favor elige otra fecha.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`min-h-[44px] rounded-lg py-2 text-xs font-bold transition ${
                          selectedSlot === slot
                            ? 'bg-[#7427D5] text-white'
                            : 'border border-[#E2D6F0] bg-white text-[#5C4A78] hover:border-[#7427D5]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {needsAddress ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#5C4A78]">
                Dirección *
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Calle, carrera, número, edificio..."
                  className={fieldClass}
                />
              </label>
              <label className="block text-xs font-semibold text-[#5C4A78]">
                Referencia o indicaciones (opcional)
                <input
                  type="text"
                  value={deliveryReference}
                  onChange={(e) => setDeliveryReference(e.target.value)}
                  placeholder="Apartamento, torre, punto de referencia..."
                  className={fieldClass}
                />
              </label>
            </div>
          ) : null}

          <label className="block text-xs font-semibold text-[#5C4A78]">
            Nota para el negocio
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cuéntale al negocio qué necesitas..."
              className={fieldClass}
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" className={primaryButtonClass} disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar solicitud directa'}
            </button>
            <button
              type="button"
              onClick={handleAddToUnifiedCart}
              disabled={busy}
              className={secondaryButtonClass}
            >
              Agregar al carrito
            </button>
          </div>
        </form>
      ) : null}
      {notice ? <p className="mt-3 text-sm text-[#5E1ABF]">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </CommercialShell>
  );
}

/* =========================================================================
 * 6. CartScreen
 * ========================================================================= */
export function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<WebBusinessCart | null>(null);
  const [profile, setProfile] = useState<CommercialPublicProfile | null>(null);
  const [modality, setModality] = useState<CommercialModality>('delivery');
  const [note, setNote] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const loaded = readBusinessCart();
    setCart(loaded);
    if (loaded?.profileId) {
      getWebAuth()
        .then((auth) => getPublicCommercialProfile(auth, loaded.profileId))
        .then((res) => {
          setProfile(res.profile);
          if (res.profile.modalities.length > 0) {
            setModality(res.profile.modalities[0]);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const isCartEmpty = !cart || cart.lines.length === 0;
  const availableModalities: CommercialModality[] =
    profile?.modalities?.length
      ? profile.modalities
      : cart?.modalities?.length
        ? cart.modalities
        : ['delivery', 'pickup', 'at_establishment'];

  const needsAddress = modality === 'delivery' || modality === 'home_visit';

  const subtotal = useMemo(() => {
    if (!cart) return 0;
    return cart.lines.reduce(
      (sum, line) => sum + (line.unitPrice != null ? line.unitPrice * line.quantity : 0),
      0,
    );
  }, [cart]);

  const deliveryFee =
    needsAddress && cart?.deliveryFeeAmount != null ? cart.deliveryFeeAmount : 0;

  const revalidateCartOffers = async () => {
    if (!cart) return;
    try {
      const auth = await getWebAuth();
      const offersRes = await getPublicCommercialOffers(auth, cart.profileId, { limit: 100 });
      const activeIds = new Set((offersRes.offers || []).map((o) => o.id));
      const validLines = cart.lines.filter((line) => activeIds.has(line.offerId));
      const nextCart = validLines.length > 0 ? { ...cart, lines: validLines } : null;
      writeBusinessCart(nextCart);
      setCart(nextCart);
    } catch {
      // ignore revalidation failure
    }
  };

  const checkout = async () => {
    if (!cart || cart.lines.length === 0) return;
    if (needsAddress && !address.trim()) {
      setError('La dirección de entrega es obligatoria para domicilio.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const idempotencyKey = getOrCreateCartIdempotencyKey();
      const hasServices = cart.lines.some((line) => line.kind === 'service');
      const hasProducts = cart.lines.some((line) => line.kind === 'product');
      const requestType =
        hasServices && hasProducts
          ? 'mixed_request'
          : hasServices
            ? cart.lines.some((l) => l.requiresBooking)
              ? 'booking_request'
              : 'service_request'
            : 'product_order';

      const response = await createCommercialRequest(auth, idempotencyKey, {
        request_type: requestType,
        commercial_profile_id: cart.profileId,
        requested_modality: modality,
        customer_note: note.trim() || undefined,
        delivery_address: needsAddress ? address.trim() : undefined,
        delivery_reference: needsAddress && reference.trim() ? reference.trim() : undefined,
        items: cart.lines.map((line) => ({
          commercial_offer_id: line.offerId,
          quantity: line.quantity,
          line_comment: line.lineComment?.trim() || undefined,
          requested_modality: line.requestedModality || modality,
          requested_starts_at: line.requestedStartsAt || null,
          requested_ends_at: line.requestedEndsAt || null,
          timezone: line.timezone || profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        })),
      });
      writeBusinessCart(null);
      router.push(`/app/beeservices/request/${response.request.request_id}`);
    } catch (checkoutError) {
      resetCartIdempotencyKey();
      await revalidateCartOffers();
      setError(actionError(checkoutError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CommercialShell title="Carrito" backHref="/app/beeservices" wide>
      {isCartEmpty ? (
        <div className="flex min-h-[min(28rem,calc(100dvh-11rem))] flex-col items-center justify-center rounded-2xl border border-[#E7D9F0] bg-gradient-to-b from-white via-[#FCFAFD] to-[#F7F1FB] px-6 py-10 text-center shadow-[0_1px_0_rgba(116,39,213,0.06)]">
          <span
            className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-2xl border border-[#E8D1F1] bg-[#F6EAFE] text-[#7427D5] shadow-inner"
            aria-hidden
          >
            <ShoppingCart className="h-10 w-10" strokeWidth={1.4} />
            <span className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-xs font-bold text-[#8A72B2] shadow-sm">
              0
            </span>
          </span>
          <h2 className="mt-6 text-lg font-extrabold tracking-tight text-[#432064]">
            Tu carrito está vacío
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#786593]">
            Explora negocios y servicios, agrega productos u ofertas y confirma tu compra desde aquí.
          </p>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              href="/app/beeservices"
              className={`${primaryButtonClass} w-full sm:min-w-[11rem] sm:w-auto`}
            >
              Explorar Buddy Services
            </Link>
            <Link
              href="/app/beeservices/my-purchases"
              className={`${secondaryButtonClass} w-full sm:min-w-[11rem] sm:w-auto`}
            >
              Ver mis compras
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/app/beeservices/profile/${cart.profileId}`}
              className="text-base font-extrabold text-[#261743] hover:text-[#7427D5]"
            >
              {cart.profileName}
            </Link>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('¿Seguro que deseas vaciar todo el carrito?')) return;
                writeBusinessCart(null);
                setCart(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vaciar carrito
            </button>
          </div>

          <ul className="space-y-3">
            {cart.lines.map((line) => (
              <li
                key={line.offerId}
                className="rounded-2xl border border-[#F0EAF3] bg-white p-4 space-y-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-[#261743]">{line.title}</p>
                    <p className="text-xs text-[#786593]">
                      {line.unitPrice != null ? moneyCop(line.unitPrice) : 'Precio por confirmar'} c/u
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (line.quantity === 1) {
                          if (!window.confirm(`¿Quitar "${line.title}" del carrito?`)) return;
                        }
                        setCart(updateCartLineQuantity(line.offerId, -1));
                      }}
                      className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-[#E2D6F0] bg-[#FAF7FD] text-[#7427D5]"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-extrabold text-[#261743]">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCart(updateCartLineQuantity(line.offerId, 1))}
                      className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-[#E2D6F0] bg-[#FAF7FD] text-[#7427D5]"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`¿Quitar "${line.title}" del carrito?`)) return;
                        setCart(removeCartLine(line.offerId));
                      }}
                      className="ml-auto sm:ml-2 inline-flex min-h-9 items-center text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                {line.requiresBooking ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[#5C4A78]">
                      Fecha y hora de reserva
                      <input
                        type="datetime-local"
                        value={
                          line.requestedStartsAt
                            ? new Date(line.requestedStartsAt).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          const startsIso = val ? new Date(val).toISOString() : null;
                          const dur = line.durationMinutes || 60;
                          const endsIso =
                            startsIso ? new Date(new Date(val).getTime() + dur * 60_000).toISOString() : null;
                          setCart(
                            updateCartLine(line.offerId, {
                              requestedStartsAt: startsIso,
                              requestedEndsAt: endsIso,
                            }),
                          );
                        }}
                        className={fieldClass}
                      />
                    </label>
                  </div>
                ) : null}

                <input
                  type="text"
                  value={line.lineComment || ''}
                  onChange={(e) =>
                    setCart(updateCartLine(line.offerId, { lineComment: e.target.value }))
                  }
                  placeholder="Comentario o especificación para este ítem (opcional)"
                  className={fieldClass}
                />
              </li>
            ))}
          </ul>

          {/* Modality & Delivery details */}
          <div className="space-y-3 rounded-2xl border border-[#E7DDF2] bg-white p-4">
            <label className="block text-xs font-semibold text-[#5C4A78]">
              Modalidad de entrega o atención
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as CommercialModality)}
                className={fieldClass}
              >
                {availableModalities.map((m) => (
                  <option key={m} value={m}>
                    {MODALITY_LABEL[m] || m}
                  </option>
                ))}
              </select>
            </label>

            {needsAddress ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[#5C4A78]">
                  Dirección de entrega *
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Calle, carrera, número..."
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs font-semibold text-[#5C4A78]">
                  Referencia / Apartamento (opcional)
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Torre, apto, indicaciones..."
                    className={fieldClass}
                  />
                </label>
              </div>
            ) : null}

            <label className="block text-xs font-semibold text-[#5C4A78]">
              Nota general para el negocio
              <textarea
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Instrucciones adicionales para tu pedido"
                className={fieldClass}
              />
            </label>
          </div>

          {/* Summary Card */}
          <div className="rounded-2xl border border-[#E7DDF2] bg-white p-4 space-y-2 text-xs">
            <div className="flex justify-between text-[#5C4A78]">
              <span>Subtotal estimado</span>
              <span>{moneyCop(subtotal)}</span>
            </div>
            {needsAddress ? (
              <div className="flex justify-between text-[#5C4A78]">
                <span>Domicilio</span>
                <span>
                  {profile?.delivery_fee_mode === 'free'
                    ? 'Gratis'
                    : deliveryFee > 0
                      ? moneyCop(deliveryFee)
                      : 'Por confirmar'}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-[#F1EAF6] pt-2 text-sm font-extrabold text-[#261743]">
              <span>Total estimado</span>
              <span className="text-[#7427D5]">{moneyCop(subtotal + deliveryFee)}</span>
            </div>
          </div>

          <button
            type="button"
            className={primaryButtonClass}
            disabled={busy}
            onClick={() => void checkout()}
          >
            {busy ? 'Enviando solicitud…' : 'Confirmar solicitud'}
          </button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
      )}
    </CommercialShell>
  );
}

/* =========================================================================
 * 7. MyPurchases & CustomerRequestDetail
 * ========================================================================= */
const PURCHASE_STATUS_TONE_CLASS: Record<CommercialRequestListStatusTone, string> = {
  neutral: 'bg-[#F4EDFC] text-[#54209E]',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-700',
};

function PurchaseRequestTypeIcon({
  requestType,
}: {
  requestType: CommercialRequestListItem['request_type'];
}) {
  if (requestType === 'booking_request' || requestType === 'mixed_request') {
    return <CalendarDays className="h-[19px] w-[19px] text-[#7427D5]" aria-hidden />;
  }
  if (requestType === 'service_request') {
    return <Wrench className="h-[19px] w-[19px] text-[#7427D5]" aria-hidden />;
  }
  return <Package className="h-[19px] w-[19px] text-[#7427D5]" aria-hidden />;
}

export function MyPurchases() {
  const [requests, setRequests] = useState<CommercialRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartCount, setCartCount] = useState(0);

  const loadPurchases = useCallback(() => {
    setLoading(true);
    setError('');
    setCartCount(getCartTotalQuantity());
    getWebAuth()
      .then((auth) => getCommercialRequests(auth, { limit: 50 }))
      .then((response) => setRequests(response.requests))
      .catch((loadError) => setError(actionError(loadError)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const cartHint =
    cartCount === 0
      ? 'Sin productos pendientes'
      : cartCount === 1
        ? '1 producto por confirmar'
        : `${cartCount} productos por confirmar`;

  const requestSummary = loading
    ? 'Cargando tus solicitudes…'
    : requests.length === 1
      ? '1 solicitud registrada'
      : `${requests.length} solicitudes registradas`;

  const quickLinks = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <Link
        href="/app/beeservices/cart"
        className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[#E8D1F1] bg-white p-4 shadow-[0_8px_24px_rgba(116,39,213,0.07)] transition hover:border-[#C9A8E8] hover:shadow-[0_12px_32px_rgba(116,39,213,0.11)]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7427D5] text-white shadow-sm">
          <ShoppingCart className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-[#261743]">Carrito</span>
          <span className="mt-0.5 block text-xs text-[#786593]">{cartHint}</span>
        </span>
        {cartCount > 0 ? (
          <span className="absolute right-3 top-3 rounded-full bg-[#F6EAFE] px-2 py-0.5 text-[10px] font-extrabold text-[#7427D5]">
            {cartCount}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 shrink-0 text-[#B8A5D6] transition group-hover:translate-x-0.5 group-hover:text-[#7427D5]" />
      </Link>
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#E0D4EE] bg-[#FCFAFD] p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
          <Tag className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-[#261743]">Promociones</span>
          <span className="mt-0.5 block text-xs text-[#786593]">Próximamente disponibles</span>
        </span>
      </div>
    </div>
  );

  return (
    <CommercialShell
      title="Mis compras"
      description="Historial, carrito y promociones"
      backHref="/app/beeservices"
      wide
      compact
    >
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-[#261743]">Tus pedidos y reservas</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#786593]">
              Revisa el estado de cada solicitud y retoma tu carrito cuando quieras.
            </p>
          </div>
          <div className="hidden shrink-0 flex-col items-end sm:flex">
            <span className="text-2xl font-extrabold leading-none text-[#7427D5]">
              {loading ? '…' : requests.length}
            </span>
            <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">
              Solicitudes
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start">
          <section className="order-2 min-w-0 overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.06)] lg:order-1">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-[#261743]">Historial de compras</h3>
                <p className="mt-0.5 text-xs text-[#786593]">{requestSummary}</p>
              </div>
              <button
                type="button"
                onClick={loadPurchases}
                disabled={loading}
                className={`${secondaryButtonClass} shrink-0`}
              >
                <RefreshCw className="mr-1.5 inline h-3.5 w-3.5" />
                Actualizar
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? <ListSkeleton rows={3} /> : null}

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={loadPurchases}
                    className="mt-2 rounded-full bg-[#7427D5] px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Reintentar
                  </button>
                </div>
              ) : null}

              {!loading && !error && requests.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#E7DDF2] bg-gradient-to-b from-white via-[#FCFAFD] to-[#F7F1FB] px-5 py-10 text-center sm:py-12">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E8D1F1] bg-[#F6EAFE] text-[#7427D5]">
                    <Package className="h-7 w-7" strokeWidth={1.4} aria-hidden />
                  </span>
                  <h4 className="mt-4 text-base font-extrabold text-[#261743]">
                    Aún no tienes solicitudes
                  </h4>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#786593]">
                    Cuando pidas productos o servicios en Buddy Services, aparecerán aquí con su estado y el detalle.
                  </p>
                  <Link
                    href="/app/beeservices"
                    className={`${primaryButtonClass} mt-6 inline-flex items-center gap-2`}
                  >
                    <Store className="h-4 w-4" aria-hidden />
                    Explorar negocios
                  </Link>
                </div>
              ) : null}

              {!loading && requests.length > 0 ? (
                <ul className="space-y-3">
                  {requests.map((request) => {
                    const statusTone = getCommercialRequestListStatusTone(request.status);
                    return (
                      <li key={request.id}>
                        <Link
                          href={`/app/beeservices/request/${request.id}`}
                          className="block rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-[0_6px_20px_rgba(116,39,213,0.05)] transition hover:border-[#C9A8E8] hover:shadow-[0_10px_28px_rgba(116,39,213,0.08)]"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6EAFE]">
                              <PurchaseRequestTypeIcon requestType={request.request_type} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">
                                    {getCommercialRequestListTypeLabel(request.request_type)}
                                  </p>
                                  <p className="mt-0.5 truncate text-sm font-extrabold text-[#261743]">
                                    {request.code}
                                  </p>
                                </div>
                                <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[#B8A5D6]" aria-hidden />
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${PURCHASE_STATUS_TONE_CLASS[statusTone]}`}
                                >
                                  {getCommercialRequestListStatusLabel(request.status)}
                                </span>
                                <span className="text-[11px] font-semibold text-[#8A72B2]">
                                  {getCommercialRequestListItemCountLabel(request.item_count)}
                                </span>
                                {request.requested_modality ? (
                                  <span className="rounded-full bg-[#F7F1FB] px-2 py-0.5 text-[11px] font-semibold text-[#5C4A78]">
                                    {getCommercialModalityLabel(request.requested_modality)}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1EAF6] pt-3 text-xs">
                                <span className="font-extrabold text-[#7427D5]">
                                  {formatCommercialRequestListAmount(
                                    request.total_amount,
                                    request.currency_code,
                                  )}
                                </span>
                                <span className="text-[#786593]">
                                  {request.created_at
                                    ? formatCommercialRequestListDate(request.created_at)
                                    : 'Fecha pendiente'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </section>

          <aside className="order-1 lg:sticky lg:top-20 lg:order-2 lg:self-start">
            {quickLinks}
          </aside>
        </div>
      </div>
    </CommercialShell>
  );
}

export function CustomerRequestDetail({ requestId }: { requestId: string }) {
  return <CustomerRequestDetailView requestId={requestId} />;
}
