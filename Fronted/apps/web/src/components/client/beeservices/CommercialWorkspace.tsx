'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  ClipboardList,
  Clock3,
  CreditCard,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Store,
  UserRound,
  Wrench,
} from 'lucide-react';
import {
  getChatIdentities,
  getOwnedCommercialProfile,
  getOwnedCommercialProfiles,
  setChatIdentityPresence,
} from '@beeapp/api-client';
import type { CommercialOfferType, CommercialOwnedProfile } from '@beeapp/shared-types';
import ChatConversation from '@/components/client/chat/ChatConversation';
import ChatProfile from '@/components/client/chat/ChatProfile';
import { ChatRow } from '@/components/client/chat/ChatRow';
import PinLockModal from '@/components/client/chat/modals/PinLockModal';
import { ListSkeleton } from '@/components/client/RouteSkeleton';
import { ManageOffers, ManageRequests } from '@/components/client/beeservices/manage/OwnerScreens';
import type { ChatItem } from '@/lib/client/chats';
import { loadCommercialInbox } from '@/lib/client/liveData';
import { getWebAuth } from '@/lib/client/webAuth';

type CommercialModule = 'chat' | 'requests' | 'catalogs' | 'manage';

const MODULES: Array<{
  id: CommercialModule;
  label: string;
  idleClass: string;
  icon: typeof MessageCircle;
}> = [
  { id: 'chat', label: 'Chats del negocio', idleClass: 'border-[#E2D8F2] bg-[#F1ECFA] text-[#7C6AA5]', icon: MessageCircle },
  { id: 'requests', label: 'Solicitudes del negocio', idleClass: 'border-[#E0D5F2] bg-[#EEE7F8] text-[#6D4DA0]', icon: ClipboardList },
  { id: 'catalogs', label: 'Productos y servicios del negocio', idleClass: 'border-[#F5DCD1] bg-[#FBEDE7] text-[#C58B72]', icon: PackageSearch },
  { id: 'manage', label: 'Gestión del negocio', idleClass: 'border-[#D2EAE1] bg-[#E6F4EF] text-[#5D9D8C]', icon: Wrench },
];

const MANAGE_LINKS = [
  { label: 'Perfil', path: 'profile', hint: 'Nombre, ciudad y descripción', icon: UserRound },
  { label: 'Catálogos', path: 'catalogs', hint: 'Grupos de productos y servicios', icon: PackageSearch },
  { label: 'Horario', path: 'hours', hint: 'Días y horas de atención', icon: Clock3 },
  { label: 'Operación', path: 'operation', hint: 'Entrega, reservas e inventario', icon: Store },
  { label: 'Métodos de pago', path: 'payment-methods', hint: 'Cómo te pueden pagar', icon: CreditCard },
  { label: 'Métricas', path: 'metrics', hint: 'Ventas del periodo', icon: BarChart3 },
  { label: 'Verificación', path: 'verification', hint: 'Sello del negocio', icon: BadgeCheck },
] as const;

const PUBLICATION_STATUS_LABEL: Record<string, string> = {
  published: 'Publicado',
  paused: 'En pausa',
  archived: 'Archivado',
  suspended: 'Suspendido',
};

const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  not_requested: 'Sin verificar',
  draft: 'Verificación en borrador',
  pending_review: 'Verificación en revisión',
  requires_correction: 'Requiere corrección',
  verified: 'Verificado',
  rejected: 'Verificación rechazada',
  suspended: 'Verificación suspendida',
};

function catalogHeading(offerType: CommercialOfferType | undefined): string {
  if (offerType === 'products') return 'Productos';
  if (offerType === 'services') return 'Servicios';
  return 'Productos y servicios';
}

function moduleCaption(module: CommercialModule, offerType: CommercialOfferType | undefined): string {
  if (module === 'chat') return 'Chats';
  if (module === 'requests') return 'Solicitudes';
  if (module === 'catalogs') return catalogHeading(offerType);
  return 'Gestión';
}

export default function CommercialWorkspace({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CommercialOwnedProfile | null>(null);
  const [ownedBusinesses, setOwnedBusinesses] = useState<CommercialOwnedProfile[]>([]);
  const [profileError, setProfileError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [module, setModule] = useState<CommercialModule>('chat');
  const [chatOpen, setChatOpen] = useState(false);

  const loadWorkspaceProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError('');
    try {
      const auth = await getWebAuth();
      const [response, allOwned, identitiesRes] = await Promise.all([
        getOwnedCommercialProfile(auth, businessId),
        getOwnedCommercialProfiles(auth).catch(() => ({ profiles: [] as CommercialOwnedProfile[] })),
        getChatIdentities(auth).catch(() => ({ identities: [] })),
      ]);
      setProfile(response.profile);
      setOwnedBusinesses(allOwned.profiles || []);

      const commercialIdentity = (identitiesRes.identities || []).find(
        (id) => id.commercial_profile_id === businessId,
      );
      if (commercialIdentity?.id) {
        void setChatIdentityPresence(auth, commercialIdentity.id, true).catch(() => undefined);
      }
    } catch (error: unknown) {
      setProfileError(
        error instanceof Error ? error.message : 'No fue posible abrir el negocio.',
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadWorkspaceProfile();
  }, [loadWorkspaceProfile]);

  const openModule = (next: CommercialModule) => {
    setChatOpen(false);
    setModule(next);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col bg-[#F7F4FB]">
      <header className="shrink-0 border-b border-[#EEE7F3] bg-[#FFFCF9] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/app/beeservices/my-businesses')}
              aria-label="Volver a mis negocios"
              className="rounded-2xl border border-[#E7DDF2] bg-white p-2 text-[#7865AD] hover:bg-[#F6EAFE]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-extrabold uppercase tracking-wide text-[#836C98]">
                {loadingProfile ? 'Cargando' : moduleCaption(module, profile?.offer_type)}
              </p>
              <p className="truncate text-lg font-extrabold text-[#261743]">
                {profile?.display_name || 'Negocio'}
              </p>
            </div>
          </div>

          {ownedBusinesses.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#786593]">Cambiar negocio:</span>
              <select
                value={businessId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  if (nextId && nextId !== businessId) {
                    router.push(`/app/beeservices/manage/${nextId}`);
                  }
                }}
                className="h-9 rounded-xl border border-[#E7DDF2] bg-white px-3 text-xs font-bold text-[#261743] outline-none focus:border-[#7427D5]"
              >
                {ownedBusinesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.display_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-6">
        {loadingProfile ? <ListSkeleton /> : null}
        {profileError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p>{profileError}</p>
            <button
              type="button"
              onClick={() => void loadWorkspaceProfile()}
              className="mt-2 rounded-full bg-[#7427D5] px-4 py-1.5 text-xs font-semibold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : null}
        {!loadingProfile && profile ? (
          <div key={module}>
            {module === 'chat' ? (
              <CommercialChats businessId={businessId} onOpenChange={setChatOpen} />
            ) : null}
            {module === 'requests' ? <ManageRequests businessId={businessId} embedded /> : null}
            {module === 'catalogs' ? (
              <ManageOffers
                businessId={businessId}
                embedded
                heading={catalogHeading(profile.offer_type)}
              />
            ) : null}
            {module === 'manage' ? <ManageLinks businessId={businessId} profile={profile} /> : null}
          </div>
        ) : null}
      </div>

      {!chatOpen && !loadingProfile ? (
        <CommercialDock module={module} onChange={openModule} />
      ) : null}
    </div>
  );
}

function CommercialDock({
  module,
  onChange,
}: {
  module: CommercialModule;
  onChange: (next: CommercialModule) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed bottom-5 left-1/2 z-[80] flex w-[min(320px,70vw)] -translate-x-1/2 items-center justify-between rounded-[28px] border border-[#E7DFF5] bg-white/95 px-3 py-3 shadow-[0_6px_18px_rgba(141,115,201,0.22)]"
      aria-label="Menú de trabajo del negocio"
    >
      {MODULES.map((item) => {
        const Icon = item.icon;
        const active = module === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            onClick={() => onChange(item.id)}
            className={`flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border ${
              active
                ? '-translate-y-1 border-transparent bg-[#7427D5] text-white shadow-[0_3px_8px_rgba(116,39,213,0.3)]'
                : item.idleClass
            }`}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

function ManageLinks({
  businessId,
  profile,
}: {
  businessId: string;
  profile: CommercialOwnedProfile;
}) {
  const hoursConfigured = Boolean(
    profile.hours && profile.hours.length > 0 && profile.hours.some((h) => !h.is_closed),
  );
  const pubLabel =
    PUBLICATION_STATUS_LABEL[profile.publication_status] || profile.publication_status;
  const verLabel =
    VERIFICATION_STATUS_LABEL[profile.verification_status] || profile.verification_status;

  return (
    <div className="space-y-4 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo_url}
              alt={profile.display_name}
              className="h-12 w-12 rounded-2xl object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6EAFE] text-sm font-extrabold text-[#7427D5]">
              {profile.display_name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div>
            <h2 className="text-base font-extrabold text-[#261743]">{profile.display_name}</h2>
            <p className="text-xs text-[#594C67]">
              {profile.city}, {profile.country_code} · {pubLabel} · {verLabel}
            </p>
          </div>
        </div>
        <Link
          href={`/app/beeservices/profile/${businessId}`}
          className="rounded-full border border-[#E2D6F0] bg-[#FAF4FF] px-3.5 py-1.5 text-xs font-extrabold text-[#7427D5]"
        >
          Ver perfil público
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MANAGE_LINKS.map((item) => {
          const Icon = item.icon;
          const showUnconfiguredBadge = item.path === 'hours' && !hoursConfigured;
          return (
            <Link
              key={item.path}
              href={`/app/beeservices/manage/${businessId}/${item.path}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-[#E7DDF2] bg-white p-4 shadow-[0_8px_24px_rgba(116,39,213,0.04)] hover:border-[#C9A8E8]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#F6EAFE] text-[#7427D5]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-[#261743]">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-[#786593]">{item.hint}</span>
                </span>
              </div>

              {showUnconfiguredBadge ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                  Sin configurar
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CommercialChats({
  businessId,
  onOpenChange,
}: {
  businessId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [selected, setSelected] = useState<ChatItem | null>(null);
  const [viewingProfile, setViewingProfile] = useState(false);
  const [lockedChat, setLockedChat] = useState<ChatItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadChats = useCallback(() => {
    setLoading(true);
    setError('');
    setSelected(null);
    setViewingProfile(false);
    onOpenChange(false);
    loadCommercialInbox(businessId)
      .then((items) => {
        setChats(items);
      })
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error ? loadError.message : 'No fue posible cargar los chats.',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [businessId, onOpenChange]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  if (selected && viewingProfile) {
    return (
      <div className="h-[calc(100vh-180px)] min-h-[420px] overflow-hidden rounded-2xl border border-[#F0EAF3] bg-white">
        <ChatProfile
          chat={selected}
          onBack={() => setViewingProfile(false)}
          onChatUpdated={(patch) => setSelected((curr) => (curr ? { ...curr, ...patch } : null))}
          onChatDeleted={(deletedId) => {
            setChats((prev) => prev.filter((c) => c.id !== deletedId));
            setSelected(null);
            setViewingProfile(false);
            onOpenChange(false);
          }}
        />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="h-[calc(100vh-180px)] min-h-[420px] overflow-hidden rounded-2xl border border-[#F0EAF3] bg-white">
        <ChatConversation
          chat={selected}
          onBack={() => {
            setSelected(null);
            onOpenChange(false);
          }}
          onOpenProfile={() => setViewingProfile(true)}
        />
      </div>
    );
  }

  if (loading) return <ListSkeleton />;
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        <p>{error}</p>
        <button
          type="button"
          onClick={loadChats}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#7427D5] px-4 py-1.5 text-xs font-semibold text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      </div>
    );
  }
  if (chats.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[#E7DDF2] bg-white px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
          <MessageCircle className="h-7 w-7" />
        </span>
        <p className="mt-4 text-base font-extrabold text-[#261743]">No hay chats de este negocio</p>
        <p className="mt-1 max-w-sm text-sm text-[#786593]">
          Cuando un cliente te escriba, la conversación aparecerá en este espacio.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#F0EAF3] bg-white">
      {chats.map((chat) => (
        <ChatRow
          key={chat.id}
          chat={chat}
          isSelected={false}
          onClick={() => {
            if (chat.isProtected) {
              setLockedChat(chat);
              return;
            }
            setSelected(chat);
            onOpenChange(true);
          }}
        />
      ))}
      <PinLockModal
        visible={!!lockedChat}
        itemName={lockedChat?.name}
        onClose={() => setLockedChat(null)}
        onSuccess={() => {
          if (!lockedChat) return;
          setSelected(lockedChat);
          setLockedChat(null);
          onOpenChange(true);
        }}
      />
    </div>
  );
}
