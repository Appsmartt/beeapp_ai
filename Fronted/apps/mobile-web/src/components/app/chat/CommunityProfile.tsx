'use client';

import { useState } from 'react';
import { ArrowLeft, BellOff, LogOut, Trash2 } from 'lucide-react';
import { CommunityItem, COMMUNITY_CATEGORIES, CommunityMember, CURRENT_USER_ID } from '@/mocks/communities';
import MemberListSection from './MemberListSection';
import AddMemberModal from './modals/AddMemberModal';

interface CommunityProfileProps {
  community: CommunityItem;
  onBack: () => void;
}

export default function CommunityProfile({ community, onBack }: CommunityProfileProps) {
  const isAdmin = community.creatorId === CURRENT_USER_ID || community.isAdmin;

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [category, setCategory] = useState(community.category || COMMUNITY_CATEGORIES[0]);
  const [members, setMembers] = useState<CommunityMember[]>(community.members || []);
  const [muted, setMuted] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);

  const handleLeave = () => {
    if (confirm('¿Seguro que quieres salir de esta comunidad?')) {
      alert('Has salido de la comunidad');
      onBack();
    }
  };

  const handleDelete = () => {
    if (confirm('Esta acción eliminaría la comunidad para todos sus miembros. ¿Deseas continuar?')) {
      alert('Comunidad eliminada');
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
        <h1 className="font-semibold text-sm text-neutral-900 ml-1">Perfil de la comunidad</h1>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        {/* Avatar, Name & Description */}
        <div className="text-center space-y-3">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl text-brand-primary mx-auto shadow-sm"
            style={{ backgroundColor: community.color }}
          >
            {community.initials}
          </div>

          <div className="space-y-1">
            {isAdmin ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la comunidad"
                className="text-center font-bold text-lg text-neutral-900 outline-none border-b border-neutral-200 focus:border-brand-primary px-2 py-0.5"
              />
            ) : (
              <h2 className="font-bold text-lg text-neutral-900">{name}</h2>
            )}

            {isAdmin ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="¿De qué trata la comunidad?"
                rows={2}
                className="w-full text-center text-xs font-normal text-neutral-600 outline-none border-b border-neutral-200 focus:border-brand-primary resize-none p-1"
              />
            ) : (
              <p className="text-xs text-neutral-600 font-normal leading-relaxed">{description}</p>
            )}

            <p className="text-xs text-neutral-500 font-normal">
              {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
            </p>
          </div>
        </div>

        <div className="h-px bg-neutral-100" />

        {/* Categories selector */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-normal text-neutral-500">
            Categoría
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_CATEGORIES.map((option) => {
              const isActive = category === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => isAdmin && setCategory(option)}
                  disabled={!isAdmin}
                  className={`px-3.5 py-2 rounded-xl text-xs font-normal transition-colors ${
                    isActive
                      ? 'bg-brand-primary text-white font-semibold'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-neutral-100" />

        {/* Members section */}
        <MemberListSection
          members={members}
          canManage={isAdmin}
          onAdd={() => setAddMemberVisible(true)}
          onRemove={(memberId) => setMembers((list) => list.filter((m) => m.id !== memberId))}
        />

        <div className="h-px bg-neutral-100" />

        {/* Actions */}
        <div className="space-y-1">
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
        </div>

        <div className="h-px bg-neutral-100" />

        {/* Leave / Delete Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleLeave}
            className="w-full py-3.5 rounded-2xl bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir de la comunidad</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full py-3.5 rounded-2xl bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar comunidad</span>
            </button>
          )}
        </div>
      </div>

      <AddMemberModal
        visible={addMemberVisible}
        memberIds={members.map((m) => m.id)}
        onAdd={(added) => {
          setMembers((list) => [...list, ...added]);
          setAddMemberVisible(false);
        }}
        onClose={() => setAddMemberVisible(false)}
      />
    </div>
  );
}
