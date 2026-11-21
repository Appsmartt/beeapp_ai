'use client';

import { useEffect, useRef, useState } from 'react';
import {
  cancelChatGroupInvite,
  clearChatConversation,
  deactivateChatGroup,
  getChatContactProfile,
  getChatConversation,
  getChatGroupInvitesForConversation,
  getChatParticipants,
  inviteToChatGroup,
  leaveChatGroup,
  removeChatGroupParticipant,
  setChatGroupParticipantRole,
  setConversationDisappearing,
  transferChatGroupOwnership,
  updateChatConversationNotifications,
  updateChatGroup,
  uploadCurrentWebStorageFiles,
} from '@beeapp/api-client';
import type { ChatContactProfile, ChatGroupInvite } from '@beeapp/shared-types';
import {
  ArrowLeft,
  BellOff,
  Camera,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { getWebAuth } from '@/lib/client/webAuth';
import {
  disappearingIntervalToSeconds,
  secondsToDisappearingInterval,
} from '@/lib/client/disappearingMessages';
import { ChatItem, GroupMember } from '@/lib/client/chats';
import { contactColor, contactInitials } from '@/lib/client/contacts';
import { ChatAvatar } from './ChatAvatar';
import MemberListSection from './MemberListSection';
import AddMemberModal from './modals/AddMemberModal';
import DisappearingMessagesModal, {
  DisappearingInterval,
  disappearingLabel,
} from './modals/DisappearingMessagesModal';

interface ChatProfileProps {
  chat: ChatItem;
  onBack: () => void;
  onChatUpdated?: (patch: Partial<ChatItem>) => void;
  onChatDeleted?: (chatId: string) => void;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

export default function ChatProfile({
  chat,
  onBack,
  onChatUpdated,
  onChatDeleted,
}: ChatProfileProps) {
  const isGroup = !!chat.isGroup;
  const identityId = chat.postingIdentityId;

  const [name, setName] = useState(chat.name);
  const [description, setDescription] = useState(chat.description || '');
  const [postingPolicy, setPostingPolicy] = useState<'all_members' | 'admins_only'>(
    chat.postingPolicy || 'all_members',
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(chat.avatarUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>(chat.members ?? []);
  const [pendingInvites, setPendingInvites] = useState<ChatGroupInvite[]>([]);
  const [contactProfile, setContactProfile] = useState<ChatContactProfile | null>(null);
  const [muted, setMuted] = useState(!!chat.isMuted);
  const [notice, setNotice] = useState('');

  const initialSeconds = chat.disappearingSeconds ?? null;
  const [disappearingOn, setDisappearingOn] = useState(Boolean(initialSeconds && initialSeconds > 0));
  const [interval, setIntervalValue] = useState<DisappearingInterval>(
    secondsToDisappearingInterval(initialSeconds) || '24h',
  );
  const [intervalModal, setIntervalModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void getWebAuth()
      .then(async (auth) => {
        if (isGroup) {
          const [convRes, partRes, invRes] = await Promise.all([
            getChatConversation(auth, chat.id).catch(() => null),
            getChatParticipants(auth, chat.id).catch(() => null),
            getChatGroupInvitesForConversation(auth, chat.id, { status: 'pending', limit: 50 }).catch(() => null),
          ]);
          if (!active) return;
          if (convRes?.conversation) {
            const conv = convRes.conversation;
            setName(conv.name || chat.name);
            setDescription(conv.description || '');
            const pol = (conv as { posting_policy?: string }).posting_policy;
            if (pol === 'admins_only' || pol === 'all_members') setPostingPolicy(pol);
            if (conv.avatar_url) setAvatarUrl(conv.avatar_url);
            const sec = (conv as { disappearing_seconds?: number | null }).disappearing_seconds ?? null;
            setDisappearingOn(Boolean(sec && sec > 0));
            const mappedInterval = secondsToDisappearingInterval(sec);
            if (mappedInterval) setIntervalValue(mappedInterval);
          }
          if (partRes?.participants) {
            setMembers(
              partRes.participants.map((p) => {
                const mName =
                  [p.user?.first_name, p.user?.last_name].filter(Boolean).join(' ') ||
                  'Miembro';
                const pId = p.identity_id || p.id;
                const role =
                  p.role === 'owner'
                    ? ('owner' as const)
                    : p.role === 'admin'
                      ? ('admin' as const)
                      : ('member' as const);
                return {
                  id: pId,
                  name: mName,
                  role,
                  initials: contactInitials(mName),
                  color: contactColor(pId),
                  isCurrentUser: pId === identityId,
                };
              }),
            );
          }
          if (invRes?.invites) {
            setPendingInvites(invRes.invites);
          }
        } else if (chat.peerIdentityId) {
          const profileRes = await getChatContactProfile(auth, chat.peerIdentityId).catch(() => null);
          if (active && profileRes?.contact) {
            setContactProfile(profileRes.contact);
          }
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [chat.id, chat.name, chat.peerIdentityId, identityId, isGroup]);

  const currentMember = members.find((m) => m.isCurrentUser);
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = isOwner || currentMember?.role === 'admin';

  const meta = isGroup
    ? `${members.length} ${members.length === 1 ? 'miembro' : 'miembros'}`
    : contactProfile?.occupation || 'Contacto de Buddy';

  const saveGroupMetadata = async (patch: {
    name?: string;
    description?: string | null;
    posting_policy?: 'all_members' | 'admins_only';
    image_file_id?: string | null;
  }) => {
    if (!isGroup || !isAdmin || !identityId) return;
    try {
      const auth = await getWebAuth();
      await updateChatGroup(auth, chat.id, {
        actor_identity_id: identityId,
        ...patch,
      });
      onChatUpdated?.({
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.posting_policy ? { postingPolicy: patch.posting_policy } : {}),
      });
      setNotice('Cambios del grupo guardados.');
      window.setTimeout(() => setNotice(''), 2200);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No fue posible actualizar el grupo.');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !isGroup || !isAdmin || !identityId) return;
    setUploadingPhoto(true);
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('files', file);
      const uploaded = await uploadCurrentWebStorageFiles(formData);
      const uploadedFile = uploaded.files?.[0];
      if (!uploadedFile?.id) throw new Error('No se pudo subir la imagen.');
      const localUrl = URL.createObjectURL(file);
      setAvatarUrl(localUrl);
      await saveGroupMetadata({ image_file_id: uploadedFile.id });
      onChatUpdated?.({ avatarUrl: localUrl });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo cambiar la foto del grupo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleDisappearing = (val: boolean) => {
    setDisappearingOn(val);
    if (val) {
      setIntervalModal(true);
    } else {
      void setConversationDisappearing(chat.id, null)
        .then(() => {
          onChatUpdated?.({ disappearingSeconds: null });
        })
        .catch(() => undefined);
    }
  };

  const handleConfirmLeaveOrDelete = () => {
    if (!identityId) {
      onBack();
      return;
    }
    if (!isGroup) {
      if (!confirm('¿Seguro que quieres eliminar esta conversación?')) return;
      void getWebAuth()
        .then((auth) => clearChatConversation(auth, chat.id, { identity_id: identityId }))
        .then(() => {
          onChatDeleted?.(chat.id);
          onBack();
        })
        .catch(() => onBack());
      return;
    }

    if (isOwner && members.length > 1) {
      setNotice('Transfiere la propiedad a otro miembro antes de salir, o desactiva el grupo.');
      return;
    }

    if (!confirm('¿Seguro que quieres salir de este grupo?')) return;
    void getWebAuth()
      .then((auth) => leaveChatGroup(auth, chat.id, { identity_id: identityId }))
      .then(() => {
        onChatDeleted?.(chat.id);
        onBack();
      })
      .catch((err) => {
        setNotice(err instanceof Error ? err.message : 'No fue posible salir del grupo.');
      });
  };

  const handleDeactivateGroup = () => {
    if (!isGroup || !isOwner || !identityId) return;
    if (!confirm('¿Desactivar y eliminar este grupo para todos los miembros?')) return;
    void getWebAuth()
      .then((auth) => deactivateChatGroup(auth, chat.id, { owner_identity_id: identityId }))
      .then(() => {
        onChatDeleted?.(chat.id);
        onBack();
      })
      .catch((err) => {
        setNotice(err instanceof Error ? err.message : 'No fue posible desactivar el grupo.');
      });
  };

  const handleTransferOwnership = (member: GroupMember) => {
    if (!isGroup || !isOwner || !identityId) return;
    if (!confirm(`¿Transferir la propiedad del grupo a ${member.name}?`)) return;
    void getWebAuth()
      .then((auth) =>
        transferChatGroupOwnership(auth, chat.id, {
          current_owner_identity_id: identityId,
          new_owner_identity_id: member.id,
        }),
      )
      .then(() => {
        setMembers((list) =>
          list.map((item) => {
            if (item.id === member.id) return { ...item, role: 'owner' };
            if (item.isCurrentUser) return { ...item, role: 'admin' };
            return item;
          }),
        );
        setNotice(`Propiedad transferida a ${member.name}.`);
      })
      .catch((err) => {
        setNotice(err instanceof Error ? err.message : 'No fue posible transferir la propiedad.');
      });
  };

  const handleCancelInvite = (inviteId: string) => {
    if (!identityId) return;
    void getWebAuth()
      .then((auth) => cancelChatGroupInvite(auth, chat.id, inviteId, { actor_identity_id: identityId }))
      .then(() => {
        setPendingInvites((list) => list.filter((item) => item.id !== inviteId));
      })
      .catch(() => undefined);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (!identityId) return;
    void getWebAuth()
      .then((auth) =>
        updateChatConversationNotifications(auth, chat.id, {
          identity_id: identityId,
          notifications_enabled: !next,
        }),
      )
      .then(() => onChatUpdated?.({ isMuted: next }))
      .catch(() => setMuted(!next));
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-neutral-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ml-1 text-sm font-semibold text-neutral-900">
          {isGroup ? 'Perfil del grupo' : 'Perfil del contacto'}
        </h1>
      </div>

      <div className="mx-auto min-h-0 w-full max-w-lg flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <div className="space-y-3 text-center">
          <div className="relative mx-auto h-20 w-20">
            <ChatAvatar
              name={name}
              avatarUrl={avatarUrl}
              isGroup={isGroup}
              size="lg"
              initials={initialsOf(name)}
            />
            {isGroup && isAdmin ? (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handlePhotoUpload(e)}
                />
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-white shadow-xs disabled:opacity-50"
                  aria-label="Cambiar foto del grupo"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
              </>
            ) : null}
          </div>

          <div className="space-y-1">
            {isGroup && isAdmin ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim() && name.trim() !== chat.name) {
                    void saveGroupMetadata({ name: name.trim() });
                  }
                }}
                className="border-b border-transparent px-2 py-0.5 text-center text-lg font-bold text-neutral-900 outline-none focus:border-brand-primary"
              />
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-neutral-900">
                <span>{name}</span>
                {chat.verified ? (
                  <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-brand-primary" />
                ) : null}
              </div>
            )}
            <p className="text-xs font-normal text-neutral-500">{meta}</p>
          </div>

          {isGroup ? (
            <div className="mx-auto max-w-md space-y-2 pt-1 text-left">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Descripción del grupo
                </label>
                {isAdmin ? (
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => void saveGroupMetadata({ description: description.trim() || null })}
                    placeholder="Agrega una descripción para el grupo..."
                    className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-xs text-neutral-800 outline-none focus:border-brand-primary"
                  />
                ) : (
                  <p className="mt-1 text-xs text-neutral-600">
                    {description || 'Sin descripción.'}
                  </p>
                )}
              </div>

              {isAdmin ? (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Permisos de envío
                  </label>
                  <select
                    value={postingPolicy}
                    onChange={(e) => {
                      const next = e.target.value as 'all_members' | 'admins_only';
                      setPostingPolicy(next);
                      void saveGroupMetadata({ posting_policy: next });
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-800 outline-none focus:border-brand-primary"
                  >
                    <option value="all_members">Todos los miembros pueden enviar mensajes</option>
                    <option value="admins_only">Solo administradores pueden enviar mensajes</option>
                  </select>
                </div>
              ) : null}
            </div>
          ) : contactProfile && contactProfile.location ? (
            <div className="mx-auto max-w-md space-y-1.5 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-3.5 text-left text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-brand-primary" />
                <span>{contactProfile.location}</span>
              </div>
            </div>
          ) : null}
        </div>

        {notice ? (
          <p className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 text-center text-xs font-medium text-brand-primary">
            {notice}
          </p>
        ) : null}

        <div className="h-px bg-neutral-100" />

        <div className="flex items-center justify-between py-2">
          <div
            onClick={() => disappearingOn && setIntervalModal(true)}
            className={`flex min-w-0 flex-1 items-center gap-3 ${
              disappearingOn ? 'cursor-pointer hover:opacity-80' : ''
            }`}
          >
            <Timer className="h-5 w-5 shrink-0 text-neutral-500" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900">Mensajes temporales</p>
              <p className="truncate text-[11px] font-normal text-neutral-500">
                {disappearingOn ? disappearingLabel(interval) : 'Desactivado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleDisappearing(!disappearingOn)}
            className={`relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
              disappearingOn ? 'bg-brand-primary' : 'bg-neutral-300'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                disappearingOn ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isGroup ? (
          <>
            <div className="h-px bg-neutral-100" />
            <MemberListSection
              members={members}
              canManage={isAdmin}
              canTransferOwnership={isOwner}
              onAdd={() => setAddMemberModal(true)}
              onRemove={(memberId) => {
                setMembers((list) => list.filter((m) => m.id !== memberId));
                if (!identityId) return;
                void getWebAuth()
                  .then((auth) =>
                    removeChatGroupParticipant(auth, chat.id, memberId, {
                      actor_identity_id: identityId,
                    }),
                  )
                  .catch(() => undefined);
              }}
              onToggleRole={(member) => {
                if (!identityId) return;
                const role = member.role === 'admin' ? 'member' : 'admin';
                setMembers((list) =>
                  list.map((item) => (item.id === member.id ? { ...item, role } : item)),
                );
                void getWebAuth()
                  .then((auth) =>
                    setChatGroupParticipantRole(auth, chat.id, member.id, {
                      actor_identity_id: identityId,
                      role,
                    }),
                  )
                  .catch(() => undefined);
              }}
              onTransferOwnership={handleTransferOwnership}
            />

            {isAdmin && pendingInvites.length > 0 ? (
              <div className="space-y-2 border-t border-neutral-100 pt-3">
                <h4 className="text-xs font-semibold text-neutral-700">
                  Invitaciones pendientes ({pendingInvites.length})
                </h4>
                <div className="divide-y divide-neutral-100">
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-2 text-xs">
                      <span className="truncate text-neutral-700">
                        {inv.invited_identity?.display_name || 'Usuario invitado'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelInvite(inv.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="h-px bg-neutral-100" />

        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-3">
            <div className="flex items-center gap-3">
              <BellOff className="h-5 w-5 text-neutral-500" />
              <span className="text-xs font-semibold text-neutral-800">Silenciar notificaciones</span>
            </div>
            <button
              type="button"
              onClick={toggleMute}
              className={`relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                muted ? 'bg-brand-primary' : 'bg-neutral-300'
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full bg-white transition-transform ${
                  muted ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="h-px bg-neutral-100" />

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleConfirmLeaveOrDelete}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-3.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            <span>{isGroup ? 'Salir del grupo' : 'Eliminar chat'}</span>
          </button>

          {isGroup && isOwner ? (
            <button
              type="button"
              onClick={handleDeactivateGroup}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-100 py-3.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200"
            >
              <Trash2 className="h-4 w-4" />
              <span>Desactivar y eliminar grupo</span>
            </button>
          ) : null}
        </div>
      </div>

      <DisappearingMessagesModal
        visible={intervalModal}
        value={interval}
        onSave={(next) => {
          setIntervalValue(next);
          setIntervalModal(false);
          const secs = disappearingIntervalToSeconds(next);
          void setConversationDisappearing(chat.id, secs)
            .then(() => onChatUpdated?.({ disappearingSeconds: secs }))
            .catch(() => undefined);
        }}
        onClose={() => setIntervalModal(false)}
      />

      <AddMemberModal
        visible={addMemberModal}
        memberIds={members.map((m) => m.id)}
        onAdd={(added) => {
          setAddMemberModal(false);
          if (!identityId) return;
          void getWebAuth()
            .then(async (auth) => {
              for (const member of added) {
                const invitedRes = await inviteToChatGroup(auth, chat.id, {
                  actor_identity_id: identityId,
                  invited_identity_id: member.id,
                }).catch(() => null);
                if (invitedRes?.invite) {
                  setPendingInvites((prev) => [...prev, invitedRes.invite]);
                }
              }
              setNotice('Invitaciones enviadas.');
              window.setTimeout(() => setNotice(''), 2200);
            })
            .catch(() => undefined);
        }}
        onClose={() => setAddMemberModal(false)}
      />
    </div>
  );
}
