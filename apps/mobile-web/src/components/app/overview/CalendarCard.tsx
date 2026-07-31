'use client';

import { Calendar, Video, Users } from 'lucide-react';
import { MOCK_CALENDAR_EVENTS } from '@/mocks/calendarEvents';
import OverviewCard from './OverviewCard';

interface CalendarCardProps {
  onSeeMore: () => void;
}

/** Agenda: mini timeline vertical con la línea morada a la izquierda */
export default function CalendarCard({ onSeeMore }: CalendarCardProps) {
  const events = MOCK_CALENDAR_EVENTS.slice(0, 5);

  return (
    <OverviewCard title="Agenda" icon={Calendar} onSeeMore={onSeeMore}>
      <div className="relative pl-5">
        {/* Línea de la timeline */}
        <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-brand-primary/25" />

        <div className="space-y-3.5">
          {events.map((event) => (
            <div key={event.id} className="relative">
              {/* Punto sobre la línea */}
              <span className="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full border-2 border-brand-primary bg-white" />

              <p className="text-[11px] text-brand-primary font-normal">{event.time}</p>
              <p className="text-xs text-neutral-900 font-normal truncate mt-0.5">{event.title}</p>

              <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400 font-normal">
                {event.meetUrl ? (
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3" /> Videollamada
                  </span>
                ) : (
                  <span>Tarea programada</span>
                )}
                {event.attendeesCount ? (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {event.attendeesCount}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </OverviewCard>
  );
}
