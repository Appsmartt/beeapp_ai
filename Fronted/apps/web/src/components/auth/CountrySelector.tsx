'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

interface CountrySelectorProps {
  countries: Country[];
  selectedCountry: Country | null;
  onSelectCountry: (country: Country) => void;
  /** Integrado en fila de teléfono (sin borde propio). */
  variant?: 'default' | 'inline';
  disabled?: boolean;
}

export default function CountrySelector({
  countries,
  selectedCountry,
  onSelectCountry,
  variant = 'default',
  disabled = false,
}: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter((country) => (
      country.name.toLowerCase().includes(query)
      || country.dialCode.toLowerCase().includes(query)
      || country.code.toLowerCase().includes(query)
    ));
  }, [countries, search]);

  if (countries.length === 0) {
    return (
      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
        Lista de países no disponible. Contacta al administrador.
      </p>
    );
  }

  const current = selectedCountry ?? countries[0];
  const isInline = variant === 'inline';

  return (
    <div className={`relative ${isInline ? 'h-full shrink-0' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch('');
        }}
        className={
          isInline
            ? 'flex h-full max-w-[9.5rem] items-center gap-1.5 rounded-l-lg border-0 bg-transparent px-2.5 transition-colors hover:bg-neutral-100/80 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[11rem]'
            : 'flex h-10 w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        <span className="text-lg leading-none">{current.flag}</span>
        {isInline ? (
          <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-800">
            <span className="sm:hidden">{current.dialCode}</span>
            <span className="hidden sm:inline">
              {current.name}
              {' '}
              <span className="text-neutral-500">{current.dialCode}</span>
            </span>
          </span>
        ) : (
          <span className="flex-1 truncate text-left text-xs font-medium text-neutral-800">
            {current.name} ({current.dialCode})
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 w-[min(17.5rem,calc(100vw-2.5rem))] rounded-xl border border-neutral-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar país o indicativo…"
                className="w-full bg-transparent text-xs text-neutral-800 outline-none placeholder:text-neutral-400"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-neutral-400">Sin resultados</p>
              ) : (
                filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onSelectCountry(c);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors ${
                      c.code === current.code ? 'bg-brand-primary/5' : ''
                    }`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="text-xs font-medium text-neutral-800">{c.name}</span>
                    <span className="text-xs text-neutral-500 ml-auto">{c.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
