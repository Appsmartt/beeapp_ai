'use client';

import { Bot } from 'lucide-react';

interface AiAutoReplyBannerProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function AiAutoReplyBanner({ enabled, onChange }: AiAutoReplyBannerProps) {
  return (
    <div
      className={`h-11 px-4 border-b flex items-center justify-between transition-colors ${
        enabled
          ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary'
          : 'bg-neutral-100 border-neutral-200 text-neutral-600'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Bot className="w-4.5 h-4.5 shrink-0" />

        {enabled && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
          </span>
        )}

        <span className="text-xs font-normal truncate">
          {enabled ? 'Asistente IA respondiendo' : 'Asistente IA desactivado'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
          enabled ? 'bg-brand-primary' : 'bg-neutral-300'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
