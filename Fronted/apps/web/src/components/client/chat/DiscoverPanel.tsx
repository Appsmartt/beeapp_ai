'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Info,
  CheckCircle2,
  Check,
  Search,
  UserPlus,
  UserCheck,
  X,
  Building2,
  User,
} from 'lucide-react';
import {
  acceptStatusFollowRequest,
  createStatusFollow,
  deleteStatusFollow,
  discoverStatusFollowTargets,
  getStatusFollowRequests,
  getStatusFollowers,
  getStatusFollowing,
  rejectStatusFollowRequest,
} from '@beeapp/api-client';
import type {
  StatusFollowDiscoverTarget,
  StatusFollowRelationshipItem,
} from '@beeapp/shared-types';
import { ContactItem, contactColor, contactInitials } from '@/lib/client/contacts';
import { getWebAuth, loadDiscoverContacts } from '@/lib/client/liveData';

interface DiscoverPanelProps {
  selectedContactId?: string;
  onSelectContact: (contact: ContactItem) => void;
}

type SocialSubTab = 'discover' | 'following' | 'followers' | 'requests';

export default function DiscoverPanel({
  selectedContactId,
  onSelectContact,
}: DiscoverPanelProps) {
  const [subTab, setSubTab] = useState<SocialSubTab>('discover');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [targets, setTargets] = useState<StatusFollowDiscoverTarget[]>([]);
  const [networkContacts, setNetworkContacts] = useState<ContactItem[]>([]);
  const [following, setFollowing] = useState<StatusFollowRelationshipItem[]>([]);
  const [followers, setFollowers] = useState<StatusFollowRelationshipItem[]>([]);
  const [requests, setRequests] = useState<StatusFollowRelationshipItem[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadAll = useCallback(async (searchText: string) => {
    setLoading(true);
    try {
      const auth = await getWebAuth();
      const [discoverRes, followingRes, followersRes, requestsRes, fallbackContacts] = await Promise.all([
        discoverStatusFollowTargets(auth, { q: searchText.trim() || undefined, limit: 30 }).catch(() => ({ items: [] as StatusFollowDiscoverTarget[] })),
        getStatusFollowing(auth, { limit: 50 }).catch(() => ({ items: [] as StatusFollowRelationshipItem[] })),
        getStatusFollowers(auth, { limit: 50 }).catch(() => ({ items: [] as StatusFollowRelationshipItem[] })),
        getStatusFollowRequests(auth, { limit: 50 }).catch(() => ({ items: [] as StatusFollowRelationshipItem[] })),
        loadDiscoverContacts().catch(() => [] as ContactItem[]),
      ]);
      setTargets(discoverRes.items || []);
      setFollowing(followingRes.items || []);
      setFollowers(followersRes.items || []);
      setRequests(requestsRes.items || []);
      setNetworkContacts(fallbackContacts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll(query);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, loadAll]);

  const handleFollowTarget = async (e: React.MouseEvent, target: StatusFollowDiscoverTarget) => {
    e.stopPropagation();
    const key = `${target.actor.actor_type}:${target.actor.actor_id}`;
    setBusyKey(key);
    try {
      const auth = await getWebAuth();
      if (target.relationship.outgoing_follow_id) {
        await deleteStatusFollow(auth, target.relationship.outgoing_follow_id);
      } else {
        await createStatusFollow(auth, {
          target_actor_type: target.actor.actor_type,
          ...(target.actor.actor_type === 'profile'
            ? { target_profile_id: target.actor.actor_id }
            : { target_commercial_profile_id: target.actor.actor_id }),
        });
      }
      await loadAll(query);
    } catch {
      // ignore error
    } finally {
      setBusyKey(null);
    }
  };

  const handleUnfollow = async (e: React.MouseEvent, followId: string) => {
    e.stopPropagation();
    setBusyKey(followId);
    try {
      const auth = await getWebAuth();
      await deleteStatusFollow(auth, followId);
      await loadAll(query);
    } catch {
      // ignore
    } finally {
      setBusyKey(null);
    }
  };

  const handleAcceptRequest = async (e: React.MouseEvent, followId: string) => {
    e.stopPropagation();
    setBusyKey(followId);
    try {
      const auth = await getWebAuth();
      await acceptStatusFollowRequest(auth, followId);
      await loadAll(query);
    } catch {
      // ignore
    } finally {
      setBusyKey(null);
    }
  };

  const handleRejectRequest = async (e: React.MouseEvent, followId: string) => {
    e.stopPropagation();
    setBusyKey(followId);
    try {
      const auth = await getWebAuth();
      await rejectStatusFollowRequest(auth, followId);
      await loadAll(query);
    } catch {
      // ignore
    } finally {
      setBusyKey(null);
    }
  };

  const actorToContact = (actor: {
    actor_id: string;
    actor_type: string;
    display_name: string;
    subtitle?: string | null;
    is_verified?: boolean;
  }): ContactItem => ({
    id: actor.actor_id,
    name: actor.display_name || 'Usuario',
    profession: actor.subtitle || (actor.actor_type === 'commercial_profile' ? 'Perfil comercial' : 'Red Buddy'),
    activity: actor.subtitle || '',
    interests: [],
    initials: contactInitials(actor.display_name || 'U'),
    color: contactColor(actor.actor_id),
    verified: Boolean(actor.is_verified),
    isDiscovery: true,
    linkedUserId: actor.actor_id,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Aviso informativo */}
      <div className="p-3 px-4 bg-brand-primary/5 border-b border-brand-primary/10 flex items-start gap-2 text-[11px] text-brand-primary font-normal shrink-0">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Descubre personas y negocios en la red de estados y administra tus seguidores y solicitudes.
        </span>
      </div>

      {/* Buscador */}
      <div className="px-4 pt-3 pb-2 border-b border-neutral-100">
        <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2">
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar personas o negocios..."
            className="w-full bg-transparent text-xs text-neutral-800 outline-none placeholder:text-neutral-400"
          />
        </div>

        {/* Sub-pestañas de red social */}
        <div className="mt-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'discover', label: 'Descubrir', count: targets.length || networkContacts.length },
              { id: 'following', label: 'Siguiendo', count: following.length },
              { id: 'followers', label: 'Seguidores', count: followers.length },
              { id: 'requests', label: 'Solicitudes', count: requests.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                subTab === tab.id
                  ? 'bg-brand-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    subTab === tab.id ? 'bg-white/20 text-white' : 'bg-white text-neutral-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido por sub-pestaña */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {loading && targets.length === 0 && networkContacts.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">Cargando red...</div>
        ) : subTab === 'discover' ? (
          targets.length > 0 ? (
            targets.map((target) => {
              const contact = actorToContact(target.actor);
              const isSelected = selectedContactId === contact.id;
              const status = target.relationship.outgoing_status;
              const key = `${target.actor.actor_type}:${target.actor.actor_id}`;
              const isBusy = busyKey === key;

              return (
                <div
                  key={key}
                  onClick={() => onSelectContact(contact)}
                  className={`px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors ${
                    isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0 overflow-hidden"
                      style={{ backgroundColor: contact.color }}
                    >
                      {target.actor.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={target.actor.avatar_url}
                          alt={contact.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        contact.initials
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-xs text-neutral-900 truncate">
                          {contact.name}
                        </span>
                        {target.actor.is_verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        )}
                        {target.actor.actor_type === 'commercial_profile' ? (
                          <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                        ) : (
                          <User className="w-3 h-3 text-neutral-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                        {contact.profession}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={(e) => void handleFollowTarget(e, target)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0 flex items-center gap-1 ${
                      status === 'accepted' || status === 'pending'
                        ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        : 'bg-brand-primary text-white hover:bg-brand-dark'
                    }`}
                  >
                    {status === 'accepted' ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Siguiendo</span>
                      </>
                    ) : status === 'pending' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Solicitado</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Seguir</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            networkContacts
              .filter((c) => !query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase()))
              .map((contact) => {
                const isSelected = selectedContactId === contact.id;
                return (
                  <div
                    key={contact.id}
                    onClick={() => onSelectContact(contact)}
                    className={`px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors ${
                      isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                        style={{ backgroundColor: contact.color || '#F3E8FF' }}
                      >
                        {contact.initials}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-neutral-900 truncate block">
                          {contact.name}
                        </span>
                        <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                          {contact.profession}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
          )
        ) : subTab === 'following' ? (
          following.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              Aún no sigues a personas o negocios en Estados.
            </div>
          ) : (
            following.map((item) => {
              const contact = actorToContact(item.target);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectContact(contact)}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                      style={{ backgroundColor: contact.color }}
                    >
                      {contact.initials}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-neutral-900 truncate block">
                        {contact.name}
                      </span>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {item.status === 'pending' ? 'Solicitud pendiente' : contact.profession}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyKey === item.id}
                    onClick={(e) => void handleUnfollow(e, item.id)}
                    className="px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 hover:bg-red-50 hover:text-red-600 text-xs font-semibold transition-colors"
                  >
                    Dejar de seguir
                  </button>
                </div>
              );
            })
          )
        ) : subTab === 'followers' ? (
          followers.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              Aún no tienes seguidores en Estados.
            </div>
          ) : (
            followers.map((item) => {
              const contact = actorToContact(item.follower);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectContact(contact)}
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                      style={{ backgroundColor: contact.color }}
                    >
                      {contact.initials}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-neutral-900 truncate block">
                        {contact.name}
                      </span>
                      <p className="text-[11px] text-neutral-500 truncate">{contact.profession}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            No tienes solicitudes de seguimiento pendientes.
          </div>
        ) : (
          requests.map((item) => {
            const contact = actorToContact(item.follower);
            return (
              <div
                key={item.id}
                onClick={() => onSelectContact(contact)}
                className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-brand-primary shrink-0"
                    style={{ backgroundColor: contact.color }}
                  >
                    {contact.initials}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-neutral-900 truncate block">
                      {contact.name}
                    </span>
                    <p className="text-[11px] text-neutral-500 truncate">Quiere ver tus estados</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busyKey === item.id}
                    onClick={(e) => void handleAcceptRequest(e, item.id)}
                    className="px-2.5 py-1 rounded-full bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Aceptar</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === item.id}
                    onClick={(e) => void handleRejectRequest(e, item.id)}
                    className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-red-50 hover:text-red-600"
                    title="Rechazar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
