'use client';

import { useEffect, useState } from 'react';
import { FileText, Lock } from 'lucide-react';
import { loadOverviewNotes } from '@/lib/client/liveData';
import OverviewCard from './OverviewCard';

interface NotesCardProps {
  onSeeMore: () => void;
}

export default function NotesCard({ onSeeMore }: NotesCardProps) {
  const [notes, setNotes] = useState<Array<{ id: string; title: string; preview: string; timestamp: string; isProtected: boolean }>>([]);

  useEffect(() => {
    loadOverviewNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  return (
    <OverviewCard title="Notas" icon={FileText} onSeeMore={onSeeMore}>
      <div className="grid grid-cols-2 gap-2">
        {notes.length === 0 ? <p className="text-[11px] text-neutral-500">No hay notas todavía.</p> : null}
        {notes.slice(0, 4).map((note) => (
          <div
            key={note.id}
            className="rounded-xl bg-neutral-50 border border-neutral-100 p-3 hover:bg-neutral-100/70 transition-colors"
          >
            <div className="flex items-start gap-1.5">
              {note.isProtected && <Lock className="w-3 h-3 text-brand-primary shrink-0 mt-0.5" />}
              <h3 className="font-semibold text-[11px] text-neutral-900 line-clamp-2 leading-snug">
                {note.title}
              </h3>
            </div>
            <p className="text-[10px] text-neutral-500 font-normal line-clamp-2 mt-1.5 leading-snug">
              {note.preview || 'Sin vista previa'}
            </p>
            <p className="text-[10px] text-neutral-400 font-normal mt-2">{note.timestamp}</p>
          </div>
        ))}
      </div>
    </OverviewCard>
  );
}
