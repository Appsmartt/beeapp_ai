'use client';

import { Plus } from 'lucide-react';
import type { StatusItem } from '@/lib/client/statuses';

interface StatusCirclesRowProps {
  statuses: StatusItem[];
  authorInitials: string;
  onOpenStatus: (index: number) => void;
  onCreateStatus: () => void;
}

export default function StatusCirclesRow({
  statuses,
  authorInitials,
  onOpenStatus,
  onCreateStatus,
}: StatusCirclesRowProps) {
  return (
    <div className="border-b border-[#E6DCF4]">
      <div className="flex gap-4 overflow-x-auto px-4 py-3 no-scrollbar">
        <button
          type="button"
          onClick={onCreateStatus}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary">
            {authorInitials}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-white">
              <Plus className="h-3 w-3" />
            </span>
          </span>
          <span className="max-w-full truncate text-[11px] text-neutral-600">Tu estado</span>
        </button>

        {statuses.map((status) => {
          const index = statuses.findIndex((item) => item.id === status.id);
          return (
            <button
              key={status.id}
              type="button"
              onClick={() => onOpenStatus(index)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 p-0.5 ${
                  status.viewed ? 'border-neutral-300' : 'border-brand-primary'
                }`}
              >
                <span
                  className="flex h-full w-full items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: status.authorColor }}
                >
                  {status.authorInitials}
                </span>
              </span>
              <span className="max-w-full truncate text-[11px] text-neutral-700">
                {status.authorName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
