'use client';

import { useState } from 'react';
import { Forward, Search, X } from 'lucide-react';
import { MOCK_CHATS } from '@/mocks/chats';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatName: string) => void;
}

export default function ForwardMessageModal({
  isOpen,
  onClose,
  onSelectChat,
}: ForwardMessageModalProps) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredChats = MOCK_CHATS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-neutral-200 w-full max-w-sm overflow-hidden flex flex-col max-h-[460px] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-brand-primary" />
            <h3 className="font-semibold text-base text-neutral-900">Reenviar mensaje a...</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2 bg-neutral-100 px-3 py-2 rounded-xl text-xs">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar chat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-neutral-800 placeholder-neutral-400 font-normal"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-100">
          {filteredChats.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onSelectChat(c.name);
                onClose();
              }}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-normal text-xs text-neutral-900 truncate">{c.name}</h4>
                  <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">{c.lastMessage}</p>
                </div>
              </div>
              <Forward className="w-4 h-4 text-neutral-400 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
