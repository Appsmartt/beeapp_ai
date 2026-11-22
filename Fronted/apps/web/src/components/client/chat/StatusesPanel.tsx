'use client';

import { Plus, CircleDashed } from 'lucide-react';
import { StatusItem } from '@/lib/client/statuses';

interface StatusesPanelProps {
  statuses: StatusItem[];
  currentUserId?: string;
  authorInitials?: string;
  onOpenStatus: (index: number) => void;
  onCreateStatus: () => void;
}

interface AuthorGroup {
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorAvatarUrl?: string | null;
  latestTimestamp: string;
  count: number;
  allViewed: boolean;
  firstOpenIndex: number;
}

export default function StatusesPanel({
  authorInitials = 'TÚ',
  currentUserId,
  statuses,
  onOpenStatus,
  onCreateStatus,
}: StatusesPanelProps) {
  const myStatuses = currentUserId
    ? statuses.filter((s) => s.authorId === currentUserId)
    : [];
  const otherStatuses = currentUserId
    ? statuses.filter((s) => s.authorId !== currentUserId)
    : statuses;

  const groupMap = new Map<string, AuthorGroup>();
  otherStatuses.forEach((status) => {
    const idx = statuses.findIndex((s) => s.id === status.id);
    const existing = groupMap.get(status.authorId);
    if (!existing) {
      groupMap.set(status.authorId, {
        authorId: status.authorId,
        authorName: status.authorName,
        authorInitials: status.authorInitials,
        authorColor: status.authorColor,
        authorAvatarUrl: status.authorAvatarUrl,
        latestTimestamp: status.timestamp,
        count: 1,
        allViewed: status.viewed,
        firstOpenIndex: idx,
      });
    } else {
      existing.count += 1;
      if (!status.viewed && existing.allViewed) {
        existing.allViewed = false;
        existing.firstOpenIndex = idx;
      }
    }
  });

  const groups = Array.from(groupMap.values());
  const unseen = groups.filter((g) => !g.allViewed);
  const seen = groups.filter((g) => g.allViewed);

  const renderGroupRow = (group: AuthorGroup) => (
    <div
      key={group.authorId}
      onClick={() => onOpenStatus(group.firstOpenIndex)}
      className="p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors"
    >
      <div
        className={`w-11 h-11 rounded-full p-0.5 border-2 shrink-0 flex items-center justify-center ${
          group.allViewed ? 'border-neutral-300' : 'border-brand-primary'
        }`}
      >
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-normal text-xs text-brand-primary"
          style={{ backgroundColor: group.authorColor }}
        >
          {group.authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.authorAvatarUrl}
              alt={group.authorName}
              className="h-full w-full object-cover"
            />
          ) : (
            group.authorInitials
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-neutral-900 truncate block">
            {group.authorName}
          </span>
          {group.count > 1 && (
            <span className="px-1.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-semibold">
              {group.count}
            </span>
          )}
        </div>
        <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
          {group.latestTimestamp}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col pb-28">
      {/* Crear estado */}
      <div
        onClick={onCreateStatus}
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors border-b border-neutral-100"
      >
        <div className="relative w-11 h-11 rounded-full bg-brand-primary/10 flex items-center justify-center font-normal text-xs text-brand-primary shrink-0">
          <span>{authorInitials}</span>
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

      {myStatuses.length > 0 && (
        <>
          <div className="px-4 pt-4 pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Mis estados ({myStatuses.length})
          </div>
          <div className="divide-y divide-neutral-100">
            {myStatuses.map((status) => {
              const idx = statuses.findIndex((s) => s.id === status.id);
              return (
                <div
                  key={status.id}
                  onClick={() => onOpenStatus(idx)}
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full p-0.5 border-2 border-brand-primary shrink-0 flex items-center justify-center">
                    <div
                      className="flex h-full w-full items-center justify-center overflow-hidden rounded-full font-normal text-xs text-white"
                      style={{ backgroundColor: status.bgColor || '#6025d2' }}
                    >
                      {status.photoUrl && status.type === 'photo' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={status.photoUrl} alt="Estado" className="h-full w-full object-cover" />
                      ) : (
                        authorInitials
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-xs text-neutral-900 truncate block">
                      {status.text || (status.type === 'video' ? 'Estado de video' : 'Estado con foto')}
                    </span>
                    <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                      {status.timestamp}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {groups.length === 0 && myStatuses.length === 0 ? (
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
              <div className="divide-y divide-neutral-100">{unseen.map(renderGroupRow)}</div>
            </>
          )}

          {seen.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Vistos
              </div>
              <div className="divide-y divide-neutral-100">{seen.map(renderGroupRow)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
