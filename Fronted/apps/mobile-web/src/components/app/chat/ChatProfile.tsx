'use client';

import { useState } from 'react';
import { ArrowLeft, Timer, BellOff, Search, Image as ImageIcon, LogOut, ShieldCheck, Camera } from 'lucide-react';
import { ChatItem, GroupMember } from '@/mocks/chats';
import { MY_CONTACTS, ALL_CONTACT_DETAILS } from '@/mocks/contacts';
import SocialNetworksSection from '../SocialNetworksSection';
import MemberListSection from './MemberListSection';
import AddMemberModal from './modals/AddMemberModal';
import DisappearingMessagesModal, { DisappearingInterval, disappearingLabel } from './modals/DisappearingMessagesModal';

interface ChatProfileProps {
  chat: ChatItem;
  onBack: () => void;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

export default function ChatProfile({ chat, onBack }: ChatProfileProps) {
  const isGroup = !!chat.isGroup;

  const [name, setName] = useState(chat.name);
  const [members, setMembers] = useState<GroupMember[]>(chat.members ?? []);
  const [muted, setMuted] = useState(!!chat.isMuted);

  const [disappearingOn, setDisappearingOn] = useState(false);
  const [interval, setIntervalValue] = useState<DisappearingInterval>('24h');
  const [intervalModal, setIntervalModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);

  const isAdmin = members.some((m) => m.isCurrentUser && m.role === 'admin');
  const meta = isGroup
    ? `${members.length} ${members.length === 1 ? 'miembro' : 'miembros'}`
    : 'Contacto de BeeApp';

  const toggleDisappearing = (val: boolean) => {
    setDisappearingOn(val);
    if (val) setIntervalModal(true);
  };

  const handleConfirmLeave = () => {
    if (confirm(isGroup ? '¿Seguro que quieres salir de este grupo?' : '¿Seguro que quieres eliminar esta conversación?')) {
      alert(isGroup ? 'Has salido del grupo' : 'Chat eliminado');
      onBack();
    }
  };

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Top Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm text-neutral-900 ml-1">
          {isGroup ? 'Perfil del grupo' : 'Perfil del contacto'}
        </h1>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        {/* Avatar & Name Section */}
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xl flex items-center justify-center shadow-sm">
              {initialsOf(name)}
            </div>
            {isGroup && (
              <button
                type="button"
                onClick={() => alert('Cambiar foto del grupo (Mock)')}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-primary text-white border-2 border-white flex items-center justify-center shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {isGroup ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-center font-bold text-lg text-neutral-900 outline-none border-b border-transparent focus:border-brand-primary px-2 py-0.5"
              />
            ) : (
              <div className="flex items-center justify-center gap-1.5 font-bold text-lg text-neutral-900">
                <span>{name}</span>
                {chat.verified && <ShieldCheck className="w-4.5 h-4.5 text-brand-primary shrink-0" />}
              </div>
            )}
            <p className="text-xs text-neutral-500 font-normal">{meta}</p>
          </div>
        </div>

        {/* Social Links for 1-on-1 chats */}
        {!isGroup && (() => {
          const contact = MY_CONTACTS.find((c) => c.name === chat.name);
          if (!contact) return null;
          const detail = ALL_CONTACT_DETAILS[contact.id];
          if (!detail?.socialLinks) return null;
          return <SocialNetworksSection socialLinks={detail.socialLinks} />;
        })()}

        <div className="h-px bg-neutral-100" />

        {/* Disappearing messages option */}
        <div className="flex items-center justify-between py-2">
          <div
            onClick={() => disappearingOn && setIntervalModal(true)}
            className={`flex items-center gap-3 flex-1 min-w-0 ${
              disappearingOn ? 'cursor-pointer hover:opacity-80' : ''
            }`}
          >
            <Timer className="w-5 h-5 text-neutral-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900">Mensajes temporales</p>
              <p className="text-[11px] text-neutral-500 font-normal truncate">
                {disappearingOn ? disappearingLabel(interval) : 'Desactivado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleDisappearing(!disappearingOn)}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
              disappearingOn ? 'bg-brand-primary' : 'bg-neutral-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                disappearingOn ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Group members list if group */}
        {isGroup && (
          <>
            <div className="h-px bg-neutral-100" />
            <MemberListSection
              members={members}
              canManage={isAdmin}
              onAdd={() => setAddMemberModal(true)}
              onRemove={(memberId) => setMembers((list) => list.filter((m) => m.id !== memberId))}
            />
          </>
        )}

        <div className="h-px bg-neutral-100" />

        {/* Actions section */}
        <div className="space-y-1">
          <div
            onClick={() => alert('Buscar en conversación (Mock)')}
            className="flex items-center gap-3 py-3 px-2 rounded-xl cursor-pointer hover:bg-neutral-50"
          >
            <Search className="w-5 h-5 text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-800">Buscar en la conversación</span>
          </div>

          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-neutral-500" />
              <span className="text-xs font-semibold text-neutral-800">Silenciar notificaciones</span>
            </div>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                muted ? 'bg-brand-primary' : 'bg-neutral-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  muted ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div
            onClick={() => alert('Archivos multimedia compartidos (Mock)')}
            className="flex items-center gap-3 py-3 px-2 rounded-xl cursor-pointer hover:bg-neutral-50"
          >
            <ImageIcon className="w-5 h-5 text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-800">Archivos multimedia compartidos</span>
          </div>
        </div>

        <div className="h-px bg-neutral-100" />

        {/* Danger Action */}
        <button
          type="button"
          onClick={handleConfirmLeave}
          className="w-full py-3.5 rounded-2xl bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isGroup ? 'Salir del grupo' : 'Eliminar chat'}</span>
        </button>
      </div>

      <DisappearingMessagesModal
        visible={intervalModal}
        value={interval}
        onSave={(next) => {
          setIntervalValue(next);
          setIntervalModal(false);
        }}
        onClose={() => setIntervalModal(false)}
      />

      <AddMemberModal
        visible={addMemberModal}
        memberIds={members.map((m) => m.id)}
        onAdd={(added) => {
          setMembers((list) => [...list, ...added]);
          setAddMemberModal(false);
        }}
        onClose={() => setAddMemberModal(false)}
      />
    </div>
  );
}
