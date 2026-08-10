'use client';

import { useState } from 'react';
import { Menu, GripVertical } from 'lucide-react';
import { MODULES, ModuleKey, getModule } from './modules';
import IconRailButton from './IconRailButton';
import { BeeAppLogoMark } from '@/components/BeeAppLogo';

interface ModuleSidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
  onOpenSideMenu: () => void;
  moduleOrder: ModuleKey[];
  onReorderModules: (next: ModuleKey[]) => void;
}

function RailDivider() {
  return <div className="w-8 h-px bg-neutral-200 my-2 shrink-0" />;
}

const OVERVIEW = MODULES[0];

export default function ModuleSidebar({
  activeModule,
  onSelectModule,
  onOpenSideMenu,
  moduleOrder,
  onReorderModules,
}: ModuleSidebarProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const endDrag = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  const drop = (to: number) => {
    if (dragFrom === null || dragFrom === to) return endDrag();
    const next = [...moduleOrder];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(to, 0, moved);
    onReorderModules(next);
    endDrag();
  };

  return (
    <aside className="flex w-14 shrink-0 sticky top-0 h-screen bg-white border-l border-neutral-200 flex-col items-center py-3 gap-1 overflow-y-auto no-scrollbar">
      {/* Marca */}
      <div className="h-12 flex items-center justify-center shrink-0">
        <BeeAppLogoMark size={28} />
      </div>

      {/* Menú del usuario */}
      <IconRailButton label="Menú principal" icon={Menu} onClick={onOpenSideMenu} />

      <RailDivider />

      {/* "Todas" queda fija en primer lugar */}
      <IconRailButton
        label={OVERVIEW.label}
        icon={OVERVIEW.icon}
        isActive={activeModule === OVERVIEW.key}
        onClick={() => onSelectModule(OVERVIEW.key)}
      />

      {/* Módulos reordenables */}
      {moduleOrder.map((key, index) => {
        const item = getModule(key);
        if (!item) return null;

        return (
          <div
            key={key}
            draggable
            onDragStart={() => setDragFrom(index)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(index);
            }}
            onDrop={() => drop(index)}
            onDragEnd={endDrag}
            title="Arrastra para reordenar"
            className={`shrink-0 rounded-xl transition-opacity [&_button]:cursor-[inherit] ${
              dragFrom === index ? 'opacity-40 cursor-grabbing' : 'cursor-grab active:cursor-grabbing'
            } ${dragOver === index && dragFrom !== index ? 'ring-2 ring-brand-primary/50' : ''}`}
          >
            <IconRailButton
              label={item.label}
              icon={item.icon}
              isActive={activeModule === key}
              onClick={() => onSelectModule(key)}
              adornment={
                <GripVertical className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden />
              }
            />
          </div>
        );
      })}
    </aside>
  );
}
