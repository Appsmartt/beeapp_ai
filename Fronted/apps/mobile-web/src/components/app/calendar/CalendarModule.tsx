'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronDown } from 'lucide-react';
import { MOCK_CALENDAR_EVENTS, CalendarEventItem } from '@/mocks/calendarEvents';
import CalendarOptionsBar, { CalendarFilter } from './CalendarOptionsBar';
import CalendarEventRow from './CalendarEventRow';
import CalendarEventDetail from './CalendarEventDetail';
import CreateEventModal from './CreateEventModal';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const YEARS = [2024, 2025, 2026, 2027, 2028];
const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarModule() {
  const [events, setEvents] = useState<CalendarEventItem[]>(MOCK_CALENDAR_EVENTS);
  const [filter, setFilter] = useState<CalendarFilter>('upcoming');
  const [selectedDayStr, setSelectedDayStr] = useState('2026-07-28');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);

  // Dropdown states for Month and Year pickers
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  const currentDateObj = new Date(selectedDayStr);
  const currentMonthIdx = currentDateObj.getMonth();
  const currentYearNum = currentDateObj.getFullYear();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) setMonthDropdownOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMonth = (idx: number) => {
    const updated = new Date(currentYearNum, idx, 28);
    setSelectedDayStr(updated.toISOString().split('T')[0]);
    setMonthDropdownOpen(false);
  };

  const handleSelectYear = (yr: number) => {
    const updated = new Date(yr, currentMonthIdx, 28);
    setSelectedDayStr(updated.toISOString().split('T')[0]);
    setYearDropdownOpen(false);
  };

  const handleToday = () => {
    setSelectedDayStr('2026-07-28');
  };

  const handleCreateEvent = (newEvent: CalendarEventItem) => {
    setEvents([newEvent, ...events]);
    setSelectedEvent(newEvent);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    if (selectedEvent?.id === id) setSelectedEvent(null);
  };

  // Week Days calculation (7 days centered around selected week)
  const getWeekDays = () => {
    const d = new Date(selectedDayStr);
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
    const start = new Date(d);
    start.setDate(d.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + i);
      const isoStr = dayDate.toISOString().split('T')[0];
      return {
        name: WEEK_DAYS[i],
        num: dayDate.getDate(),
        isoStr,
        isToday: isoStr === '2026-07-28',
      };
    });
  };

  const weekDays = getWeekDays();

  // Filter application
  const filteredEvents = events.filter((ev) => {
    if (filter === 'upcoming') return new Date(ev.dateStr) >= new Date('2026-07-28');
    if (filter === 'past') return new Date(ev.dateStr) < new Date('2026-07-28');
    if (filter === 'meetings') return ev.type === 'meeting';
    if (filter === 'events') return ev.type !== 'meeting';
    return true;
  });  const handleUpdateReminder = (eventId: string, reminder: string) => {
    setEvents((prev) => prev.map((ev) => (ev.id === eventId ? { ...ev, reminder } : ev)));
    if (selectedEvent?.id === eventId) {
      setSelectedEvent((prev) => (prev ? { ...prev, reminder } : null));
    }
  };

  return (
    <div className="bg-white min-h-full flex flex-row relative select-none">
      <CalendarOptionsBar filter={filter} onSelectFilter={setFilter} />

      <div className="w-[380px] lg:w-[420px] shrink-0 border-r border-neutral-200 flex flex-col bg-white">
        <div className="p-3.5 border-b border-neutral-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base text-neutral-900">Agenda</h1>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-[11px] font-semibold hover:bg-brand-primary/20 transition-colors"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={monthRef}>
                <button
                  type="button"
                  onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
                  className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-xs font-semibold text-neutral-800 flex items-center gap-1 transition-colors"
                >
                  <span>{MONTHS[currentMonthIdx]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                </button>

                {monthDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-2xl shadow-xl border border-neutral-100 py-1.5 z-30 max-h-56 overflow-y-auto">
                    {MONTHS.map((m, idx) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={`w-full px-3 py-1.5 text-left text-xs font-normal transition-colors ${
                          idx === currentMonthIdx
                            ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={yearRef}>
                <button
                  type="button"
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-xs font-semibold text-neutral-800 flex items-center gap-1 transition-colors"
                >
                  <span>{currentYearNum}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                </button>

                {yearDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-2xl shadow-xl border border-neutral-100 py-1.5 z-30">
                    {YEARS.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => handleSelectYear(yr)}
                        className={`w-full px-3 py-1.5 text-left text-xs font-normal transition-colors ${
                          yr === currentYearNum
                            ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-brand-dark transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-neutral-50 p-1.5 rounded-2xl border border-neutral-200/80">
            {weekDays.map((d) => {
              const isSelected = d.isoStr === selectedDayStr;
              return (
                <button
                  key={d.isoStr}
                  type="button"
                  onClick={() => setSelectedDayStr(d.isoStr)}
                  className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-all ${
                    isSelected
                      ? 'bg-brand-primary text-white font-semibold shadow-xs'
                      : d.isToday
                      ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-200/60'
                  }`}
                >
                  <span className="text-[10px] font-normal uppercase opacity-80">{d.name}</span>
                  <span className="text-xs font-semibold">{d.num}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 space-y-2">
              <CalendarIcon className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">Sin eventos programados</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredEvents.map((ev) => (
                <CalendarEventRow
                  key={ev.id}
                  event={ev}
                  isSelected={selectedEvent?.id === ev.id}
                  onSelect={() => setSelectedEvent(ev)}
                  onEdit={() => setCreateModalOpen(true)}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {selectedEvent ? (
          <CalendarEventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onEdit={() => setCreateModalOpen(true)}
            onDelete={handleDeleteEvent}
            onUpdateReminder={handleUpdateReminder}
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

      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateEvent}
      />
    </div>
  );
}
