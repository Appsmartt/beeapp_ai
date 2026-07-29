'use client';

import { useState } from 'react';
import { X, Calendar as CalendarIcon, Video } from 'lucide-react';
import { CalendarEventItem } from '@/mocks/calendarEvents';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (event: CalendarEventItem) => void;
}

export default function CreateEventModal({ isOpen, onClose, onCreate }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00 AM - 11:00 AM');
  const [meetUrl, setMeetUrl] = useState('');
  const [type, setType] = useState<'meeting' | 'task' | 'reminder'>('meeting');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEv: CalendarEventItem = {
      id: `ev-${Date.now()}`,
      title,
      time,
      type,
      meetUrl: type === 'meeting' ? (meetUrl || 'https://meet.google.com/new-meeting') : undefined,
      dateStr: '2026-07-28',
    };

    onCreate(newEv);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 p-5 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-sm text-neutral-900">Nuevo Evento de Agenda</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-neutral-700">Título del evento</label>
            <input
              type="text"
              required
              placeholder="Reunión de proyecto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Horario</label>
            <input
              type="text"
              placeholder="09:00 AM - 10:00 AM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Tipo de compromiso</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'meeting' | 'task' | 'reminder')}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary text-neutral-800"
            >
              <option value="meeting">Reunión con Videollamada</option>
              <option value="task">Tarea programada</option>
              <option value="reminder">Recordatorio</option>
            </select>
          </div>

          {type === 'meeting' && (
            <div>
              <label className="text-[11px] font-medium text-neutral-700">Enlace de Videollamada (opcional)</label>
              <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-xl px-3 h-10 gap-2">
                <Video className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={meetUrl}
                  onChange={(e) => setMeetUrl(e.target.value)}
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm mt-2"
          >
            Crear evento
          </button>
        </form>

      </div>
    </div>
  );
}
