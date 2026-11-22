'use client';

import { useState } from 'react';
import {
  SlidersHorizontal,
  Search,
  Menu,
  Check,
  X,
  Mail,
  MessageCircle,
  FileText,
  Users,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import ModuleQuickMenu, { type QuickModuleKey } from './ModuleQuickMenu';
import type { ModuleKey } from './modules';
import {
  HOME_FILTER_LABELS,
  HOME_FILTER_TO_LABEL,
  LABEL_TO_HOME_FILTER,
  type HomeContentFilter,
} from './home/homeSearchFilters';
import { useHomeSearch } from './home/HomeSearchContext';

const FILTER_ICON_MAP: Record<HomeContentFilter, typeof SlidersHorizontal> = {
  todos: SlidersHorizontal,
  correo: Mail,
  chat: MessageCircle,
  nota: FileText,
  contacto: Users,
  archivo: FolderOpen,
  evento: Calendar,
};

interface HomeHeaderProps {
  onOpenSideMenu: () => void;
  onSelectModule: (key: QuickModuleKey) => void;
  activeModule?: ModuleKey;
}

export default function HomeHeader({ onOpenSideMenu, onSelectModule, activeModule }: HomeHeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const {
    filter,
    query,
    setFilter,
    setQuery,
    clearSearch,
  } = useHomeSearch();

  const selectedFilter = HOME_FILTER_TO_LABEL[filter];
  const filterActive = filter !== 'todos';
  const ActiveFilterIcon = FILTER_ICON_MAP[filter] || SlidersHorizontal;

  const handleSelectFilter = (label: (typeof HOME_FILTER_LABELS)[number]) => {
    const next = LABEL_TO_HOME_FILTER[label];

    if (next === filter) {
      clearSearch();
    } else {
      setFilter(next);
      if (next !== 'todos') {
        setQuery(query);
      }
    }

    setFilterOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#E4D8F2] bg-[#F7F4FB] px-2.5 py-1.5 sm:px-5 sm:py-3">
      <div className="flex items-center gap-1.5 sm:gap-3">

        {/* Filter Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors sm:h-11 sm:w-11 sm:rounded-2xl ${
              filterActive
                ? 'bg-brand-primary text-white shadow-sm'
                : 'border border-[#E4D8F2] bg-white text-neutral-600 hover:bg-[#F7F2FC]'
            }`}
            title="Filtrar por tipo"
            aria-expanded={filterOpen}
          >
            <ActiveFilterIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
          </button>

          {/* Filter Dropdown Overlay */}
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
              <div className="absolute top-full left-0 z-50 mt-2 w-[min(12rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-white py-1.5 shadow-xl">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Filtrar contenido
                </div>
                {HOME_FILTER_LABELS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectFilter(type)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left font-normal text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <span>{type}</span>
                    {selectedFilter === type && (
                      <Check className="w-4 h-4 text-brand-primary" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Search Input */}
        <div className="flex h-9 min-w-0 max-w-xl flex-1 items-center gap-1.5 rounded-xl border border-[#E4D8F2] bg-white px-2.5 transition-all focus-within:border-[#7427D5] sm:h-11 sm:gap-2 sm:rounded-2xl sm:px-3">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="search"
            placeholder={selectedFilter === 'Todos' ? 'Buscar en Buddy...' : `Buscar en ${selectedFilter}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 w-full bg-transparent text-base text-neutral-900 font-normal outline-none placeholder:text-xs placeholder:text-neutral-400 sm:text-sm sm:placeholder:text-sm"
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Borrar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ModuleQuickMenu activeModule={activeModule} onSelect={onSelectModule} />
        <button
          type="button"
          onClick={onOpenSideMenu}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E4D8F2] bg-white text-neutral-700 transition-colors hover:bg-[#F7F2FC] sm:h-11 sm:w-11 sm:rounded-2xl"
          title="Menú principal"
        >
          <Menu className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
        </button>
        </div>

      </div>
    </header>
  );
}
