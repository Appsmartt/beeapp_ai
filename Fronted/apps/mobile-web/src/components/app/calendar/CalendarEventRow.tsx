'use client';

import { useState, useRef, useEffect } from 'react';
import { Video, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { CalendarEventItem } from '@/mocks/calendarEvents';

interface CalendarEventRowProps {
  event: CalendarEventItem;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: (event: CalendarEventItem) => void;
  onDelete: (id: string) => void;
}

export default function CalendarEventRow({
  event,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: CalendarEventRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const barColor = event.type === 'meeting' ? 'bg-purple-500' : event.type === 'task' ? 'bg-emerald-500' : 'bg-blue-500';

  return (
    <div
      onClick={onSelect}
      className={`group relative p-3 px-3.5 flex items-center gap-3 cursor-pointer bg-white border-b border-neutral-100 hover:bg-neutral-50 transition-colors select-none ${
        isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
      }`}
    >
      {/* Horario y duración */}
      <div className="w-16 shrink-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-normal text-neutral-900">{event.time.split('-')[0].trim()}</span>
        <span className="text-[10px] text-neutral-500 font-normal mt-0.5">
          {event.duration || '45 min'}
        </span>
      </div>

      {/* Indicador de barra de color */}
      <div className={`w-1 h-10 rounded-full shrink-0 ${barColor}`} />

      {/* Detalles del evento */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-xs text-neutral-900 truncate">{event.title}</h3>

        <div className="flex items-center gap-2 mt-1">
          {event.type === 'meeting' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
              <Video className="w-3 h-3" /> Videollamada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/60">
              <MapPin className="w-3 h-3" /> {event.location || 'Presencial'}
            </span>
          )}

          {/* Avatares de invitados */}
          {event.invitees && event.invitees.length > 0 && (
            <div className="flex items-center -space-x-1 ml-1">
              {event.invitees.slice(0, 3).map((inv, idx) => (
                <div
                  key={idx}
                  className="w-4.5 h-4.5 rounded-full bg-neutral-200 border border-white text-[8px] font-normal flex items-center justify-center text-neutral-700"
                >
                  {inv.initials}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tres puntos (MoreVertical) */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          title="Opciones de evento"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-8 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 py-1 text-xs text-neutral-800 select-none animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onEdit(event); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-neutral-500" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(event.id); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 text-left font-normal transition-colors border-t border-neutral-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
