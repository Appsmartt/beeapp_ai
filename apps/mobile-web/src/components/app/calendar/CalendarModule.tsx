'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { MOCK_CALENDAR_EVENTS, CalendarEventItem } from '@/mocks/calendarEvents';
import CalendarEventDetail from './CalendarEventDetail';
import CreateEventModal from './CreateEventModal';

const DAYS = [
  { dayName: 'Lun', dayNum: '27', fullDate: '2026-07-27' },
  { dayName: 'Mar', dayNum: '28', fullDate: '2026-07-28', isToday: true },
  { dayName: 'Mié', dayNum: '29', fullDate: '2026-07-29' },
  { dayName: 'Jue', dayNum: '30', fullDate: '2026-07-30' },
  { dayName: 'Vie', dayNum: '31', fullDate: '2026-07-31' },
  { dayName: 'Sáb', dayNum: '01', fullDate: '2026-08-01' },
  { dayName: 'Dom', dayNum: '02', fullDate: '2026-08-02' },
];

export default function CalendarModule() {
  const [events, setEvents] = useState<CalendarEventItem[]>(MOCK_CALENDAR_EVENTS);
  const [selectedDay, setSelectedDay] = useState('2026-07-28');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleCreateEvent = (newEvent: CalendarEventItem) => {
    setEvents([newEvent, ...events]);
    setSelectedEvent(newEvent);
  };

  const filteredEvents = events.filter((ev) => ev.dateStr === selectedDay);

  return (
    <div className="bg-white min-h-full flex flex-row relative">
      {/* LEFT COLUMN: Calendar Strip & Events (440px wide) */}
      <div className="w-[440px] shrink-0 border-r border-neutral-200 flex flex-col">
        {/* Header Controls */}
        <div className="p-4 border-b border-neutral-100 space-y-3 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-base text-neutral-900">Agenda & Eventos</h1>

            <div className="flex items-center gap-2">
              {/* Day/Week/Month selector */}
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60 text-[11px] font-semibold">
                {(['day', 'week', 'month'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                      viewMode === m ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                    }`}
                  >
                    {m === 'day' ? 'Día' : m === 'week' ? 'Sem' : 'Mes'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="h-9 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-brand-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>

          {/* Week Strip */}
          <div className="flex items-center justify-between gap-1 pt-1">
            <button type="button" className="p-1 text-neutral-400 hover:text-neutral-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex justify-between gap-1">
              {DAYS.map((d) => {
                const isSelected = selectedDay === d.fullDate;
                return (
                  <button
                    key={d.fullDate}
                    type="button"
                    onClick={() => setSelectedDay(d.fullDate)}
                    className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-colors ${
                      isSelected
                        ? 'bg-brand-primary text-white font-bold shadow-xs'
                        : d.isToday ? 'bg-brand-primary/10 text-brand-primary font-semibold' : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <span className="text-[10px] font-normal opacity-80">{d.dayName}</span>
                    <span className="text-xs font-semibold">{d.dayNum}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="p-1 text-neutral-400 hover:text-neutral-800">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="p-4 flex-1 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <CalendarIcon className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">Sin eventos programados para este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-brand-primary/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                      {ev.meetUrl ? <Video className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-neutral-900">{ev.title}</h3>
                      <p className="text-[11px] text-neutral-500 font-normal mt-0.5">{ev.time}</p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Calendar Event Detail (flex-1) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selectedEvent ? (
          <CalendarEventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onDelete={(id) => {
              setEvents((prev) => prev.filter((ev) => ev.id !== id));
              setSelectedEvent(null);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <CalendarIcon className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ningún evento seleccionado</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona un compromiso de la lista para ver su horario y enlace.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateEvent}
      />
    </div>
  );
}
