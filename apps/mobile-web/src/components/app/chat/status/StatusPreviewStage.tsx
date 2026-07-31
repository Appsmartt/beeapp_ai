'use client';

import { useRef, type PointerEvent } from 'react';
import { X } from 'lucide-react';
import type { StatusTextAlign, StatusTextPosition } from '@/mocks/statuses';

interface StatusPreviewStageProps {
  background: string;
  photo: string | null;
  text: string;
  textColor: string;
  textSize: number;
  bold: boolean;
  align: StatusTextAlign;
  position: StatusTextPosition;
  onMoveText: (position: StatusTextPosition) => void;
  onRemovePhoto: () => void;
}

/**
 * Zona de previsualización del editor de estados: una hoja 9:16 flotando
 * sobre un fondo gris muy claro. El color o la foto viven dentro del
 * contenedor, nunca en toda la pantalla, y el texto se arrastra con el mouse.
 */
export default function StatusPreviewStage({
  background,
  photo,
  text,
  textColor,
  textSize,
  bold,
  align,
  position,
  onMoveText,
  onRemovePhoto,
}: StatusPreviewStageProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    onMoveText({
      x: Math.max(10, Math.min(90, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(8, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100)),
    });
  };

  const stopDrag = () => {
    draggingRef.current = false;
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-neutral-50 flex items-center justify-center p-6 md:p-10 overflow-hidden">
      <div
        ref={cardRef}
        onPointerMove={handleMove}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
        style={{ background: photo ? '#0F0E17' : background, aspectRatio: '9 / 16' }}
        className="relative h-full max-h-full max-w-full rounded-[24px] overflow-hidden shadow-[0_24px_60px_-24px_rgba(15,14,23,0.35)] transition-colors duration-200"
      >
        {photo && (
          <>
            <img
              src={photo}
              alt="Fondo del estado"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={onRemovePhoto}
              aria-label="Quitar imagen"
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-neutral-950/40 text-white flex items-center justify-center hover:bg-neutral-950/60 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        <div
          onPointerDown={() => {
            draggingRef.current = true;
          }}
          style={{ top: `${position.y}%`, left: `${position.x}%`, textAlign: align }}
          className="absolute w-[84%] -translate-x-1/2 -translate-y-1/2 cursor-move select-none rounded-2xl p-3 ring-1 ring-transparent hover:ring-white/40 transition-shadow duration-200"
        >
          <p
            style={{
              fontSize: `${textSize}px`,
              fontWeight: bold ? 700 : 400,
              color: textColor,
              lineHeight: 1.3,
              opacity: text ? 1 : 0.45,
            }}
            className="whitespace-pre-wrap break-words drop-shadow-sm"
          >
            {text || 'Escribe tu estado...'}
          </p>
        </div>
      </div>
    </div>
  );
}
