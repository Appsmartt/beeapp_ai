'use client';

import { Plus, X } from 'lucide-react';
import { getCategoryIcon } from '../chat/categoryIcons';

interface StorageChipCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

interface StorageCategoryChipsProps {
  categories: StorageChipCategory[];
  activeCategoryId: string | null;
  onChange: (categoryId: string | null) => void;
  onCreate: () => void;
  onDelete: (category: StorageChipCategory) => void;
}

/** Horizontal category chips bar for web Storage module */
export default function StorageCategoryChips({
  categories,
  activeCategoryId,
  onChange,
  onCreate,
  onDelete,
}: StorageCategoryChipsProps) {
  return (
    <div className="min-w-0 bg-white">
      <div className="flex items-center gap-2">
        {/* Chip "Todos" */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-normal transition-colors shrink-0 ${
            !activeCategoryId
              ? 'bg-brand-primary text-white font-semibold'
              : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
          }`}
        >
          <span>Todos</span>
        </button>

        {/* Chips de categorías creadas */}
        {categories.map((category) => {
          const isActive = activeCategoryId === category.id;
          const Icon = getCategoryIcon(category.icon);
          return (
            <div
              key={category.id}
              className={`flex shrink-0 items-center rounded-2xl text-xs ${
                isActive
                  ? 'bg-brand-primary font-semibold text-white'
                  : 'font-normal text-neutral-700'
              }`}
              style={{ backgroundColor: isActive ? '#6025d2' : category.color }}
            >
              <button
                type="button"
                onClick={() => onChange(category.id)}
                className="flex max-w-[9rem] items-center gap-1.5 py-1.5 pl-3 pr-1.5"
                title={category.name}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-neutral-700'}`} />
                <span className="truncate">{category.name}</span>
              </button>
              {!category.isDefault ? (
                <button
                  type="button"
                  onClick={() => onDelete(category)}
                  aria-label={`Eliminar ${category.name}`}
                  title="Eliminar etiqueta"
                  className={`mr-1.5 flex h-5 w-5 items-center justify-center rounded-full ${
                    isActive
                      ? 'text-white hover:bg-white/20'
                      : 'text-neutral-600 hover:bg-black/10'
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          );
        })}

        {/* Botón + para crear nueva categoría */}
        <button
          type="button"
          onClick={onCreate}
          aria-label="Crear categoría"
          title="Crear categoría"
          className="w-7 h-7 rounded-2xl border border-dashed border-brand-primary text-brand-primary flex items-center justify-center shrink-0 hover:bg-brand-primary/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
