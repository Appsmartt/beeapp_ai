'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
        onClick={() => setOpen(!open)}
        className={
          isInline
            ? 'flex h-full max-w-[9.5rem] items-center gap-1.5 border-0 bg-transparent px-2.5 transition-colors hover:bg-neutral-100/80 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[11rem]'
            : 'flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60'
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
          <div className={`absolute top-full left-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg ${isInline ? 'min-w-[16rem]' : 'right-0'}`}>
            {countries.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onSelectCountry(c);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors ${
                  c.code === current.code ? 'bg-brand-primary/5' : ''
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="text-xs font-medium text-neutral-800">{c.name}</span>
                <span className="text-xs text-neutral-500 ml-auto">{c.dialCode}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
