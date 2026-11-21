'use client';

import { FormEvent } from 'react';
import { Loader2, Mic, Sparkles } from 'lucide-react';

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
    <section className="relative overflow-hidden rounded-[22px] border border-[#DDD6FE] bg-[#F3F0FF] p-[18px] shadow-[0_6px_14px_rgba(117,103,217,0.10)]">
      <div className="pointer-events-none absolute -right-9 -top-7 h-[120px] w-[120px] rounded-full bg-[rgba(117,103,217,0.12)]" />
      <div className="pointer-events-none absolute -bottom-8 -left-6 h-[88px] w-[88px] rounded-full bg-[rgba(168,155,255,0.14)]" />

      <div className="relative mb-3.5 h-1 w-[42px] rounded-full bg-[#7567D9]/35" />

      <div className="relative flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1 pr-2.5">
          <h2 className="text-[17px] font-extrabold leading-[22px] text-[#26314D]">
            ¿Qué necesitas <span className="text-[#7567D9]">hoy?</span>
          </h2>
          <p className="mt-[5px] max-w-[96%] text-xs font-medium leading-[17px] text-[#64708A]">
            Pregúntale a la IA para encontrar el servicio perfecto.
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D9D0FA] bg-white/[0.72] px-[9px] py-[5px]">
          <Sparkles className="h-[11px] w-[11px] text-[#7567D9]" strokeWidth={2.4} />
          <span className="text-[10px] font-extrabold tracking-[0.4px] text-[#7567D9]">IA</span>
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative mt-4 flex min-h-[50px] w-full items-center rounded-[18px] border border-[#E8E4F8] bg-white py-1 pl-2 pr-1.5 shadow-[0_2px_6px_rgba(141,154,190,0.08)]"
      >
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] border border-[#E4DCFA] bg-[#F0EDFF]">
          <Sparkles className="h-4 w-4 text-[#7567D9]" />
        </span>

        <input
          type="search"
          value={value}
          disabled={listening || busy}
          onChange={(event) => onChangeText(event.target.value)}
          placeholder="Necesito un técnico en Montería..."
          aria-label="Pregúntale a la IA qué necesitas"
          className="ml-2 mr-2 min-w-0 flex-1 border-0 bg-transparent py-2 text-sm leading-[18px] text-[#26314D] outline-none placeholder:text-[#8B93A7] disabled:opacity-70"
        />

        <button
          type="button"
          onClick={onPressVoice}
          disabled={busy}
          aria-label={listening ? 'Detener y buscar por voz' : 'Buscar mediante voz'}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-white shadow-[0_2px_4px_rgba(95,82,197,0.22)] transition-colors disabled:opacity-70 ${
            listening ? 'bg-[#C4324A] hover:bg-[#AE2940]' : 'bg-[#7567D9] hover:bg-[#5F52C5]'
          }`}
        >
          {busy ? (
            <Loader2 className="h-[17px] w-[17px] animate-spin" />
          ) : (
            <Mic className="h-[17px] w-[17px]" />
          )}
        </button>
      </form>

      {status ? (
        <p className="relative mt-2.5 text-xs font-semibold leading-4 text-[#6C7892]" role="status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
