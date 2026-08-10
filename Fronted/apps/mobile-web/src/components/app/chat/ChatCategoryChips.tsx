'use client';

import { Plus } from 'lucide-react';
import { ChatCategory } from '@/mocks/chats';
import { getCategoryIcon } from './categoryIcons';

interface ChatCategoryChipsProps {
  categories: ChatCategory[];
  activeCategoryId: string | null;
  onChange: (categoryId: string | null) => void;
  onCreate: () => void;
}

export default function ChatCategoryChips({
  categories,
  activeCategoryId,
  onChange,
  onCreate,
}: ChatCategoryChipsProps) {
  return (
    <div className="py-2.5 bg-white border-b border-neutral-100 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 px-5">
        {/* "Todos" chip */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-normal transition-colors shrink-0 ${
            !activeCategoryId
              ? 'bg-brand-primary text-white font-semibold'
              : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
          }`}
        >
          <span>Todos</span>
        </button>

        {/* User categories chips */}
        {categories.map((category) => {
          const isActive = activeCategoryId === category.id;
          const Icon = getCategoryIcon(category.icon);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-normal transition-colors shrink-0 ${
                isActive
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'text-neutral-700 hover:opacity-90'
              }`}
              style={{ backgroundColor: isActive ? '#6025d2' : category.color }}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-700'}`} />
              <span>{category.name}</span>
            </button>
          );
        })}

        {/* Plus (+) add category button */}
        <button
          type="button"
          onClick={onCreate}
          aria-label="Crear categoría"
          className="w-8 h-8 rounded-2xl border border-dashed border-brand-primary text-brand-primary flex items-center justify-center shrink-0 hover:bg-brand-primary/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
