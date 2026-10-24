'use client';

import { FormEvent, useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface BeeServicesAiSearchCardProps {
  onSearch: (query: string) => void;
  onPressVoice: () => void;
}

export default function BeeServicesAiSearchCard({
  onSearch,
  onPressVoice,
}: BeeServicesAiSearchCardProps) {
  const [query, setQuery] = useState('');

  const submitSearch = () => {
    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    onSearch(trimmed);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitSearch();
  };

  return (
    <section className="relative overflow-hidden rounded-[22px] bg-[#7427D5] px-6 py-6 shadow-[0_14px_28px_rgba(94,26,191,0.26)] sm:px-7">
      <div className="pointer-events-none absolute -right-20 top-5 h-52 w-52 rounded-full bg-[rgba(173,92,255,0.28)]" />
      <div className="pointer-events-none absolute -right-3 top-11 h-32 w-32 rounded-full bg-[rgba(202,137,255,0.16)]" />

      <div className="relative max-w-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-white" />
          <h2 className="text-lg font-extrabold text-white">
            ¿Qué necesitas hoy?
          </h2>
        </div>

        <p className="mt-1 text-sm leading-5 text-white/95">
          Pregúntale a la IA para encontrar el servicio perfecto.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex min-h-12 w-full items-center rounded-full bg-white py-1.5 pl-4 pr-2 shadow-sm"
        >
          <Sparkles className="h-[18px] w-[18px] shrink-0 text-[#7C2DE0]" />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Necesito un técnico en Montería..."
            aria-label="Buscar servicio o producto"
            className="ml-3 min-w-0 flex-1 border-0 bg-transparent text-xs leading-4 text-neutral-800 outline-none placeholder:text-[#695E78]"
          />

          <button
            type="button"
            onClick={onPressVoice}
            aria-label="Buscar mediante voz"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7427D5] text-white transition-colors hover:bg-[#5E1ABF]"
          >
            <Mic className="h-[17px] w-[17px]" />
          </button>
        </form>
      </div>
    </section>
  );
}
