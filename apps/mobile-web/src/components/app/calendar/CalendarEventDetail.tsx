'use client';

import { ArrowLeft, Video, Trash2, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { CalendarEventItem } from '@/mocks/calendarEvents';

interface CalendarEventDetailProps {
  event: CalendarEventItem;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export default function CalendarEventDetail({ event, onBack, onDelete }: CalendarEventDetailProps) {
  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-semibold text-sm text-neutral-900">Detalle del Evento</h1>

        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-neutral-900 leading-snug">{event.title}</h2>
            <p className="text-xs text-neutral-500 font-normal mt-0.5">{event.time}</p>
          </div>
        </div>

        {event.meetUrl && (
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <div className="flex items-center gap-2 text-brand-primary font-semibold text-xs">
              <Video className="w-4 h-4" />
              <span>Videollamada en línea</span>
            </div>
            <p className="text-xs text-neutral-600 font-normal truncate">{event.meetUrl}</p>
            <a
              href={event.meetUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full h-10 rounded-xl bg-brand-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-brand-dark"
            >
              <span>Unirse a la reunión</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Fecha</span>
          <p className="text-xs text-neutral-900 font-normal">{event.dateStr}</p>
        </div>
      </div>
    </div>
  );
}
