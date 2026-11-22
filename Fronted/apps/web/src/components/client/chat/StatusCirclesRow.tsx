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
  const authorCircles: Array<{
    authorId: string;
    authorName: string;
    authorInitials: string;
    authorColor: string;
    authorAvatarUrl?: string | null;
    allViewed: boolean;
    firstOpenIndex: number;
  }> = [];

  const indexByAuthor = new Map<string, number>();
  statuses.forEach((status, idx) => {
    const existingIdx = indexByAuthor.get(status.authorId);
    if (existingIdx === undefined) {
      indexByAuthor.set(status.authorId, authorCircles.length);
      authorCircles.push({
        authorId: status.authorId,
        authorName: status.authorName,
        authorInitials: status.authorInitials,
        authorColor: status.authorColor,
        authorAvatarUrl: status.authorAvatarUrl,
        allViewed: status.viewed,
        firstOpenIndex: idx,
      });
    } else {
      const circle = authorCircles[existingIdx];
      if (circle && !status.viewed && circle.allViewed) {
        circle.allViewed = false;
        circle.firstOpenIndex = idx;
      }
    }
  });

  return (
    <div className="border-b border-[#E6DCF4]">
      <div className="flex gap-3 overflow-x-auto px-3 py-2 md:gap-4 md:px-4 md:py-3 no-scrollbar">
        <button
          type="button"
          onClick={onCreateStatus}
          className="flex w-14 shrink-0 flex-col items-center gap-1 md:w-16 md:gap-1.5"
        >
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary md:h-14 md:w-14">
            {authorInitials}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-white md:h-5 md:w-5">
              <Plus className="h-2.5 w-2.5 md:h-3 md:w-3" />
            </span>
          </span>
          <span className="max-w-full truncate text-[10px] text-neutral-600 md:text-[11px]">Tu estado</span>
        </button>

        {authorCircles.map((circle) => (
          <button
            key={circle.authorId}
            type="button"
            onClick={() => onOpenStatus(circle.firstOpenIndex)}
            className="flex w-14 shrink-0 flex-col items-center gap-1 md:w-16 md:gap-1.5"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 p-0.5 md:h-14 md:w-14 ${
                circle.allViewed ? 'border-neutral-300' : 'border-brand-primary'
              }`}
            >
              <span
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: circle.authorColor }}
              >
                {circle.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={circle.authorAvatarUrl}
                    alt={circle.authorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  circle.authorInitials
                )}
              </span>
            </span>
            <span className="max-w-full truncate text-[11px] text-neutral-700">
              {circle.authorName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
