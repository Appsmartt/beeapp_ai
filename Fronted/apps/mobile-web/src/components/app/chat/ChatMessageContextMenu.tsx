'use client';

import { Reply, Pencil, Forward, Pin, Copy, Trash2, Bomb } from 'lucide-react';
import { ChatMessage } from '@/mocks/chats';

export type ChatMessageAction =
  | 'reply'
  | 'edit'
  | 'forward'
  | 'pin'
  | 'copy'
  | 'delete'
  | 'destroy';

interface ChatMessageContextMenuProps {
  position: { x: number; y: number } | null;
  message: ChatMessage | null;
  onClose: () => void;
  onSelectAction: (action: ChatMessageAction) => void;
}

export default function ChatMessageContextMenu({
  position,
  message,
  onClose,
  onSelectAction,
}: ChatMessageContextMenuProps) {
  if (!position || !message) return null;

  const isUser = message.isUser;
  const isDestroyed = message.isDestroyed;
  const isPinned = message.isPinned;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Positioned Menu */}
      <div
        style={{
          position: 'fixed',
          left: `${Math.min(position.x, window.innerWidth - 200)}px`,
          top: `${Math.min(position.y, window.innerHeight - 280)}px`,
        }}
        className="z-50 bg-white border border-neutral-200 rounded-2xl shadow-xl py-1.5 w-48 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
      >
        {/* 1. Responder */}
        <button
          type="button"
          onClick={() => onSelectAction('reply')}
          className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2.5 font-normal text-neutral-800"
        >
          <Reply className="w-4 h-4 text-neutral-500" />
          <span>Responder</span>
        </button>

        {/* 2. Editar (solo mensajes propios y no destruidos) */}
        {isUser && !isDestroyed && (
          <button
            type="button"
            onClick={() => onSelectAction('edit')}
            className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2.5 font-normal text-neutral-800"
          >
            <Pencil className="w-4 h-4 text-neutral-500" />
            <span>Editar</span>
          </button>
        )}

        {/* 3. Reenviar */}
        <button
          type="button"
          onClick={() => onSelectAction('forward')}
          className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2.5 font-normal text-neutral-800"
        >
          <Forward className="w-4 h-4 text-neutral-500" />
          <span>Reenviar</span>
        </button>

        {/* 4. Fijar */}
        <button
          type="button"
          onClick={() => onSelectAction('pin')}
          className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2.5 font-normal text-neutral-800"
        >
          <Pin className="w-4 h-4 text-neutral-500" />
          <span>{isPinned ? 'Desfijar mensaje' : 'Fijar mensaje'}</span>
        </button>

        {/* 5. Copiar */}
        <button
          type="button"
          onClick={() => onSelectAction('copy')}
          className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2.5 font-normal text-neutral-800"
        >
          <Copy className="w-4 h-4 text-neutral-500" />
          <span>Copiar</span>
        </button>

        {/* 6. Eliminar */}
        <button
          type="button"
          onClick={() => onSelectAction('delete')}
          className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2.5 font-normal text-neutral-800 border-t border-neutral-100"
        >
          <Trash2 className="w-4 h-4 text-neutral-500" />
          <span>Eliminar</span>
        </button>

        {/* 7. Destruir (Rojo) */}
        <button
          type="button"
          onClick={() => onSelectAction('destroy')}
          className="w-full text-left px-3.5 py-2 hover:bg-red-50 flex items-center gap-2.5 font-normal text-red-600"
        >
          <Bomb className="w-4 h-4 text-red-500" />
          <span>Destruir</span>
        </button>
      </div>
    </>
  );
}
