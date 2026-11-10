'use client';

import { FormEvent } from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface BeeServicesAiSearchCardProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onPressVoice: () => void;
  listening?: boolean;
  busy?: boolean;
}

export default function BeeServicesAiSearchCard({
  value,
  onChangeText,
  onSubmit,
  onPressVoice,
  listening = false,
  busy = false,
}: BeeServicesAiSearchCardProps) {
  const status = busy
    ? 'Transcribiendo…'
    : listening
      ? 'Escuchando… toca el micrófono para buscar'
      : '';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="relative overflow-hidden rounded-[22px] bg-[#7427D5] px-6 py-6 shadow-[0_14px_28px_rgba(94,26,191,0.26)] sm:px-7">
      <div className="pointer-events-none absolute -right-20 top-5 h-52 w-52 rounded-full bg-[rgba(173,92,255,0.28)]" />
      <div className="pointer-events-none absolute -right-3 top-11 h-32 w-32 rounded-full bg-[rgba(202,137,255,0.16)]" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">
            ¿Qué necesitas hoy?
          </h2>
          <p className="mt-1 text-sm leading-5 text-white/95">
            Pregúntale a la IA para encontrar el servicio perfecto.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#7567D9]">
          <Sparkles className="h-3 w-3" />
          IA
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative mt-5 flex min-h-12 w-full items-center rounded-full bg-white py-1.5 pl-4 pr-2 shadow-sm"
      >
        <Sparkles className="h-[18px] w-[18px] shrink-0 text-[#7567D9]" />
        <input
          type="search"
          value={value}
          disabled={listening || busy}
          onChange={(event) => onChangeText(event.target.value)}
          placeholder="Necesito un técnico en Montería..."
          aria-label="Pregúntale a la IA qué necesitas"
          className="ml-3 min-w-0 flex-1 border-0 bg-transparent text-xs leading-4 text-neutral-800 outline-none placeholder:text-[#8B93A7] disabled:opacity-70"
        />
        <button
          type="button"
          onClick={onPressVoice}
          disabled={busy}
          aria-label={listening ? 'Detener y buscar por voz' : 'Buscar mediante voz'}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-70 ${
            listening ? 'bg-[#5E1ABF]' : 'bg-[#7427D5] hover:bg-[#5E1ABF]'
          }`}
        >
          <Mic className="h-[17px] w-[17px]" />
        </button>
      </form>

      {status ? (
        <p className="relative mt-2 text-xs font-medium text-white/90" role="status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
