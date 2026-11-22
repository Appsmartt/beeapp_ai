'use client';

import { Bot, PauseCircle, Play } from 'lucide-react';
import type { ConversationAiAutoReplyScope } from '@beeapp/shared-types';

interface AiAutoReplyBannerProps {
  enabled: boolean;
  scope?: ConversationAiAutoReplyScope | null;
  pausedUntil?: string | null;
  busy?: boolean;
  onChange: (enabled: boolean) => void;
  onResume?: () => void;
}

function formatPausedRemaining(pausedUntil?: string | null): string | null {
  if (!pausedUntil) return null;
  const target = new Date(pausedUntil).getTime();
  if (Number.isNaN(target)) return null;
  const diffMs = target - Date.now();
  if (diffMs <= 0) return null;
  const mins = Math.max(1, Math.ceil(diffMs / 60000));
  return `${mins} min`;
}

export default function AiAutoReplyBanner({
  enabled,
  scope,
  pausedUntil,
  busy = false,
  onChange,
  onResume,
}: AiAutoReplyBannerProps) {
  const pausedRemaining = enabled ? formatPausedRemaining(pausedUntil) : null;
  const isPaused = Boolean(pausedRemaining);
  const scopeLabel = scope === 'business' ? 'IA del negocio' : 'IA personal';

  return (
    <div
      className={`min-h-[44px] px-3 sm:px-4 py-1.5 border-b flex items-center justify-between gap-2 transition-colors ${
        isPaused
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : enabled
            ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary'
            : 'bg-neutral-100 border-neutral-200 text-neutral-600'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isPaused ? (
          <PauseCircle className="w-4 h-4 shrink-0 text-amber-600" />
        ) : (
          <Bot className="w-4 h-4 shrink-0" />
        )}

        {enabled && !isPaused ? (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
          </span>
        ) : null}

        <span className="text-xs font-medium truncate">
          {isPaused
            ? `${scopeLabel} en pausa (${pausedRemaining}) porque respondiste`
            : enabled
              ? `${scopeLabel} respondiendo automáticamente`
              : `${scopeLabel} desactivada en este chat`}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isPaused && onResume ? (
          <button
            type="button"
            disabled={busy}
            onClick={onResume}
            className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            Reanudar
          </button>
        ) : null}

        <button
          type="button"
          disabled={busy}
          aria-label={enabled ? 'Desactivar IA automática en este chat' : 'Activar IA automática en este chat'}
          onClick={() => onChange(!enabled)}
          className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 disabled:opacity-50 ${
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
    </div>
  );
}
