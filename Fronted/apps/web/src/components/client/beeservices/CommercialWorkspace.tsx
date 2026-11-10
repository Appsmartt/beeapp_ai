'use client';

import { useEffect, useState } from 'react';
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
  Store,
  UserRound,
  Wrench,
} from 'lucide-react';
import {
  getOwnedCommercialProfile,
} from '@beeapp/api-client';
import type { CommercialOfferType, CommercialOwnedProfile } from '@beeapp/shared-types';
import ChatConversation from '@/components/client/chat/ChatConversation';
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
  { label: 'Horario', path: 'hours', hint: 'Días y horas de atención', icon: Clock3 },
  { label: 'Operación', path: 'operation', hint: 'Entrega, reservas e inventario', icon: Store },
  { label: 'Métodos de pago', path: 'payment-methods', hint: 'Cómo te pueden pagar', icon: CreditCard },
  { label: 'Métricas', path: 'metrics', hint: 'Ventas del periodo', icon: BarChart3 },
  { label: 'Verificación', path: 'verification', hint: 'Sello del negocio', icon: BadgeCheck },
] as const;

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
  const [profileError, setProfileError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [module, setModule] = useState<CommercialModule>('chat');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingProfile(true);
    setProfileError('');
    getWebAuth()
      .then((auth) => getOwnedCommercialProfile(auth, businessId))
      .then((response) => {
        if (active) setProfile(response.profile);
      })
      .catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : 'No fue posible abrir el negocio.');
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [businessId]);

  const openModule = (next: CommercialModule) => {
    setChatOpen(false);
    setModule(next);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col bg-[#F7F4FB]">
      <header className="shrink-0 border-b border-[#EEE7F3] bg-[#FFFCF9] px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
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
            <p className="truncate text-lg font-extrabold text-[#261743]">{profile?.display_name || 'Negocio'}</p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-6">
        {loadingProfile ? <ListSkeleton /> : null}
        {profileError ? <p className="text-sm text-rose-600">{profileError}</p> : null}
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
  return (
    <div className="space-y-4 pb-28">
      <p className="text-sm text-[#594C67]">
        {profile.city} · {profile.publication_status === 'published' ? 'Publicado' : profile.publication_status} · {profile.verification_status}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {MANAGE_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={`/app/beeservices/manage/${businessId}/${item.path}`}
              className="flex items-center gap-3 rounded-[18px] border border-[#E7DDF2] bg-white p-4 shadow-[0_8px_24px_rgba(116,39,213,0.04)] hover:border-[#C9A8E8]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#F6EAFE] text-[#7427D5]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-[#261743]">{item.label}</span>
                <span className="mt-0.5 block text-xs text-[#786593]">{item.hint}</span>
              </span>
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
  const [lockedChat, setLockedChat] = useState<ChatItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSelected(null);
    onOpenChange(false);
    loadCommercialInbox(businessId)
      .then((items) => {
        if (active) setChats(items);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los chats.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, onOpenChange]);

  if (selected) {
    return (
      <div className="h-[calc(100vh-180px)] min-h-[420px] overflow-hidden rounded-2xl border border-[#F0EAF3] bg-white">
        <ChatConversation
          chat={selected}
          onBack={() => {
            setSelected(null);
            onOpenChange(false);
          }}
          onOpenProfile={() => undefined}
        />
      </div>
    );
  }

  if (loading) return <ListSkeleton />;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (chats.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[#E7DDF2] bg-white px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
          <MessageCircle className="h-7 w-7" />
        </span>
        <p className="mt-4 text-base font-extrabold text-[#261743]">No hay chats de este negocio</p>
        <p className="mt-1 max-w-sm text-sm text-[#786593]">Cuando un cliente te escriba, la conversación aparecerá en este espacio.</p>
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
