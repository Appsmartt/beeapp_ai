'use client';

import { Plus, CircleDashed } from 'lucide-react';
import { StatusItem } from '@/mocks/statuses';
import { CURRENT_USER } from '@/mocks/currentUser';

interface StatusesPanelProps {
  statuses: StatusItem[];
  onOpenStatus: (index: number) => void;
  onCreateStatus: () => void;
}

export default function StatusesPanel({
  statuses,
  onOpenStatus,
  onCreateStatus,
}: StatusesPanelProps) {
  const unseen = statuses.filter((s) => !s.viewed);
  const seen = statuses.filter((s) => s.viewed);

  const renderRow = (status: StatusItem) => {
    const originalIndex = statuses.findIndex((s) => s.id === status.id);
    return (
      <div
        key={status.id}
        onClick={() => onOpenStatus(originalIndex)}
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors"
      >
        <div
          className={`w-11 h-11 rounded-full p-0.5 border-2 shrink-0 flex items-center justify-center ${
            status.viewed ? 'border-neutral-300' : 'border-brand-primary'
          }`}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center font-normal text-xs text-brand-primary"
            style={{ backgroundColor: status.authorColor }}
          >
            {status.authorInitials}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-semibold text-xs text-neutral-900 truncate block">
            {status.authorName}
          </span>
          <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
            {status.timestamp}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Crear estado */}
      <div
        onClick={onCreateStatus}
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors border-b border-neutral-100"
      >
        <div className="relative w-11 h-11 rounded-full bg-neutral-200 border border-neutral-300 flex items-center justify-center text-xs font-normal text-neutral-700 shrink-0">
          <span>{CURRENT_USER.name.slice(0, 2).toUpperCase()}</span>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-primary border-2 border-white flex items-center justify-center text-white">
            <Plus className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-xs text-neutral-900 block">Tu estado</span>
          <p className="text-[11px] text-neutral-500 font-normal mt-0.5">
            Toca para publicar un estado
          </p>
        </div>
      </div>

      {statuses.length === 0 ? (
        <div className="p-12 text-center text-neutral-400 space-y-2">
          <CircleDashed className="w-10 h-10 mx-auto text-neutral-300" />
          <p className="text-xs font-normal">Nadie de tu red ha publicado un estado</p>
        </div>
      ) : (
        <>
          {unseen.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Recientes
              </div>
              <div className="divide-y divide-neutral-100">{unseen.map(renderRow)}</div>
            </>
          )}

          {seen.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Vistos
              </div>
              <div className="divide-y divide-neutral-100">{seen.map(renderRow)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
