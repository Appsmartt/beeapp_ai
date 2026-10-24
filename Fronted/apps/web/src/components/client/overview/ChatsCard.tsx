'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Lock, CheckCircle } from 'lucide-react';
import type { ChatItem } from '@/lib/client/chats';
import { loadInbox } from '@/lib/client/liveData';
import OverviewCard from './OverviewCard';

interface ChatsCardProps {
  onSeeMore: () => void;
}

/** Chats: filas compactas con avatar, nombre y preview */
export default function ChatsCard({ onSeeMore }: ChatsCardProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);

  useEffect(() => {
    loadInbox().then((inbox) => setChats(inbox.chats.slice(0, 5))).catch(() => setChats([]));
  }, []);

  return (
    <OverviewCard title="Chats" icon={MessageCircle} onSeeMore={onSeeMore}>
      <div className="space-y-1">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center gap-3 rounded-xl -mx-2 px-2 py-2 hover:bg-neutral-50 transition-colors"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                chat.isAI ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {chat.isAI ? 'IA' : chat.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-semibold text-xs text-neutral-900 truncate">{chat.name}</span>
                  {chat.verified && <CheckCircle className="w-3 h-3 text-brand-primary shrink-0" />}
                </div>
                <span className="text-[10px] text-neutral-400 font-normal shrink-0">{chat.time}</span>
              </div>

              <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                {chat.isProtected ? (
                  <span className="flex items-center gap-1 text-neutral-400">
                    <Lock className="w-3 h-3" /> Chat protegido
                  </span>
                ) : (
                  chat.lastMessage
                )}
              </p>
            </div>

            {chat.unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-primary text-white text-[9px] font-normal flex items-center justify-center shrink-0">
                {chat.unreadCount}
              </span>
            )}
          </div>
        ))}
      </div>
    </OverviewCard>
  );
}
