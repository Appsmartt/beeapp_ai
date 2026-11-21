'use client';

import { Check, CheckCheck, BellOff, Users, Lock, CheckCircle2, MoreVertical, Pin, Tag, Trash2, Archive, Unlock } from 'lucide-react';
import { ChatItem } from '@/lib/client/chats';
import { CommunityItem } from '@/lib/client/communities';
import { useState, useRef, useEffect } from 'react';
import { ChatAvatar } from './ChatAvatar';
import { ChatInlineText } from './ChatFormattedText';

interface ChatRowProps {
  chat: ChatItem;
  isSelected: boolean;
  onClick: () => void;
  onPin?: (id: string) => void;
  onMute?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAssignCategory?: (chat: ChatItem) => void;
  onToggleProtection?: (chat: ChatItem) => void;
  onArchive?: (id: string) => void;
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
  onArchive,
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

  return (
    <div
      onClick={onClick}
      className={`group relative mx-2.5 mb-1.5 flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
        isSelected
          ? 'border-brand-primary/30 bg-[#F4EDFF]'
          : 'border-[#E7DFF3] bg-white hover:border-[#D9CCEF] hover:bg-[#FCFAFF]'
      }`}
    >
      {/* Avatar Section */}
      <div className="relative shrink-0">
        <ChatAvatar
          name={chat.name}
          avatarUrl={chat.avatarUrl}
          isGroup={chat.isGroup}
          isPinned={chat.isPinned}
          size="sm"
        />

        {chat.online && !chat.isGroup && (
          <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        )}

        {chat.isProtected && (
          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-white bg-brand-primary text-white">
            <Lock className="h-2 w-2" />
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="flex-1 min-w-0">
        <div className="mb-0.5 flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0 pr-2">
            <span className="truncate text-[13.5px] font-semibold text-neutral-900">
              {chat.name}
            </span>
            {chat.verified && (
              <CheckCircle2 className="h-3 w-3 shrink-0 fill-brand-primary/10 text-brand-primary" />
            )}
          </div>
          <span
            className={`shrink-0 text-[11px] ${
              chat.unreadCount > 0 ? 'font-normal text-brand-primary' : 'text-neutral-500'
            }`}
          >
            {chat.time}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-1 min-w-0 pr-2">
            {chat.isMuted && <BellOff className="h-3 w-3 shrink-0 text-neutral-400" />}
            <p
              className={`truncate text-xs leading-4 ${
                chat.isProtected ? 'text-neutral-400 italic' : 'text-neutral-600'
              }`}
            >
              {chat.isProtected ? 'Chat protegido' : <ChatInlineText text={chat.lastMessage || ''} />}
            </p>
          </div>

          {chat.unreadCount > 0 ? (
            <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-normal text-white">
              {chat.unreadCount}
            </span>
          ) : (
            !chat.isProtected && (
              <div className="shrink-0 text-neutral-400">
                {chat.status === 'sent' && <Check className="h-3 w-3" />}
                {chat.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                {chat.status === 'read' && (
                  <CheckCheck className="h-3 w-3 text-brand-primary" />
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Botón de tres puntos siempre visible */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="shrink-0 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        title="Opciones de chat"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {/* Menú contextual desplegable */}
      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="animate-in fade-in zoom-in-95 duration-100 absolute right-3 top-8 z-30 w-48 select-none rounded-xl border border-neutral-200 bg-white py-1.5 text-xs text-neutral-800 shadow-xl"
        >
          {onPin && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onPin(chat.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal"
            >
              <Pin className="w-3.5 h-3.5 text-neutral-500" />
              <span>{chat.isPinned ? 'Desfijar chat' : 'Fijar chat'}</span>
            </button>
          )}

          {onMute && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onMute(chat.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal"
            >
              <BellOff className="w-3.5 h-3.5 text-neutral-500" />
              <span>{chat.isMuted ? 'Activar notificaciones' : 'Silenciar'}</span>
            </button>
          )}

          {onToggleProtection && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onToggleProtection(chat);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal"
            >
              {chat.isProtected ? (
                <Unlock className="w-3.5 h-3.5 text-brand-primary" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span>{chat.isProtected ? 'Quitar protección' : 'Proteger con PIN'}</span>
            </button>
          )}

          {onAssignCategory && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onAssignCategory(chat);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal"
            >
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              <span>Asignar a categoría</span>
            </button>
          )}

          {!chat.isAI && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                if (onArchive) {
                  onArchive(chat.id);
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal"
            >
              <Archive className="w-3.5 h-3.5 text-neutral-500" />
              <span>{chat.isArchived ? 'Desarchivar chat' : 'Archivar'}</span>
            </button>
          )}

          {!chat.isAI && onDelete && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(chat.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 text-left font-normal"
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
      className={`mx-2.5 mb-1.5 flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
        isSelected
          ? 'border-brand-primary/30 bg-[#F4EDFF]'
          : 'border-[#E7DFF3] bg-white hover:border-[#D9CCEF] hover:bg-[#FCFAFF]'
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
        <Users className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="truncate text-[13.5px] font-semibold text-neutral-900">
            {community.name}
          </span>
          {community.isAdmin && (
            <span className="shrink-0 rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-semibold text-brand-primary">
              Admin
            </span>
          )}
        </div>
        <p className="truncate text-xs text-neutral-500">
          {community.membersCount} miembros — {community.category}
        </p>
      </div>
    </div>
  );
}
