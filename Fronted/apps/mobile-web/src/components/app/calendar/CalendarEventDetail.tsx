'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Video,
  Trash2,
  Calendar as CalendarIcon,
  ExternalLink,
  Users,
  Pencil,
  CheckCircle,
  HelpCircle,
  XCircle,
  Bell,
  Check,
} from 'lucide-react';
import { CalendarEventItem, REMINDER_OPTIONS } from '@/mocks/calendarEvents';

interface CalendarEventDetailProps {
  event: CalendarEventItem;
  onBack: () => void;
  onEdit: (event: CalendarEventItem) => void;
  onDelete: (id: string) => void;
  onUpdateReminder?: (eventId: string, reminder: string) => void;
}

export default function CalendarEventDetail({
  event,
  onBack,
  onEdit,
  onDelete,
  onUpdateReminder,
}: CalendarEventDetailProps) {
  const [userResponse, setUserResponse] = useState<'accepted' | 'maybe' | 'declined' | 'pending'>(
    event.userResponse || 'pending'
  );
  const [reminder, setReminder] = useState<string>(event.reminder || '30 minutos antes');
  const [reminderDropdownOpen, setReminderDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReminder(event.reminder || '30 minutos antes');
  }, [event]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setReminderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectReminder = (opt: string) => {
    setReminder(opt);
    setReminderDropdownOpen(false);
    if (onUpdateReminder) {
      onUpdateReminder(event.id, opt);
    }
  };

  return (
    <div className="bg-white min-h-full flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-semibold text-sm text-neutral-900">Detalle del Evento</h1>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100"
            title="Editar evento"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(event.id)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
            title="Eliminar evento"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            {event.type === 'meeting' ? <Video className="w-6 h-6" /> : <CalendarIcon className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="font-semibold text-base text-neutral-900 leading-snug">{event.title}</h2>
            <p className="text-xs text-neutral-500 font-normal mt-0.5">{event.time} ({event.duration || '45 min'})</p>
          </div>
        </div>

        {/* Sección de Tu Respuesta (RSVP) */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
          <span className="text-[11px] font-semibold text-neutral-700">¿Asistirás a esta reunión/evento?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUserResponse('accepted')}
              className={`flex-1 h-9 rounded-xl text-xs font-normal flex items-center justify-center gap-1.5 border transition-all ${
                userResponse === 'accepted'
                  ? 'bg-emerald-600 border-emerald-600 text-white font-semibold shadow-xs'
                  : 'border-emerald-600/40 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Aceptar</span>
            </button>

            <button
              type="button"
              onClick={() => setUserResponse('maybe')}
              className={`flex-1 h-9 rounded-xl text-xs font-normal flex items-center justify-center gap-1.5 border transition-all ${
                userResponse === 'maybe'
                  ? 'bg-amber-500 border-amber-500 text-white font-semibold shadow-xs'
                  : 'border-amber-500/40 text-amber-700 hover:bg-amber-50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Tal vez</span>
            </button>

            <button
              type="button"
              onClick={() => setUserResponse('declined')}
              className={`flex-1 h-9 rounded-xl text-xs font-normal flex items-center justify-center gap-1.5 border transition-all ${
                userResponse === 'declined'
                  ? 'bg-red-600 border-red-600 text-white font-semibold shadow-xs'
                  : 'border-red-600/40 text-red-700 hover:bg-red-50'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>Rechazar</span>
            </button>
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
              className="w-full h-10 rounded-xl bg-brand-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-brand-dark transition-colors"
            >
              <span>Unirse a la reunión</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Recordatorio */}
        <div className="space-y-1.5 pt-2 border-t border-neutral-100 relative" ref={dropdownRef}>
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Recordatorio</span>
          <button
            type="button"
            onClick={() => setReminderDropdownOpen(!reminderDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 hover:bg-neutral-100/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-primary" />
              <span className="text-xs text-neutral-800 font-normal">{reminder}</span>
            </div>
          </button>

          {reminderDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 py-1.5 z-30 max-h-56 overflow-y-auto">
              {REMINDER_OPTIONS.map((opt) => {
                const isSelected = reminder === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectReminder(opt)}
                    className="w-full px-3 py-2 text-left text-xs font-normal text-neutral-800 hover:bg-neutral-50 flex items-center justify-between transition-colors"
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Organizador */}
        <div className="space-y-1.5 pt-2 border-t border-neutral-100">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Organizador</span>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-xs flex items-center justify-center">
              {event.organizer?.initials || 'SV'}
            </div>
            <span className="text-xs text-neutral-800 font-normal">{event.organizer?.name || 'Santiago V.'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Fecha</span>
            <p className="text-xs text-neutral-900 font-normal">{event.dateStr}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Ubicación</span>
            <p className="text-xs text-neutral-900 font-normal">{event.location || (event.meetUrl ? 'Virtual (Meet)' : 'Presencial')}</p>
          </div>
        </div>

        {event.description && (
          <div className="space-y-1 pt-2 border-t border-neutral-100">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Descripción</span>
            <p className="text-xs text-neutral-700 font-normal leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* Participantes */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
            <Users className="w-4 h-4 text-neutral-500" />
            <span>Participantes ({event.invitees?.length || event.attendeesCount || 0})</span>
          </div>

          <div className="space-y-2">
            {(event.invitees || [
              { name: 'Carlos Mendoza', initials: 'CM', color: '#EBF5FF', status: 'accepted' },
              { name: 'Eduardo Torres', initials: 'ET', color: '#FEF3C7', status: 'pending' },
              { name: 'María Gómez', initials: 'MG', color: '#ECFDF5', status: 'accepted' },
            ]).map((inv, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-xs flex items-center justify-center">
                    {inv.initials}
                  </div>
                  <span className="text-xs text-neutral-800 font-normal">{inv.name}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-normal text-neutral-500">
                  {inv.status === 'accepted' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      <CheckCircle className="w-3 h-3" /> Aceptado
                    </span>
                  ) : inv.status === 'declined' ? (
                    <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/60">
                      <XCircle className="w-3 h-3" /> Rechazado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                      <HelpCircle className="w-3 h-3" /> Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
