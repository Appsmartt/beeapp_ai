'use client';

import { X } from 'lucide-react';
import type { NoteCategory } from '@/mocks/noteCategories';
import { getNoteCategoryIcon } from './noteCategoryIcons';

interface NoteCategoryGridProps {
  categories: NoteCategory[];
  countOf: (category: NoteCategory) => number;
  onOpen: (category: NoteCategory) => void;
  onRemove: (id: string) => void;
}

/**
 * Cuadrícula de categorías de notas. Tarjetas de 80px de alto con el ícono
 * a la izquierda y el nombre completo al lado: nunca se trunca, baja a 13px
 * y parte en dos líneas si hace falta.
 *
 * Siempre 2 columnas: el panel mide 420px fijos, así que con 3 columnas cada
 * tarjeta quedaría en ~128px y el nombre no cabría junto al ícono.
 */
export default function NoteCategoryGrid({
  categories,
  countOf,
  onOpen,
  onRemove,
}: NoteCategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {categories.map((category) => {
        const Icon = getNoteCategoryIcon(category.iconKey);
        const count = countOf(category);

        return (
          <div
            key={category.id}
            onClick={() => onOpen(category)}
            className="group relative h-20 flex items-center gap-2.5 p-3 rounded-xl border border-neutral-200 bg-white cursor-pointer hover:border-brand-primary hover:bg-neutral-50 transition-colors"
          >
            <span
              style={{ backgroundColor: `${category.color}1A` }}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            >
              <Icon className="w-6 h-6" style={{ color: category.color }} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-normal text-neutral-900 leading-tight break-words">
                {category.name}
              </span>
              <span className="block text-[11px] font-normal text-neutral-500 mt-1">
                {count} {count === 1 ? 'nota' : 'notas'}
              </span>
            </span>

            {!category.isFixed && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(category.id);
                }}
                aria-label={`Eliminar ${category.name}`}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
