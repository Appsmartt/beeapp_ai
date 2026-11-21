'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Pin, Sparkles, Lock, MoreVertical, BellOff } from 'lucide-react';
import { ChatItem } from '@/lib/client/chats';
import { ChatInlineText } from './ChatFormattedText';

interface AiChatListItemProps {
  chat: ChatItem;
  isSelected: boolean;
  onClick: () => void;
  onPin?: (id: string) => void;
  onMute?: (id: string) => void;
  onAssignCategory?: (chat: ChatItem) => void;
  onToggleProtection?: (chat: ChatItem) => void;
}

export default function AiChatListItem({
  chat,
  isSelected,
  onClick,
  onPin,
  onMute,
}: AiChatListItemProps) {
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
      <div className="relative shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white shadow-xs">
          <Bot className="h-[18px] w-[18px]" />
        </div>
        {chat.isProtected && (
          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-white bg-brand-primary text-white">
            <Lock className="h-2 w-2" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-0.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-[13.5px] font-semibold text-neutral-900">
              {chat.name}
            </span>
            <div className="flex items-center gap-0.5 rounded-md bg-brand-primary/15 px-1.5 py-0.5 shrink-0">
              <Sparkles className="h-2.5 w-2.5 text-brand-primary" />
              <span className="text-[9px] font-normal tracking-wide text-brand-primary">IA</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-brand-primary">
            {chat.isMuted && <BellOff className="h-2.5 w-2.5 text-neutral-400" />}
            {chat.isPinned && <Pin className="h-2.5 w-2.5" />}
            <span className="text-[11px] font-normal">{chat.time}</span>
          </div>
        </div>

        <p className="truncate text-xs leading-4 font-normal text-neutral-500">
          {chat.isProtected ? (
            <span className="italic text-neutral-400">Chat protegido</span>
          ) : (
            <ChatInlineText text={chat.lastMessage || ''} />
          )}
        </p>
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

      {/* Menú contextual desplegable (sin eliminar ni archivar) */}
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
        </div>
      )}
    </div>
  );
}
