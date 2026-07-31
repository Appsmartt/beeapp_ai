'use client';

import { Bot, Pin, Sparkles, Lock } from 'lucide-react';
import { ChatItem } from '@/mocks/chats';

interface AiChatListItemProps {
  chat: ChatItem;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function AiChatListItem({
  chat,
  isSelected,
  onClick,
  onContextMenu,
}: AiChatListItemProps) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`px-5 py-3.5 flex items-center gap-3.5 cursor-pointer bg-white border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
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
    </div>
  );
}
