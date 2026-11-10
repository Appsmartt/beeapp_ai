'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, Folder, LayoutGrid, Mail, NotebookPen } from 'lucide-react';
import type { ModuleKey } from './modules';

export type QuickModuleKey = Extract<ModuleKey, 'mail' | 'calendar' | 'notes' | 'storage'>;

type QuickModule = {
  key: QuickModuleKey;
  label: string;
  subtitle: string;
  icon: typeof Mail;
  accent: string;
  soft: string;
  strong: string;
};

export const QUICK_MODULES: QuickModule[] = [
  {
    key: 'mail',
    label: 'Correos',
    subtitle: 'Bandeja y cuentas',
    icon: Mail,
    accent: '#668FCE',
    soft: '#EAF2FF',
    strong: '#D1E0F7',
  },
  {
    key: 'calendar',
    label: 'Agenda',
    subtitle: 'Eventos y reuniones',
    icon: CalendarDays,
    accent: '#8C70C8',
    soft: '#F0EBFF',
    strong: '#DED4F7',
  },
  {
    key: 'notes',
    label: 'Notas',
    subtitle: 'Ideas y pendientes',
    icon: NotebookPen,
    accent: '#D88772',
    soft: '#FFF0EB',
    strong: '#F5D9D0',
  },
  {
    key: 'storage',
    label: 'Archivos',
    subtitle: 'Documentos y carpetas',
    icon: Folder,
    accent: '#62A98E',
    soft: '#E7F6EF',
    strong: '#CFE9DD',
  },
];

export default function ModuleQuickMenu({
  activeModule,
  onSelect,
}: {
  activeModule?: ModuleKey;
  onSelect: (key: QuickModuleKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const quickActive = QUICK_MODULES.some((item) => item.key === activeModule);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[0_6px_16px_rgba(116,39,213,0.28)] ${
          open || quickActive ? 'bg-[#5E1ABF]' : 'bg-[#7427D5] hover:bg-[#5E1ABF]'
        }`}
        aria-label="Abrir accesos rápidos"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Accesos rápidos"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Accesos rápidos"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(340px,calc(100vw-2rem))] rounded-[24px] border border-[#E7DDF2] bg-white p-4 shadow-[0_18px_40px_rgba(48,32,72,0.16)]"
        >
          <p className="text-sm font-extrabold text-[#261743]">Accesos rápidos</p>
          <p className="mt-0.5 text-xs text-[#786593]">Correos, agenda, notas y archivos</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {QUICK_MODULES.map((item) => {
              const Icon = item.icon;
              const selected = activeModule === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelect(item.key);
                  }}
                  className="flex flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5"
                  style={{
                    backgroundColor: selected ? item.soft : '#FFFFFF',
                    borderColor: item.strong,
                  }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl border"
                    style={{ backgroundColor: item.soft, borderColor: item.strong, color: item.accent }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-[#303B5A]">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] text-[#6C7892]">{item.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function QuickModuleCards({
  onSelect,
  activeModule,
}: {
  onSelect: (key: QuickModuleKey) => void;
  activeModule?: ModuleKey;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {QUICK_MODULES.map((item) => {
        const Icon = item.icon;
        const selected = activeModule === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className="flex items-center gap-3 rounded-[20px] border bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(116,39,213,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(116,39,213,0.1)]"
            style={{ borderColor: selected ? item.accent : item.strong, backgroundColor: selected ? item.soft : '#FFFFFF' }}
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
              style={{ backgroundColor: item.soft, borderColor: item.strong, color: item.accent }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-[#303B5A]">{item.label}</span>
              <span className="mt-0.5 block text-xs text-[#6C7892]">{item.subtitle}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: item.accent }} />
          </button>
        );
      })}
    </div>
  );
}
