'use client';

import { Check, CheckCheck, BellOff, Users, Lock, CheckCircle2, MoreVertical, Pin, Tag, Shield, Trash2 } from 'lucide-react';
import { ChatItem } from '@/mocks/chats';
import { CommunityItem } from '@/mocks/communities';
import { useState, useRef, useEffect } from 'react';

interface ChatRowProps {
  chat: ChatItem;
  isSelected: boolean;
  onClick: () => void;
  onPin?: (id: string) => void;
  onMute?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAssignCategory?: (chat: ChatItem) => void;
  onToggleProtection?: (chat: ChatItem) => void;
}

export function ChatRow({
  chat,
  isSelected,
  onClick,
  onPin,
  onMute,
  onDelete,
  onAssignCategory,
  onToggleProtection,
}: ChatRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(true);
  };

  return (
    <div
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className={`group relative px-5 py-[14px] flex items-center gap-3.5 cursor-pointer bg-white border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
        isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
      }`}
    >
      {/* Avatar Section */}
      <div className="relative shrink-0">
        {chat.isGroup ? (
          <div className="w-12 h-12 rounded-[14px] bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600">
            <Users className="w-5 h-5" />
          </div>
        ) : (
          <div
            className={`w-12 h-12 rounded-full bg-brand-primary/10 border flex items-center justify-center text-brand-primary font-normal text-lg ${
              chat.isPinned ? 'border-brand-primary border-2' : 'border-brand-primary/30'
            }`}
          >
            <span>{chat.name[0]?.toUpperCase()}</span>
          </div>
        )}

        {chat.online && !chat.isGroup && (
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
        )}

        {chat.isProtected && (
          <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-brand-primary border-[1.5px] border-white flex items-center justify-center text-white">
            <Lock className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 min-w-0 pr-2">
            <span className="font-semibold text-[15px] text-neutral-900 truncate">
              {chat.name}
            </span>
            {chat.verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 fill-brand-primary/10" />
            )}
          </div>
          <span
            className={`text-xs shrink-0 ${
              chat.unreadCount > 0 ? 'text-brand-primary font-normal' : 'text-neutral-500'
            }`}
          >
            {chat.time}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-1 min-w-0 pr-3">
            {chat.isMuted && <BellOff className="w-3 h-3 text-neutral-400 shrink-0" />}
            <p
              className={`text-[13px] leading-4 truncate ${
                chat.isProtected ? 'text-neutral-400 italic' : 'text-neutral-600'
              }`}
            >
              {chat.isProtected ? 'Chat protegido' : chat.lastMessage}
            </p>
          </div>

          {chat.unreadCount > 0 ? (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-primary text-white text-[10px] font-normal flex items-center justify-center shrink-0">
              {chat.unreadCount}
            </span>
          ) : (
            !chat.isProtected && (
              <div className="shrink-0 text-neutral-400">
                {chat.status === 'sent' && <Check className="w-3.5 h-3.5" />}
                {chat.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5" />}
                {chat.status === 'read' && (
                  <CheckCheck className="w-3.5 h-3.5 text-brand-primary" />
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Context options trigger button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-neutral-200/60 text-neutral-500 transition-opacity shrink-0"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Context Menu Dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-10 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl z-30 py-1.5 text-xs text-neutral-800"
        >
          {onPin && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onPin(chat.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left"
            >
              <Pin className="w-3.5 h-3.5 text-neutral-500" />
              <span>{chat.isPinned ? 'Desfijar' : 'Fijar'}</span>
            </button>
          )}

          {onMute && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onMute(chat.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left"
            >
              <BellOff className="w-3.5 h-3.5 text-neutral-500" />
              <span>{chat.isMuted ? 'Activar' : 'Silenciar'}</span>
            </button>
          )}

          {onAssignCategory && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onAssignCategory(chat);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left"
            >
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              <span>Asignar a categoría</span>
            </button>
          )}

          {onToggleProtection && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onToggleProtection(chat);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left"
            >
              <Shield className="w-3.5 h-3.5 text-neutral-500" />
              <span>{chat.isProtected ? 'Quitar protección' : 'Proteger chat'}</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(chat.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface CommunityRowProps {
  community: CommunityItem;
  isSelected: boolean;
  onClick: () => void;
}

export function CommunityRow({ community, isSelected, onClick }: CommunityRowProps) {
  return (
    <div
      onClick={onClick}
      className={`px-5 py-3.5 flex items-center gap-3.5 cursor-pointer bg-white border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
        isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
      }`}
    >
      <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
        <Users className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-[15px] text-neutral-900 truncate">
            {community.name}
          </span>
          {community.isAdmin && (
            <span className="text-[10px] font-semibold bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full shrink-0">
              Admin
            </span>
          )}
        </div>
        <p className="text-[13px] text-neutral-500 truncate">
          {community.membersCount} miembros — {community.category}
        </p>
      </div>
    </div>
  );
}
