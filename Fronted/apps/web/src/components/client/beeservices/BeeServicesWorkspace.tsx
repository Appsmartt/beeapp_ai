'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  List,
  MapPin,
  Package,
  Store,
  Wrench,
} from 'lucide-react';
import { getPublicCommercialProductFeed } from '@beeapp/api-client';
import type {
  CommercialModality,
  CommercialOfferType,
  CommercialPublicOffer,
  CommercialPublicProfile,
} from '@beeapp/shared-types';

import { getWebAuth } from '@/lib/client/webAuth';
import BeeServicesAiSearchCard from './BeeServicesAiSearchCard';

const PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 350;
const MINIMUM_SEARCH_LENGTH = 2;

const OFFER_TYPE_OPTIONS: Array<{
  value: CommercialOfferType | '';
  label: string;
}> = [
  { value: '', label: 'Todos' },
  { value: 'products', label: 'Productos' },
  { value: 'services', label: 'Servicios' },
  { value: 'mixed', label: 'Productos y servicios' },
];

const MODALITY_OPTIONS: Array<{
  value: CommercialModality | '';
  label: string;
}> = [
  { value: '', label: 'Todas' },
  { value: 'at_establishment', label: 'En establecimiento' },
  { value: 'in_person', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'home_visit', label: 'Visita a domicilio' },
  { value: 'delivery', label: 'Entrega a domicilio' },
  { value: 'pickup', label: 'Recoger en negocio' },
  { value: 'phone_call', label: 'Llamada telefónica' },
  { value: 'buddy_chat', label: 'Chat Buddy' },
];

const MODALITY_LABEL: Record<string, string> = Object.fromEntries(
  MODALITY_OPTIONS.filter((option) => option.value).map((option) => [
    option.value,
    option.label,
  ]),
);

type FeedTarget = 'both' | 'offers' | 'profiles';
type OfferViewMode = 'grid' | 'list';

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const host = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return host.SpeechRecognition || host.webkitSpeechRecognition || null;
}

function moneyCop(amount: number | null): string {
  if (amount === null) return '';
  return new Intl.NumberFormat('es-CO', {
    currency: 'COP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

function priceLabel(offer: CommercialPublicOffer): string {
  if (offer.pricing_strategy === 'free') return 'Gratis';
  if (offer.pricing_strategy === 'to_be_confirmed') return 'Precio por confirmar';
  const amount = moneyCop(offer.base_price_amount);
  if (offer.pricing_strategy === 'starting_at') {
    return amount ? `Desde ${amount}` : 'Precio desde por confirmar';
  }
  return amount || 'Precio por confirmar';
}

function offerKindLabel(offer: CommercialPublicOffer): string {
  if (offer.offer_kind === 'product') return 'Producto';
  return offer.requires_booking ? 'Servicio con reserva' : 'Servicio';
}

function primaryImage(offer: CommercialPublicOffer): string | null {
  return offer.images.find((image) => image.is_primary && image.url)?.url
    || offer.images.find((image) => image.url)?.url
    || null;
}

function initials(value: string): string {
  const result = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return result || 'B';
}

function modalitiesLabel(modalities: CommercialModality[]): string {
  const values = modalities
    .slice(0, 2)
    .map((item) => MODALITY_LABEL[item] || item);
  if (modalities.length > 2) values.push(`+${modalities.length - 2}`);
  return values.join(' · ');
}

function totalPages(count: number): number {
  if (count <= 0) return 1;
  return Math.ceil(count / PAGE_SIZE);
}

export default function BeeServicesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [offerType, setOfferType] = useState<CommercialOfferType | ''>('');
  const [modality, setModality] = useState<CommercialModality | ''>('');
  const [offerViewMode, setOfferViewMode] = useState<OfferViewMode>('grid');
  const [offers, setOffers] = useState<CommercialPublicOffer[]>([]);
  const [profiles, setProfiles] = useState<CommercialPublicProfile[]>([]);
  const [offersPage, setOffersPage] = useState(1);
  const [profilesPage, setProfilesPage] = useState(1);
  const [offersCount, setOffersCount] = useState(0);
  const [profilesCount, setProfilesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pagingOffers, setPagingOffers] = useState(false);
  const [pagingProfiles, setPagingProfiles] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const seedRef = useRef('');
  const requestRef = useRef(0);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const loadFeed = useCallback(async (params: {
    search: string;
    offerType: CommercialOfferType | '';
    modality: CommercialModality | '';
    offersPage: number;
    profilesPage: number;
    target: FeedTarget;
  }) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const page = params.target === 'profiles'
      ? params.profilesPage
      : params.offersPage;

    if (params.target === 'both') setLoading(true);
    if (params.target === 'offers') setPagingOffers(true);
    if (params.target === 'profiles') setPagingProfiles(true);

    try {
      const auth = await getWebAuth();
      const response = await getPublicCommercialProductFeed(auth, {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: params.search || undefined,
        offer_type: params.offerType || undefined,
        modality: params.modality || undefined,
        seed: params.search ? undefined : seedRef.current || undefined,
      });

      if (requestId !== requestRef.current) return;

      seedRef.current = response.seed;
      if (params.target !== 'profiles') {
        setOffers(response.offers);
        setOffersPage(params.offersPage);
        setOffersCount(response.count);
      }
      if (params.target !== 'offers') {
        setProfiles(response.profiles || []);
        setProfilesPage(params.profilesPage);
        setProfilesCount(response.profiles_count ?? response.profiles?.length ?? 0);
      }
      setError('');
    } catch (loadError) {
      if (requestId !== requestRef.current) return;
      setError(loadError instanceof Error
        ? loadError.message
        : 'No fue posible cargar Buddy Services.');
      if (params.target === 'both') {
        setOffers([]);
        setProfiles([]);
        setOffersCount(0);
        setProfilesCount(0);
      }
    } finally {
      if (requestId !== requestRef.current) return;
      setLoading(false);
      setPagingOffers(false);
      setPagingProfiles(false);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get('created') !== '1') return;
    const businessId = searchParams.get('businessId');
    if (businessId) {
      router.replace(`/app/beeservices/manage/${businessId}`);
      return;
    }
    router.replace('/app/beeservices');
  }, [router, searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const text = search.trim();
      if (text.length > 0 && text.length < MINIMUM_SEARCH_LENGTH) return;
      setActiveSearch(text);
      setOffersPage(1);
      setProfilesPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    void loadFeed({
      search: activeSearch,
      offerType,
      modality,
      offersPage: 1,
      profilesPage: 1,
      target: 'both',
    });
  }, [activeSearch, loadFeed, modality, offerType]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  const toggleVoice = () => {
    const Ctor = speechCtor();
    if (!Ctor) {
      setVoiceNotice('El navegador no permite dictar la búsqueda. Escríbela en el campo.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || '';
      if (transcript) setSearch(transcript);
    };
    recognition.onerror = () => {
      setVoiceNotice('No se pudo escuchar. Inténtalo de nuevo.');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setVoiceNotice('');
    setListening(true);
    recognition.start();
  };

  const emptyTitle = activeSearch
    ? 'No encontramos coincidencias'
    : offerType || modality
      ? 'Ningún negocio coincide con el filtro'
      : 'Aún no hay negocios disponibles';
  const emptyText = activeSearch
    ? 'Prueba con otro nombre, producto o servicio.'
    : offerType || modality
      ? 'Prueba con otro tipo de negocio o con otra modalidad.'
      : 'Cuando alguien publique un negocio o un servicio, aparecerá aquí.';
  const showEmpty = !loading && !error && offers.length === 0 && profiles.length === 0;

  return (
    <div className="h-full overflow-y-auto bg-[#FFFCF9] pb-28">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-7">
        <header className="mb-5 flex items-center gap-2">
          <Link
            href="/app"
            aria-label="Volver al menú principal"
            className="rounded-full p-1.5 text-[#7567D9] hover:bg-[#F3EEFC]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight text-[#7427D5]">
              Buddy Services
            </h1>
            <p className="text-sm text-[#7865AD]">
              Conecta necesidades con soluciones
            </p>
          </div>
        </header>

        <BeeServicesAiSearchCard
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            const text = search.trim();
            if (text.length > 0 && text.length < MINIMUM_SEARCH_LENGTH) return;
            setActiveSearch(text);
          }}
          onPressVoice={toggleVoice}
          listening={listening}
          busy={false}
        />

        {voiceNotice ? (
          <p className="mt-3 text-sm text-[#5E1ABF]" role="status">{voiceNotice}</p>
        ) : null}

        <Link
          href="/app/beeservices/my-purchases"
          className="mt-6 inline-flex items-center rounded-[17px] border border-[#E2D6F0] bg-white py-2.5 pl-2.5 pr-4 shadow-[0_4px_10px_rgba(95,82,197,0.08)]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7567D9] text-white">
            <ClipboardList className="h-[18px] w-[18px]" />
          </span>
          <span className="ml-2.5">
            <span className="block text-[13px] font-extrabold leading-4 text-[#26314D]">
              Mis compras y reservas
            </span>
            <span className="mt-0.5 block text-[11px] leading-4 text-[#6C7892]">
              Consulta el estado de tus solicitudes
            </span>
          </span>
        </Link>

        <section className="mt-6">
          <h2 className="text-sm font-bold text-[#261743]">Filtrar negocios</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#5C4A78]">
              Productos o servicios
              <select
                value={offerType}
                onChange={(event) => {
                  setOfferType(event.target.value as CommercialOfferType | '');
                  setOffersPage(1);
                  setProfilesPage(1);
                }}
                className="mt-1 h-11 w-full rounded-xl border border-[#E7D9F0] bg-white px-3 text-sm font-medium text-[#261743]"
              >
                {OFFER_TYPE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#5C4A78]">
              Modalidad
              <select
                value={modality}
                onChange={(event) => {
                  setModality(event.target.value as CommercialModality | '');
                  setOffersPage(1);
                  setProfilesPage(1);
                }}
                className="mt-1 h-11 w-full rounded-xl border border-[#E7D9F0] bg-white px-3 text-sm font-medium text-[#261743]"
              >
                {MODALITY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error ? (
          <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-semibold text-rose-700">No fue posible cargar</p>
            <p className="mt-1 text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => void loadFeed({
                search: activeSearch,
                offerType,
                modality,
                offersPage,
                profilesPage,
                target: 'both',
              })}
              className="mt-3 rounded-full bg-[#7427D5] px-4 py-2 text-xs font-semibold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#E7D9F0] bg-white px-4 py-4">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#7427D5] border-t-transparent" />
            <p className="text-sm font-semibold text-[#5C4A78]">
              {activeSearch ? 'Buscando coincidencias…' : 'Cargando negocios y servicios…'}
            </p>
          </div>
        ) : null}

        {showEmpty ? (
          <div className="mt-5 rounded-2xl border border-[#E7D9F0] bg-[#F7F1FB] px-5 py-8 text-center">
            <Store className="mx-auto h-6 w-6 text-[#7B2DD9]" />
            <h3 className="mt-3 text-sm font-extrabold text-[#432064]">{emptyTitle}</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#786593]">{emptyText}</p>
          </div>
        ) : null}

        {!loading && !error && (offerType || modality) && profiles.length === 0 && offers.length > 0 ? (
          <p className="mt-5 rounded-2xl border border-[#E7D9F0] bg-[#F7F1FB] px-4 py-3 text-sm font-bold text-[#5C4A78]">
            No hay negocios con ese filtro.
          </p>
        ) : null}

        {!loading && profiles.length > 0 ? (
          <section className="mt-7">
            <h2 className="text-base font-extrabold text-[#261743]">
              {activeSearch ? 'Negocios' : 'Negocios recientes'}
            </h2>
            <ul className="mt-3 space-y-2">
              {profiles.map((profile) => (
                <li key={profile.id}>
                  <Link
                    href={`/app/beeservices/profile/${profile.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-[#F0EAF3] bg-white px-3 py-3 hover:bg-[#FBF8FE]"
                  >
                    {profile.logo_url ? (
                      <img
                        src={profile.logo_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3EEFC] text-sm font-bold text-[#7427D5]">
                        {initials(profile.display_name)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-bold text-[#261743]">
                        <span className="truncate">{profile.display_name}</span>
                        {profile.is_verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-[#7427D5]" /> : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-[#6C7892]">
                        <MapPin className="h-3.5 w-3.5" />
                        {profile.city || 'Sin ciudad'}
                      </span>
                      {profile.modalities.length > 0 ? (
                        <span className="mt-0.5 block truncate text-[11px] text-[#8A72B2]">
                          {modalitiesLabel(profile.modalities)}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#8A72B2]" />
                  </Link>
                </li>
              ))}
            </ul>
            <Pager
              page={profilesPage}
              count={profilesCount}
              loading={pagingProfiles}
              onPage={(page) => {
                void loadFeed({
                  search: activeSearch,
                  offerType,
                  modality,
                  offersPage,
                  profilesPage: page,
                  target: 'profiles',
                });
              }}
            />
          </section>
        ) : null}

        {!loading && offers.length > 0 ? (
          <section className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-[#261743]">
                {activeSearch ? 'Productos y servicios' : 'Productos y servicios destacados'}
              </h2>
              <div className="flex rounded-xl border border-[#E7D9F0] bg-[#F7F1FB] p-0.5" role="tablist" aria-label="Cambiar vista de productos y servicios">
                <button
                  type="button"
                  role="tab"
                  aria-label="Ver productos y servicios en grilla"
                  aria-selected={offerViewMode === 'grid'}
                  onClick={() => setOfferViewMode('grid')}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    offerViewMode === 'grid' ? 'bg-[#7427D5] text-white' : 'text-[#7A579D]'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-label="Ver productos y servicios en lista"
                  aria-selected={offerViewMode === 'list'}
                  onClick={() => setOfferViewMode('list')}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    offerViewMode === 'list' ? 'bg-[#7427D5] text-white' : 'text-[#7A579D]'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ul className={offerViewMode === 'grid'
              ? 'mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3'
              : 'mt-3 space-y-2'}
            >
              {offers.map((offer) => {
                const image = primaryImage(offer);
                const discounted = offer.original_price_amount != null
                  && offer.base_price_amount != null
                  && offer.original_price_amount > offer.base_price_amount;
                return (
                  <li key={offer.id}>
                    <Link
                      href={`/app/beeservices/offer/${offer.id}`}
                      className={`flex overflow-hidden rounded-2xl border border-[#F0EAF3] bg-white hover:bg-[#FBF8FE] ${
                        offerViewMode === 'grid' ? 'flex-col' : 'items-center'
                      }`}
                    >
                      <span className={`flex shrink-0 items-center justify-center bg-[#F6EAFE] text-[#7B2DD9] ${
                        offerViewMode === 'grid' ? 'h-28 w-full' : 'h-16 w-16'
                      }`}
                      >
                        {image ? (
                          <img src={image} alt="" className="h-full w-full object-cover" />
                        ) : offer.offer_kind === 'product' ? (
                          <Package className="h-6 w-6" />
                        ) : (
                          <Wrench className="h-6 w-6" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 px-3 py-2.5">
                        <span className="block text-[11px] font-bold text-[#7642AE]">
                          {offerKindLabel(offer)}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-sm font-bold text-[#261743]">
                          {offer.title}
                        </span>
                        {offer.description ? (
                          <span className="mt-0.5 block line-clamp-2 text-xs text-[#8A72B2]">
                            {offer.description}
                          </span>
                        ) : null}
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          {discounted && offer.original_price_amount != null ? (
                            <span className="text-[11px] text-[#8A72B2] line-through">
                              {moneyCop(offer.original_price_amount)}
                            </span>
                          ) : null}
                          <span className="text-sm font-extrabold text-[#7427D5]">
                            {priceLabel(offer)}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pager
              page={offersPage}
              count={offersCount}
              loading={pagingOffers}
              onPage={(page) => {
                void loadFeed({
                  search: activeSearch,
                  offerType,
                  modality,
                  offersPage: page,
                  profilesPage,
                  target: 'offers',
                });
              }}
            />
          </section>
        ) : null}

        <footer className="flex flex-col items-center py-8">
          <p className="text-[11px] text-[#594C67]">
            Impulsando economías locales con Buddy AI
          </p>
          <span className="mt-2 h-1 w-9 rounded-full bg-[#D8AEE5]" />
        </footer>
      </div>
    </div>
  );
}

function Pager({
  page,
  count,
  loading,
  onPage,
}: {
  page: number;
  count: number;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  const pages = totalPages(count);
  if (count <= PAGE_SIZE) return null;
  const canPrevious = page > 1 && !loading;
  const canNext = page < pages && !loading;

  return (
    <div className="mt-3 flex items-center justify-between" aria-label={`Paginación, página ${page} de ${pages}`}>
      <button
        type="button"
        aria-label="Página anterior"
        disabled={!canPrevious}
        onClick={() => onPage(page - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3D7F5] text-[#7567D9] disabled:text-[#C4B8D9]"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-xs font-bold text-[#5C4A78]">
        {loading ? 'Cargando…' : `${page} de ${pages}`}
      </span>
      <button
        type="button"
        aria-label="Página siguiente"
        disabled={!canNext}
        onClick={() => onPage(page + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3D7F5] text-[#7567D9] disabled:text-[#C4B8D9]"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
