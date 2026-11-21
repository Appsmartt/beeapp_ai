'use client';

import { Plus, X } from 'lucide-react';
import { ChatCategory } from '@/lib/client/chats';
import { getCategoryIcon } from './categoryIcons';

interface ChatCategoryChipsProps {
  categories: ChatCategory[];
  activeCategoryId: string | null;
  onChange: (categoryId: string | null) => void;
  onCreate: () => void;
  onDelete?: (categoryId: string) => void;
}

export default function ChatCategoryChips({
  categories,
  activeCategoryId,
  onChange,
  onCreate,
  onDelete,
}: ChatCategoryChipsProps) {
  return (
    <div className="overflow-x-auto border-b border-[#E6DCF4] py-2 no-scrollbar">
      <div className="flex items-center gap-1.5 px-4">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-normal transition-colors ${
            !activeCategoryId
              ? 'bg-brand-primary font-semibold text-white'
              : 'border border-[#E7DFF3] bg-white text-neutral-800 hover:bg-[#FCFAFF]'
          }`}
        >
          <span>Todos</span>
        </button>

        {categories.map((category) => {
          const isActive = activeCategoryId === category.id;
          const Icon = getCategoryIcon(category.icon);
          return (
            <div
              key={category.id}
              className={`group flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-normal transition-colors ${
                isActive ? 'bg-brand-primary font-semibold text-white' : 'text-neutral-700 hover:opacity-90'
              }`}
              style={{ backgroundColor: isActive ? '#6025d2' : category.color }}
            >
              <button
                type="button"
                onClick={() => onChange(category.id)}
                className="flex items-center gap-1.5"
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-neutral-700'}`} />
                <span>{category.name}</span>
              </button>
              {onDelete ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(category.id);
                  }}
                  title={`Eliminar categoría ${category.name}`}
                  aria-label={`Eliminar categoría ${category.name}`}
                  className={`rounded-full p-0.5 opacity-70 transition hover:opacity-100 ${
                    isActive ? 'text-white hover:bg-white/20' : 'text-neutral-600 hover:bg-black/10'
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onCreate}
          aria-label="Crear categoría"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-dashed border-brand-primary text-brand-primary transition-colors hover:bg-brand-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
