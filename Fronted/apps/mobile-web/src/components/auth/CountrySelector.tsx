'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
];

interface CountrySelectorProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

export default function CountrySelector({ selectedCountry, onSelectCountry }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-12 px-3 bg-neutral-50 border border-neutral-300 rounded-l-xl text-neutral-800 text-sm font-normal hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
      >
        <span className="text-base">{selectedCountry.flag}</span>
        <span className="font-medium text-neutral-900">{selectedCountry.dialCode}</span>
        <ChevronDown className="w-4 h-4 text-neutral-500" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onSelectCountry(c);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50 transition-colors ${
                  c.code === selectedCountry.code ? 'bg-brand-primary/5 text-brand-primary font-medium' : 'text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span className="font-normal">{c.name}</span>
                </div>
                <span className="text-xs text-neutral-400 font-mono">{c.dialCode}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
