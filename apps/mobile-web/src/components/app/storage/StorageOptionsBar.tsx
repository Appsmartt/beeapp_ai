'use client';

import { FolderOpen, Clock, FileText, Image as ImageIcon, CheckCircle, Lock } from 'lucide-react';
import ModuleNotificationBell from '../ModuleNotificationBell';

export type StorageFilter = 'all' | 'recent' | 'docs' | 'media' | 'signed' | 'protected';

interface StorageOptionsBarProps {
  filter: StorageFilter;
  onSelectFilter: (filter: StorageFilter) => void;
}

const NAV_ITEMS: { id: StorageFilter; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Todos los archivos', icon: FolderOpen },
  { id: 'recent', label: 'Recientes', icon: Clock },
  { id: 'docs', label: 'Documentos', icon: FileText },
  { id: 'media', label: 'Fotos y Videos', icon: ImageIcon },
  { id: 'signed', label: 'Firmados', icon: CheckCircle },
  { id: 'protected', label: 'Protegidos con PIN', icon: Lock },
];

export default function StorageOptionsBar({ filter, onSelectFilter }: StorageOptionsBarProps) {
  return (
    <div className="w-[56px] shrink-0 border-r border-neutral-200 bg-white flex flex-col items-center py-4 gap-3 select-none justify-between">
      <div className="flex flex-col items-center gap-3 w-full">
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

      <div className="mt-auto pt-2">
        <ModuleNotificationBell moduleId="storage" />
      </div>
    </div>
  );
}
