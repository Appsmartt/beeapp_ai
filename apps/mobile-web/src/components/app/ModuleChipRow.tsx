'use client';

import {
  LayoutGrid,
  Mail,
  FileText,
  Users,
  FolderOpen,
  Calendar,
  MessageCircle,
  Settings,
} from 'lucide-react';

export type ModuleKey = 'overview' | 'mail' | 'notes' | 'contacts' | 'storage' | 'calendar' | 'chat';

interface ModuleChipRowProps {
  activeModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
  onOpenCustomize: () => void;
}

const CHIPS: { key: ModuleKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Todas', icon: LayoutGrid },
  { key: 'mail', label: 'Correos', icon: Mail },
  { key: 'notes', label: 'Notas', icon: FileText },
  { key: 'contacts', label: 'Contactos', icon: Users },
  { key: 'storage', label: 'Almacenamiento', icon: FolderOpen },
  { key: 'calendar', label: 'Agenda', icon: Calendar },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
];

export default function ModuleChipRow({ activeModule, onSelectModule, onOpenCustomize }: ModuleChipRowProps) {
  return (
    <div className="bg-white border-b border-neutral-200/80 px-4 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 md:gap-3 lg:gap-4">
      {CHIPS.map((chip) => {
        const IconComponent = chip.icon;
        const isSelected = activeModule === chip.key;

        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onSelectModule(chip.key)}
            className={`h-11 px-3.5 rounded-full flex items-center gap-2 shrink-0 transition-all text-xs font-semibold ${
              isSelected
                ? 'bg-brand-primary/10 border-2 border-brand-primary text-brand-primary shadow-xs'
                : 'bg-neutral-100 border border-neutral-200/60 text-neutral-600 hover:bg-neutral-200/70'
            }`}
          >
            <IconComponent className="w-5 h-5 shrink-0" />
            {isSelected && <span>{chip.label}</span>}
          </button>
        );
      })}

      {/* Settings / Customize button */}
      <button
        type="button"
        onClick={onOpenCustomize}
        className="w-11 h-11 rounded-full bg-neutral-100 border border-neutral-200/60 text-neutral-500 flex items-center justify-center shrink-0 hover:bg-neutral-200/70 transition-colors"
        title="Personalizar chips"
      >
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );
}
