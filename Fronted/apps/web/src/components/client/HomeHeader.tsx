'use client';

import { useState } from 'react';
import { SlidersHorizontal, Search, Menu, Check } from 'lucide-react';

interface HomeHeaderProps {
  onOpenSideMenu: () => void;
}

const FILTER_TYPES = [
  'Todos',
  'Correos',
  'Chats',
  'Notas',
  'Contactos',
  'Archivos',
  'Agenda',
];

export default function HomeHeader({ onOpenSideMenu }: HomeHeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-30 border-b border-[#E4D8F2] bg-[#EFE8F8] px-4 py-3">
      <div className="flex items-center gap-2.5">

        {/* Filter Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              selectedFilter !== 'Todos'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'border border-[#E4D8F2] bg-white text-neutral-600 hover:bg-[#F7F2FC]'
            }`}
            title="Filtrar por tipo"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>

          {/* Filter Dropdown Overlay */}
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Filtrar contenido
                </div>
                {FILTER_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedFilter(type);
                      setFilterOpen(false);
                    }}
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
        <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-[#E4D8F2] bg-white px-3 transition-all focus-within:border-brand-primary">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder={selectedFilter === 'Todos' ? 'Elige qué buscar...' : `Buscar en ${selectedFilter}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-neutral-900 font-normal outline-none placeholder:text-neutral-400"
          />
        </div>

        {/* Menú lateral: perfil, ajustes y el resto de accesos */}
        <button
          type="button"
          onClick={onOpenSideMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E4D8F2] bg-white text-neutral-700 transition-colors hover:bg-[#F7F2FC]"
          title="Menú principal"
        >
          <Menu className="w-5 h-5" />
        </button>

      </div>
    </header>
  );
}
