'use client';

import { X, Mic, Pause, RotateCcw } from 'lucide-react';

interface VoiceControlsProps {
  /** true mientras se escucha o se responde: el micrófono pasa a pausa */
  isTalking: boolean;
  onRestart: () => void;
  onToggleMic: () => void;
  onClose: () => void;
}

/** Botón secundario: 46px, fondo violeta translúcido (`rgba(237,233,254,0.12)`) */
const SECONDARY =
  'w-[46px] h-[46px] rounded-full bg-[rgba(237,233,254,0.12)] hover:bg-[rgba(237,233,254,0.2)] ' +
  'text-[#EDE9FE] flex items-center justify-center transition-colors shrink-0';

/** Controles de voz: reiniciar · micrófono · cerrar */
export default function VoiceControls({
  isTalking,
  onRestart,
  onToggleMic,
  onClose,
}: VoiceControlsProps) {
  return (
    <div className="flex items-center justify-center gap-5 sm:gap-7 mt-2">
      <button type="button" onClick={onRestart} aria-label="Reiniciar" className={SECONDARY}>
        <RotateCcw className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={onToggleMic}
        aria-label={isTalking ? 'Pausar' : 'Hablar'}
        style={{ boxShadow: '0 0 22px 0 rgba(167, 139, 250, 0.8)' }}
        className={`w-[76px] h-[76px] rounded-full text-white flex items-center justify-center shrink-0 transition-colors ${
          isTalking ? 'bg-[#7C3AED]' : 'bg-brand-primary'
        }`}
      >
        {isTalking ? <Pause className="w-7 h-7" /> : <Mic className="w-[30px] h-[30px]" />}
      </button>

      <button type="button" onClick={onClose} aria-label="Cerrar" className={SECONDARY}>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
