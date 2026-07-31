'use client';

import type { ElementType, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface OverviewCardProps {
  title: string;
  icon: ElementType;
  onSeeMore?: () => void;
  children: ReactNode;
}

/**
 * Sección de la vista Todas. **No es una tarjeta**: no lleva borde, ni fondo
 * propio, ni esquinas redondeadas. Solo aporta la cabecera (ícono del módulo,
 * título y "Ver más") separada del contenido por una línea fina, de modo que
 * las secciones se distingan por el espaciado de la retícula y no por cajas.
 */
export default function OverviewCard({ title, icon: Icon, onSeeMore, children }: OverviewCardProps) {
  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-brand-primary shrink-0" />
          <h2 className="font-semibold text-sm text-neutral-900 truncate">{title}</h2>
        </div>

        {onSeeMore && (
          <button
            type="button"
            onClick={onSeeMore}
            className="flex items-center gap-0.5 text-xs text-brand-primary font-normal hover:underline shrink-0"
          >
            <span>Ver más</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1">{children}</div>
    </section>
  );
}
