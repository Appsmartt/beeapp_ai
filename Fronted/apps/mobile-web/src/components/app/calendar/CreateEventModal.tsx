'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Video, MapPin, Bell, Check } from 'lucide-react';
import { CalendarEventItem, REMINDER_OPTIONS } from '@/mocks/calendarEvents';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (event: CalendarEventItem) => void;
}

export default function CreateEventModal({ isOpen, onClose, onCreate }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00 AM - 11:00 AM');
  const [dateStr, setDateStr] = useState('2026-07-28');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [meetUrl, setMeetUrl] = useState('');
  const [type, setType] = useState<'meeting' | 'task' | 'reminder'>('meeting');
  const [reminder, setReminder] = useState<string>('30 minutos antes');
  const [reminderOpen, setReminderOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setReminderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEv: CalendarEventItem = {
      id: `ev-${Date.now()}`,
      title,
      time,
      type,
      location: location || (type === 'meeting' ? 'Virtual' : 'Oficina Principal'),
      description: description || 'Sin descripción adicional.',
      meetUrl: type === 'meeting' ? (meetUrl || 'https://meet.google.com/new-meeting') : undefined,
      dateStr,
      duration: '45 min',
      reminder,
      invitees: [
        { name: 'Carlos Mendoza', initials: 'CM', color: '#EBF5FF' },
        { name: 'María Gómez', initials: 'MG', color: '#ECFDF5' },
      ],
    };

    onCreate(newEv);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4 border border-neutral-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm text-neutral-900">Nuevo Evento de Agenda</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto flex-1 pr-1">
          <div>
            <label className="text-[11px] font-normal text-neutral-600">Título del evento</label>
            <input
              type="text"
              required
              placeholder="Ej: Sincronización de Sprint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 border border-neutral-200 rounded-xl text-xs font-normal outline-none focus:border-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-normal text-neutral-600">Fecha</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full h-9 px-3 border border-neutral-200 rounded-xl text-xs font-normal outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-normal text-neutral-600">Horario</label>
              <input
                type="text"
                placeholder="10:00 AM - 11:00 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-9 px-3 border border-neutral-200 rounded-xl text-xs font-normal outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-normal text-neutral-600">Tipo de compromiso</label>
            <div className="flex gap-2 pt-1">
              {(['meeting', 'task', 'reminder'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 h-8 rounded-xl text-xs font-normal transition-colors border ${
                    type === t
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-semibold'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {t === 'meeting' ? 'Reunión' : t === 'task' ? 'Tarea' : 'Recordatorio'}
                </button>
              ))}
            </div>
          </div>

          {/* Recordatorio Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-[11px] font-normal text-neutral-600">Recordatorio</label>
            <button
              type="button"
              onClick={() => setReminderOpen(!reminderOpen)}
              className="w-full h-9 px-3 border border-neutral-200 rounded-xl text-xs font-normal text-neutral-900 bg-white flex items-center justify-between hover:bg-neutral-50"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span>{reminder}</span>
              </div>
            </button>

            {reminderOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-30 max-h-48 overflow-y-auto">
                {REMINDER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setReminder(opt);
                      setReminderOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-normal text-neutral-800 hover:bg-neutral-50 flex items-center justify-between transition-colors"
                  >
                    <span>{opt}</span>
                    {reminder === opt && <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {type === 'meeting' ? (
            <div>
              <label className="text-[11px] font-normal text-neutral-600">Enlace de Videollamada (opcional)</label>
              <div className="flex items-center border border-neutral-200 rounded-xl px-3 h-9 gap-2">
                <Video className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={meetUrl}
                  onChange={(e) => setMeetUrl(e.target.value)}
                  className="w-full bg-transparent text-xs font-normal outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-normal text-neutral-600">Ubicación</label>
              <div className="flex items-center border border-neutral-200 rounded-xl px-3 h-9 gap-2">
                <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Sala de conferencias B"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent text-xs font-normal outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-normal text-neutral-600">Descripción</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre el orden del día..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs font-normal outline-none focus:border-brand-primary resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-full border border-neutral-200 text-xs font-normal text-neutral-700 hover:bg-neutral-50">
              Cancelar
            </button>
            <button type="submit" className="flex-1 h-9 rounded-full bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors">
              Crear evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
