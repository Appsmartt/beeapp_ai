'use client';

import { Loader2 } from 'lucide-react';

export default function ChatListSkeleton() {
  return (
    <div
      className="space-y-2 px-1 pt-2"
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando chats"
    >
      <p className="flex items-center justify-center gap-2 py-3 text-xs text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
        Cargando tus chats…
      </p>

      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="mx-2.5 flex items-center gap-2.5 rounded-xl border border-[#E7DFF3] bg-white px-3 py-2"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-neutral-200/90" />
          <div className="min-w-0 flex-1 space-y-2">
            <div
              className="h-3 animate-pulse rounded-md bg-neutral-200/90"
              style={{ width: `${48 + (index % 3) * 12}%` }}
            />
            <div
              className="h-2.5 animate-pulse rounded-md bg-neutral-100"
              style={{ width: `${72 + (index % 2) * 10}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
