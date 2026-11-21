'use client';

import { Reply, Copy } from 'lucide-react';
import { ChatMessage } from '@/lib/client/chats';

export type ChatMessageAction = 'reply' | 'copy';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

interface ChatMessageContextMenuProps {
  position: { x: number; y: number } | null;
  message: ChatMessage | null;
  onClose: () => void;
  onSelectAction: (action: ChatMessageAction) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
}

export default function ChatMessageContextMenu({
  position,
  message,
  onClose,
  onSelectAction,
  onToggleReaction,
}: ChatMessageContextMenuProps) {
  if (!position || !message) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      <div
        style={{
          position: 'fixed',
          left: `${Math.min(position.x, window.innerWidth - 230)}px`,
          top: `${Math.min(position.y, window.innerHeight - 170)}px`,
        }}
        className="z-50 w-52 select-none rounded-2xl border border-neutral-200 bg-white py-2 text-xs shadow-xl animate-in fade-in zoom-in-95 duration-100"
      >
        {onToggleReaction ? (
          <div className="mb-1.5 flex items-center justify-between border-b border-neutral-100 px-3 pb-2">
            {QUICK_REACTIONS.map((emoji) => {
              const active = message.reactions?.some((r) => r.emoji === emoji && r.mine);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggleReaction(message, emoji);
                    onClose();
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:scale-110 ${
                    active ? 'bg-brand-primary/15 ring-1 ring-brand-primary' : 'hover:bg-neutral-100'
                  }`}
                  title={`Reaccionar con ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onSelectAction('reply')}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-normal text-neutral-800 hover:bg-neutral-50"
        >
          <Reply className="h-4 w-4 text-neutral-500" />
          <span>Responder</span>
        </button>

        {message.text ? (
          <button
            type="button"
            onClick={() => onSelectAction('copy')}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-normal text-neutral-800 hover:bg-neutral-50"
          >
            <Copy className="h-4 w-4 text-neutral-500" />
            <span>Copiar texto</span>
          </button>
        ) : null}
      </div>
    </>
  );
}
