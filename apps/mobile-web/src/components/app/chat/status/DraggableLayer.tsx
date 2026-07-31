'use client';

import { useRef, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';

interface DraggableLayerProps {
  /** Posición en porcentaje del lienzo */
  x: number;
  y: number;
  /** Lienzo del preview: da el sistema de coordenadas del arrastre */
  stageRef: RefObject<HTMLDivElement>;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const clampPercent = (value: number) => Math.min(95, Math.max(5, value));

/**
 * Capa suelta del editor de estados: se arrastra con el mouse por el lienzo,
 * se selecciona al hacer clic y muestra borde punteado y botón de eliminar.
 */
export default function DraggableLayer({
  x,
  y,
  stageRef,
  selected,
  onSelect,
  onMove,
  onRemove,
  children,
  style,
  className = '',
}: DraggableLayerProps) {
  const draggingRef = useRef(false);

  // La captura de puntero mantiene los eventos en esta capa aunque el cursor
  // se salga de ella, así que no hacen falta listeners en `window`.
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    onSelect();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    onMove(
      clampPercent(((event.clientX - rect.left) / rect.width) * 100),
      clampPercent(((event.clientY - rect.top) / rect.height) * 100)
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ top: `${y}%`, left: `${x}%`, ...style }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move touch-none rounded-2xl p-2 border transition-colors duration-200 ${
        selected ? 'border-dashed border-brand-primary' : 'border-transparent'
      } ${className}`}
    >
      {children}

      {selected && (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onRemove}
          aria-label="Eliminar capa"
          className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-neutral-800 text-white flex items-center justify-center hover:bg-neutral-900 transition-colors duration-200"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
