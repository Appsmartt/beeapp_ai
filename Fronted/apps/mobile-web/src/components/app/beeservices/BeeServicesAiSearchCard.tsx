'use client';

import { Mic, Sparkles } from 'lucide-react';

interface BeeServicesAiSearchCardProps {
    onPressSearch: () => void;
    onPressVoice: () => void;
}

export default function BeeServicesAiSearchCard({
    onPressSearch,
    onPressVoice,
}: BeeServicesAiSearchCardProps) {
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

            <button
            type="button"
            onClick={onPressSearch}
            className="mt-5 flex min-h-12 w-full items-center rounded-full bg-white py-1.5 pl-4 pr-2 text-left shadow-sm transition-transform hover:scale-[1.01]"
            >
            <Sparkles className="h-[18px] w-[18px] shrink-0 text-[#7C2DE0]" />

            <span className="ml-3 flex-1 text-xs leading-4 text-[#695E78]">
                Necesito un técnico en Montería...
            </span>

            <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                event.stopPropagation();
                onPressVoice();
                }}
                onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onPressVoice();
                }
                }}
                aria-label="Buscar mediante voz"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7427D5] text-white transition-colors hover:bg-[#5E1ABF]"
            >
                <Mic className="h-[17px] w-[17px]" />
            </span>
            </button>
        </div>
        </section>
    );
}