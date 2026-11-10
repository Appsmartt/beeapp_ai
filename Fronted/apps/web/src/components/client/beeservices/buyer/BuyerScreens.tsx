'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Package,
  ShoppingCart,
  Store,
  Tag,
  Wrench,
} from 'lucide-react';
import {
  createCommercialRequest,
  getCommercialRequest,
  getCommercialRequestPaymentMethods,
  getCommercialRequests,
  getPublicCommercialCatalogs,
  getPublicCommercialOffer,
  getPublicCommercialOffers,
  getPublicCommercialProfile,
  getPublicCommercialProfiles,
  openCommercialProfileChat,
  transitionCommercialRequest,
} from '@beeapp/api-client';
import type {
  CommercialModality,
  CommercialPublicOffer,
  CommercialPublicProfile,
  CommercialRequestDetail,
  CommercialRequestListItem,
} from '@beeapp/shared-types';
import { getWebAuth } from '@/lib/client/webAuth';
import { addCartLine, readBusinessCart, writeBusinessCart, type WebBusinessCart } from '@/lib/client/businessCart';
import { ListSkeleton } from '@/components/client/RouteSkeleton';
import {
  formatCommercialRequestListDate,
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

const MODALITY_LABEL: Record<CommercialModality, string> = {
  at_establishment: 'En el local',
  in_person: 'Presencial',
  virtual: 'Virtual',
  home_visit: 'A domicilio',
  delivery: 'Entrega',
  pickup: 'Recoger',
  phone_call: 'Llamada',
  buddy_chat: 'Chat Buddy',
};

export function PublicResults({ query }: { query: string }) {
  const [profiles, setProfiles] = useState<CommercialPublicProfile[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getWebAuth()
      .then((auth) => getPublicCommercialProfiles(auth, { search: query, limit: 24 }))
      .then((response) => {
        if (active) setProfiles(response.profiles);
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
  }, [query]);

  return (
    <CommercialShell title="Resultados" description={query ? `Búsqueda: ${query}` : 'Negocios publicados'} backHref="/app/beeservices">
      {loading ? <p className="text-sm text-[#8A72B2]">Buscando…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {!loading && profiles.length === 0 ? <p className="text-sm text-[#8A72B2]">No hay negocios para esta búsqueda.</p> : null}
      <ul className="space-y-2">
        {profiles.map((profile) => (
          <li key={profile.id}>
            <Link href={`/app/beeservices/profile/${profile.id}`} className="block rounded-2xl border border-[#F0EAF3] bg-white px-4 py-3 hover:bg-[#F6EAFE]">
              <span className="block text-sm font-semibold text-[#261743]">{profile.display_name}</span>
              <span className="text-xs text-[#8A72B2]">{profile.city}{profile.is_verified ? ' · Verificado' : ''}</span>
            </Link>
          </li>
        ))}
      </ul>
    </CommercialShell>
  );
}

export function PublicProfile({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CommercialPublicProfile | null>(null);
  const [offers, setOffers] = useState<CommercialPublicOffer[]>([]);
  const [catalogs, setCatalogs] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then(async (auth) => {
        const [profileResponse, offerResponse, catalogResponse] = await Promise.all([
          getPublicCommercialProfile(auth, profileId),
          getPublicCommercialOffers(auth, profileId, { limit: 40 }),
          getPublicCommercialCatalogs(auth, profileId),
        ]);
        if (!active) return;
        setProfile(profileResponse.profile);
        setOffers(offerResponse.offers);
        setCatalogs(catalogResponse.catalogs.map((catalog) => ({ id: catalog.id, name: catalog.name })));
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
      await openCommercialProfileChat(auth, profileId);
      setNotice('Chat listo. Ábrelo desde Chats.');
      router.push('/app');
    } catch (chatError) {
      setNotice(actionError(chatError));
    }
  };

  return (
    <CommercialShell title={profile?.display_name || 'Negocio'} description={profile?.city} backHref="/app/beeservices/results">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {profile ? (
        <div className="space-y-4">
          <p className="text-sm text-[#594C67]">{profile.description}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} onClick={() => void chat()}>Escribir</button>
            <Link href="/app/beeservices/cart" className={secondaryButtonClass}>Carrito</Link>
          </div>
          {catalogs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {catalogs.map((catalog) => (
                <Link key={catalog.id} href={`/app/beeservices/profile/${profileId}/catalog/${catalog.id}`} className={secondaryButtonClass}>
                  {catalog.name}
                </Link>
              ))}
            </div>
          ) : null}
          <OfferList offers={offers} profile={profile} />
          {notice ? <p className="text-sm text-[#5E1ABF]">{notice}</p> : null}
        </div>
      ) : null}
    </CommercialShell>
  );
}

function OfferList({ offers, profile }: { offers: CommercialPublicOffer[]; profile: CommercialPublicProfile }) {
  if (offers.length === 0) return <p className="text-sm text-[#8A72B2]">Este negocio aún no publica ofertas.</p>;
  return (
    <ul className="space-y-2">
      {offers.map((offer) => (
        <li key={offer.id} className="rounded-2xl border border-[#F0EAF3] bg-white px-4 py-3">
          <Link href={`/app/beeservices/offer/${offer.id}`} className="text-sm font-semibold text-[#261743]">{offer.title}</Link>
          <p className="text-xs text-[#8A72B2]">{moneyCop(offer.base_price_amount)} · {offer.offer_kind === 'service' ? 'Servicio' : 'Producto'}</p>
          <div className="mt-2 flex gap-2">
            {offer.offer_kind === 'service' ? (
              <Link href={offer.requires_booking ? `/app/beeservices/request/booking/${offer.id}` : `/app/beeservices/request/service/${offer.id}`} className={secondaryButtonClass}>
                {offer.requires_booking ? 'Reservar' : 'Solicitar'}
              </Link>
            ) : (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => addCartLine(
                  { id: profile.id, name: profile.display_name },
                  { offerId: offer.id, title: offer.title, unitPrice: offer.base_price_amount, quantity: 1, kind: 'product', requiresBooking: false },
                )}
              >
                Agregar al carrito
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PublicCatalog({ profileId, catalogId }: { profileId: string; catalogId: string }) {
  const [offers, setOffers] = useState<CommercialPublicOffer[]>([]);
  const [name, setName] = useState('Catálogo');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then(async (auth) => {
        const [catalogs, response] = await Promise.all([
          getPublicCommercialCatalogs(auth, profileId),
          getPublicCommercialOffers(auth, profileId, { catalog_id: catalogId, limit: 40 }),
        ]);
        if (!active) return;
        setName(catalogs.catalogs.find((catalog) => catalog.id === catalogId)?.name || 'Catálogo');
        setOffers(response.offers);
      })
      .catch((loadError) => {
        if (active) setError(actionError(loadError));
      });
    return () => {
      active = false;
    };
  }, [profileId, catalogId]);

  return (
    <CommercialShell title={name} backHref={`/app/beeservices/profile/${profileId}`}>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <ul className="space-y-2">
        {offers.map((offer) => (
          <li key={offer.id}>
            <Link href={`/app/beeservices/offer/${offer.id}`} className="block rounded-xl border border-[#F0EAF3] bg-white px-3 py-3 text-sm">
              <span className="font-semibold">{offer.title}</span>
              <span className="mt-1 block text-xs text-[#8A72B2]">{moneyCop(offer.base_price_amount)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </CommercialShell>
  );
}

export function PublicOffer({ offerId }: { offerId: string }) {
  const [offer, setOffer] = useState<CommercialPublicOffer | null>(null);
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then(async (auth) => {
        const response = await getPublicCommercialOffer(auth, offerId);
        const profile = await getPublicCommercialProfile(auth, response.offer.commercial_profile_id);
        if (!active) return;
        setOffer(response.offer);
        setProfileName(profile.profile.display_name);
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
    addCartLine(
      { id: offer.commercial_profile_id, name: profileName || 'Negocio' },
      {
        offerId: offer.id,
        title: offer.title,
        unitPrice: offer.base_price_amount,
        quantity: 1,
        kind: offer.offer_kind,
        requiresBooking: offer.requires_booking,
      },
    );
    setNotice('Agregado al carrito.');
  };

  return (
    <CommercialShell title={offer?.title || 'Oferta'} backHref={offer ? `/app/beeservices/profile/${offer.commercial_profile_id}` : '/app/beeservices'}>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {offer ? (
        <div className="space-y-3 text-sm">
          <p className="text-[#594C67]">{offer.description || 'Sin descripción.'}</p>
          <p className="text-xl font-semibold text-[#261743]">{moneyCop(offer.base_price_amount)}</p>
          <p className="text-xs text-[#8A72B2]">{profileName}</p>
          <div className="flex flex-wrap gap-2">
            {offer.offer_kind === 'product' ? (
              <button type="button" className={primaryButtonClass} onClick={add}>Agregar al carrito</button>
            ) : (
              <Link href={offer.requires_booking ? `/app/beeservices/request/booking/${offer.id}` : `/app/beeservices/request/service/${offer.id}`} className={primaryButtonClass}>
                {offer.requires_booking ? 'Reservar' : 'Solicitar servicio'}
              </Link>
            )}
            <Link href="/app/beeservices/cart" className={secondaryButtonClass}>Ver carrito</Link>
          </div>
          {notice ? <p className="text-[#5E1ABF]">{notice}</p> : null}
        </div>
      ) : null}
    </CommercialShell>
  );
}

export function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<WebBusinessCart | null>(null);
  const [note, setNote] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCart(readBusinessCart());
  }, []);

  const isCartEmpty = !cart || cart.lines.length === 0;

  const checkout = async () => {
    if (!cart || cart.lines.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const response = await createCommercialRequest(auth, crypto.randomUUID(), {
        request_type: cart.lines.some((line) => line.kind === 'service') ? 'mixed_request' : 'product_order',
        commercial_profile_id: cart.profileId,
        customer_note: note,
        delivery_address: address,
        items: cart.lines.map((line) => ({
          commercial_offer_id: line.offerId,
          quantity: line.quantity,
        })),
      });
      writeBusinessCart(null);
      router.push(`/app/beeservices/request/${response.request.request_id}`);
    } catch (checkoutError) {
      setError(actionError(checkoutError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CommercialShell title="Carrito" backHref="/app/beeservices">
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
          <h2 className="mt-6 text-lg font-extrabold tracking-tight text-[#432064]">Tu carrito está vacío</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#786593]">
            Explora negocios y servicios, agrega productos u ofertas y confirma tu compra desde aquí.
          </p>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link href="/app/beeservices" className={`${primaryButtonClass} w-full sm:min-w-[11rem] sm:w-auto`}>
              Explorar Buddy Services
            </Link>
            <Link href="/app/beeservices/my-purchases" className={`${secondaryButtonClass} w-full sm:min-w-[11rem] sm:w-auto`}>
              Ver mis compras
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold">{cart.profileName}</p>
          <ul className="space-y-2">
            {cart.lines.map((line) => (
              <li key={line.offerId} className="flex items-center justify-between rounded-xl border border-[#F0EAF3] bg-white px-3 py-2 text-sm">
                <span>{line.title} × {line.quantity}</span>
                <button type="button" className="text-xs text-rose-600" onClick={() => {
                  const next = { ...cart, lines: cart.lines.filter((item) => item.offerId !== line.offerId) };
                  writeBusinessCart(next.lines.length ? next : null);
                  setCart(next.lines.length ? next : null);
                }}>Quitar</button>
              </li>
            ))}
          </ul>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota para el negocio" className={fieldClass} />
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Dirección de entrega" className={fieldClass} />
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void checkout()}>
            {busy ? 'Enviando…' : 'Confirmar compra'}
          </button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
      )}
    </CommercialShell>
  );
}

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

  useEffect(() => {
    const cart = readBusinessCart();
    setCartCount(cart?.lines.reduce((total, line) => total + line.quantity, 0) || 0);
    getWebAuth()
      .then((auth) => getCommercialRequests(auth, { limit: 50 }))
      .then((response) => setRequests(response.requests))
      .catch((loadError) => setError(actionError(loadError)))
      .finally(() => setLoading(false));
  }, []);

  const cartHint = cartCount === 0
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
    <CommercialShell title="Mis compras" description="Historial, carrito y promociones" backHref="/app/beeservices" wide compact>
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
            <span className="text-2xl font-extrabold leading-none text-[#7427D5]">{loading ? '…' : requests.length}</span>
            <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Solicitudes</span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start">
          <section className="order-2 min-w-0 overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.06)] lg:order-1">
            <div className="border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:px-5">
              <h3 className="text-sm font-extrabold text-[#261743]">Historial de compras</h3>
              <p className="mt-0.5 text-xs text-[#786593]">{requestSummary}</p>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? <ListSkeleton rows={3} /> : null}

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {!loading && !error && requests.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#E7DDF2] bg-gradient-to-b from-white via-[#FCFAFD] to-[#F7F1FB] px-5 py-10 text-center sm:py-12">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E8D1F1] bg-[#F6EAFE] text-[#7427D5]">
                    <Package className="h-7 w-7" strokeWidth={1.4} aria-hidden />
                  </span>
                  <h4 className="mt-4 text-base font-extrabold text-[#261743]">Aún no tienes solicitudes</h4>
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
                                  <p className="mt-0.5 truncate text-sm font-extrabold text-[#261743]">{request.code}</p>
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
                              </div>
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1EAF6] pt-3 text-xs">
                                <span className="font-extrabold text-[#7427D5]">{moneyCop(request.total_amount)}</span>
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

export function OfferRequestForm({ offerId, booking }: { offerId: string; booking: boolean }) {
  const router = useRouter();
  const [offer, setOffer] = useState<CommercialPublicOffer | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getWebAuth()
      .then((auth) => getPublicCommercialOffer(auth, offerId))
      .then((response) => setOffer(response.offer))
      .catch((loadError) => setError(actionError(loadError)));
  }, [offerId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!offer) return;
    const form = new FormData(event.currentTarget);
    const modality = String(form.get('modality') || offer.modalities[0] || 'at_establishment') as CommercialModality;
    const starts = String(form.get('starts_at') || '');
    setBusy(true);
    try {
      const auth = await getWebAuth();
      const response = await createCommercialRequest(auth, crypto.randomUUID(), {
        request_type: booking ? 'booking_request' : 'service_request',
        commercial_profile_id: offer.commercial_profile_id,
        requested_modality: modality,
        customer_note: String(form.get('note') || ''),
        items: [{
          commercial_offer_id: offer.id,
          quantity: Number(form.get('quantity') || 1),
          requested_modality: modality,
          requested_starts_at: starts ? new Date(starts).toISOString() : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }],
      });
      router.push(`/app/beeservices/request/${response.request.request_id}`);
    } catch (submitError) {
      setError(actionError(submitError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CommercialShell title={booking ? 'Reservar' : 'Solicitar servicio'} description={offer?.title} backHref={offer ? `/app/beeservices/offer/${offer.id}` : '/app/beeservices'}>
      {offer ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <p className="text-sm text-[#594C67]">{moneyCop(offer.base_price_amount)}</p>
          <label className="block text-xs">Modalidad
            <select name="modality" className={fieldClass} defaultValue={offer.modalities[0] || 'at_establishment'}>
              {(offer.modalities.length ? offer.modalities : ['at_establishment' as CommercialModality]).map((modality) => (
                <option key={modality} value={modality}>{MODALITY_LABEL[modality]}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">Cantidad
            <input name="quantity" type="number" min={1} defaultValue={1} className={fieldClass} />
          </label>
          {booking ? (
            <label className="block text-xs">Fecha y hora
              <input name="starts_at" type="datetime-local" required className={fieldClass} />
            </label>
          ) : null}
          <textarea name="note" placeholder="Cuéntale al negocio qué necesitas" className={fieldClass} />
          <button type="submit" className={primaryButtonClass} disabled={busy}>{busy ? 'Enviando…' : 'Enviar solicitud'}</button>
        </form>
      ) : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </CommercialShell>
  );
}

export function CustomerRequestDetail({ requestId }: { requestId: string }) {
  const [request, setRequest] = useState<CommercialRequestDetail | null>(null);
  const [payments, setPayments] = useState<Array<{ id: string; display_name: string }>>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    getWebAuth()
      .then(async (auth) => {
        const [detail, methods] = await Promise.all([
          getCommercialRequest(auth, requestId),
          getCommercialRequestPaymentMethods(auth, requestId).catch(() => ({ payment_methods: [] })),
        ]);
        setRequest(detail.request);
        setPayments(methods.payment_methods.map((method) => ({ id: method.id, display_name: method.display_name })));
      })
      .catch((loadError) => setError(actionError(loadError)));
  };

  useEffect(() => {
    load();
  }, [requestId]);

  const cancel = async () => {
    try {
      const auth = await getWebAuth();
      await transitionCommercialRequest(auth, requestId, { action: 'cancel' });
      setNotice('Solicitud cancelada.');
      load();
    } catch (cancelError) {
      setNotice(actionError(cancelError));
    }
  };

  return (
    <CommercialShell title={request?.code || 'Solicitud'} backHref="/app/beeservices/my-purchases">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {request ? (
        <div className="space-y-3 text-sm">
          <p>Estado: {request.status}</p>
          <p className="text-[#594C67]">{request.customer_note || 'Sin nota'}</p>
          <ul className="space-y-2">
            {request.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-[#F0EAF3] bg-white px-3 py-2">
                {item.title} × {item.quantity} · {moneyCop(item.line_total_amount)}
              </li>
            ))}
          </ul>
          <p>Total {moneyCop(request.total_amount)}</p>
          {payments.length > 0 ? (
            <div>
              <p className="mb-1 font-semibold">Cómo pagar</p>
              <ul className="space-y-1 text-xs text-[#594C67]">
                {payments.map((method) => <li key={method.id}>{method.display_name}</li>)}
              </ul>
            </div>
          ) : null}
          <button type="button" className={secondaryButtonClass} onClick={() => void cancel()}>Cancelar solicitud</button>
          {notice ? <p className="text-[#5E1ABF]">{notice}</p> : null}
        </div>
      ) : null}
    </CommercialShell>
  );
}
