'use client';

import { FileText, Clock, Bell, Star, Lock } from 'lucide-react';

export type NotesFilter = 'all' | 'recent' | 'reminder' | 'favorite' | 'protected';

interface NotesOptionsBarProps {
  filter: NotesFilter;
  onSelectFilter: (filter: NotesFilter) => void;
}

const NAV_ITEMS: { id: NotesFilter; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Todas las notas', icon: FileText },
  { id: 'recent', label: 'Recientes', icon: Clock },
  { id: 'reminder', label: 'Con recordatorio', icon: Bell },
  { id: 'favorite', label: 'Favoritas', icon: Star },
  { id: 'protected', label: 'Protegidas', icon: Lock },
];

export default function NotesOptionsBar({ filter, onSelectFilter }: NotesOptionsBarProps) {
  return (
    <div className="w-[56px] shrink-0 border-r border-neutral-200 bg-white flex flex-col items-center py-4 gap-3 select-none">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = filter === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectFilter(item.id)}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              isActive
                ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Icon className="w-5 h-5" />
            {isActive && (
              <span className="absolute left-0 top-2 bottom-2 w-1 bg-brand-primary rounded-r-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
