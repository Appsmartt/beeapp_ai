'use client';

import {
  Clock,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';

export type StorageFilter =
  | 'all'
  | 'recent'
  | 'docs'
  | 'media'
  | 'protected';

interface StorageOptionsBarProps {
  filter: StorageFilter;
  onSelectFilter: (filter: StorageFilter) => void;
}

const NAV_ITEMS: {
  id: StorageFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'all',
    label: 'Todos los archivos',
    icon: FolderOpen,
  },
  {
    id: 'recent',
    label: 'Recientes',
    icon: Clock,
  },
  {
    id: 'docs',
    label: 'Documentos',
    icon: FileText,
  },
  {
    id: 'media',
    label: 'Fotos y Videos',
    icon: ImageIcon,
  },
  {
    id: 'protected',
    label: 'Protegidos con PIN',
    icon: Lock,
  },
];

export default function StorageOptionsBar({
  filter,
  onSelectFilter,
}: StorageOptionsBarProps) {
  return (
    <div className="flex w-[56px] shrink-0 select-none flex-col items-center gap-3 border-r border-neutral-200 bg-white py-4">
      <div className="flex w-full flex-col items-center gap-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = filter === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectFilter(item.id)}
              title={item.label}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? 'bg-brand-primary/10 font-semibold text-brand-primary'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className="h-5 w-5" />

              {isActive && (
                <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-brand-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}