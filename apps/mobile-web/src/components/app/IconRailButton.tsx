'use client';

import type { ElementType, ReactNode } from 'react';

interface IconRailButtonProps {
  label: string;
  icon: ElementType;
  isActive?: boolean;
  onClick: () => void;
  /** Contenido opcional a la izquierda del ícono, p. ej. el asa de arrastre */
  adornment?: ReactNode;
  /** Tamaño del ícono en px. Igual en las dos barras verticales de la app */
  iconSize?: number;
  /** Lado del contenedor cuadrado en px */
  boxSize?: number;
  /** Lado por el que asoma el tooltip, según el borde en el que viva la barra */
  tooltipSide?: 'left' | 'right';
}

/**
 * Botón de una barra vertical de íconos: contenedor cuadrado con el ícono
 * centrado y tooltip con el nombre al pasar el cursor.
 */
export default function IconRailButton({
  label,
  icon: Icon,
  isActive = false,
  onClick,
  adornment,
  iconSize = 22,
  boxSize = 48,
  tooltipSide = 'left',
}: IconRailButtonProps) {
  return (
    <div className="relative group shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        style={{ width: boxSize, height: boxSize }}
        className={`rounded-xl flex flex-row items-center justify-center gap-0.5 transition-colors ${
          isActive ? 'bg-brand-primary/10 text-brand-primary' : 'text-neutral-600 hover:bg-neutral-100'
        }`}
      >
        {adornment}
        <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={1.6} />
      </button>

      <span
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 text-[11px] font-normal text-white opacity-0 transition-opacity group-hover:opacity-100 z-50 ${
          tooltipSide === 'left' ? 'right-full mr-2' : 'left-full ml-2'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
