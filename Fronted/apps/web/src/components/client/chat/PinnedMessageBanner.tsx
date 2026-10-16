'use client';

import { Pin, X } from 'lucide-react';

interface PinnedMessageBannerProps {
  text: string;
  onUnpin: () => void;
}

export default function PinnedMessageBanner({ text, onUnpin }: PinnedMessageBannerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-neutral-200 text-xs z-10 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Pin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
        <div className="min-w-0">
          <span className="font-semibold text-[10px] text-brand-primary uppercase tracking-wider block">
            Mensaje fijado
          </span>
          <p className="text-neutral-800 font-normal truncate">{text}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onUnpin}
        className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
        title="Desfijar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
