'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { MOCK_CALENDAR_EVENTS, CalendarEventItem } from '@/mocks/calendarEvents';
import CalendarOptionsBar, { CalendarFilter } from './CalendarOptionsBar';
import CalendarEventRow from './CalendarEventRow';
import CalendarEventDetail from './CalendarEventDetail';
import CreateEventModal from './CreateEventModal';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const YEARS = [2024, 2025, 2026, 2027, 2028];
const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarModule() {
  const [events, setEvents] = useState<CalendarEventItem[]>(MOCK_CALENDAR_EVENTS);
  const [filter, setFilter] = useState<CalendarFilter>('upcoming');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
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
  });

  return (
    <div className="bg-white min-h-full flex flex-row relative select-none">
      {/* 1. BARRA DE OPCIONES DE AGENDA (56px) */}
      <CalendarOptionsBar filter={filter} onSelectFilter={setFilter} />

      {/* 2. PANEL IZQUIERDO: Tira semanal + Lista (40% de ancho, min 380px, max 450px) */}
      <div className="w-[380px] lg:w-[420px] shrink-0 border-r border-neutral-200 flex flex-col bg-white">
        {/* Cabecera de Agenda */}
        <div className="p-3.5 border-b border-neutral-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 relative">
              {/* Selector de Mes con Dropdown */}
              <div ref={monthRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
                  className="font-semibold text-sm text-neutral-900 flex items-center gap-1 hover:text-brand-primary transition-colors"
                >
                  <span>{MONTHS[currentMonthIdx]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {monthDropdownOpen && (
                  <div className="absolute left-0 top-7 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-40 p-2 grid grid-cols-3 gap-1 animate-in fade-in zoom-in-95 duration-100">
                    {SHORT_MONTHS.map((m, idx) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={`py-1.5 text-xs rounded-lg transition-colors font-normal ${
                          idx === currentMonthIdx
                            ? 'bg-brand-primary text-white font-semibold'
                            : 'hover:bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector de Año con Dropdown */}
              <div ref={yearRef} className="relative">
                <button
                  type="button"
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  className="font-normal text-sm text-neutral-500 flex items-center gap-1 hover:text-brand-primary transition-colors"
                >
                  <span>{currentYearNum}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {yearDropdownOpen && (
                  <div className="absolute left-0 top-7 w-28 bg-white border border-neutral-200 rounded-xl shadow-xl z-40 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                    {YEARS.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => handleSelectYear(yr)}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors font-normal ${
                          yr === currentYearNum
                            ? 'bg-brand-primary text-white font-semibold'
                            : 'hover:bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Botón Hoy */}
              <button
                type="button"
                onClick={handleToday}
                className="h-8 px-2.5 rounded-full border border-neutral-200 text-xs font-normal text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Hoy
              </button>

              {/* Selector Vista Día / Sem / Mes */}
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60 text-[11px] font-normal">
                {(['day', 'week', 'month'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={`px-2 py-0.5 rounded-lg transition-colors ${
                      viewMode === m ? 'bg-white text-brand-primary shadow-xs font-semibold' : 'text-neutral-500'
                    }`}
                  >
                    {m === 'day' ? 'Día' : m === 'week' ? 'Sem' : 'Mes'}
                  </button>
                ))}
              </div>

              {/* Botón + Nuevo */}
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

          {/* Tira semanal con días */}
          <div className="flex items-center justify-between gap-1 pt-1">
            <button type="button" className="p-1 text-neutral-400 hover:text-neutral-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex justify-between gap-1">
              {weekDays.map((d) => {
                const isSelected = selectedDayStr === d.isoStr;
                return (
                  <button
                    key={d.isoStr}
                    type="button"
                    onClick={() => setSelectedDayStr(d.isoStr)}
                    className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-colors ${
                      isSelected
                        ? 'bg-brand-primary text-white font-semibold shadow-xs'
                        : d.isToday
                        ? 'border border-brand-primary text-brand-primary font-semibold'
                        : 'hover:bg-neutral-100 text-neutral-700 font-normal'
                    }`}
                  >
                    <span className="text-[10px] font-normal opacity-80">{d.name}</span>
                    <span className="text-xs font-semibold">{d.num}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="p-1 text-neutral-400 hover:text-neutral-800">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className="flex-1 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
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

      {/* 3. PANEL DERECHO: Detalle del evento (flex-1) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selectedEvent ? (
          <CalendarEventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onEdit={() => setCreateModalOpen(true)}
            onDelete={handleDeleteEvent}
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

      {/* Modal de Creación / Edición */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateEvent}
      />
    </div>
  );
}
