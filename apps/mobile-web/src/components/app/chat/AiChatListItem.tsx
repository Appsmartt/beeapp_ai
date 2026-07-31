'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Pin, Sparkles, Lock, MoreVertical, BellOff, Tag, Unlock } from 'lucide-react';
import { ChatItem } from '@/mocks/chats';

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
  onAssignCategory,
  onToggleProtection,
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
      className={`group relative px-5 py-3.5 flex items-center gap-3.5 cursor-pointer bg-white border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
        isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-xs">
          <Bot className="w-6 h-6" />
        </div>
        {chat.isProtected && (
          <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-brand-primary border-[1.5px] border-white flex items-center justify-center text-white">
            <Lock className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-[15px] text-neutral-900 truncate">
              {chat.name}
            </span>
            <div className="flex items-center gap-0.5 bg-brand-primary/15 px-1.5 py-0.5 rounded-md shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-brand-primary" />
              <span className="text-[9px] font-normal text-brand-primary tracking-wide">IA</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-brand-primary">
            <Pin className="w-3 h-3" />
            <span className="text-[11px] font-normal">{chat.time}</span>
          </div>
        </div>

        <p className="text-[12.5px] font-normal text-neutral-500 truncate">
          {chat.isProtected ? (
            <span className="italic text-neutral-400">Chat protegido</span>
          ) : (
            chat.lastMessage
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
        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors shrink-0"
        title="Opciones de chat"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Menú contextual desplegable (sin eliminar ni archivar) */}
      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-10 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 py-1.5 text-xs text-neutral-800 select-none animate-in fade-in zoom-in-95 duration-100"
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
        </div>
      )}
    </div>
  );
}
