'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface StatusToolSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Sección colapsable del panel de herramientas del editor de estados:
 * título pequeño en gris y contenido debajo, separada por una línea fina.
 */
export default function StatusToolSection({
  title,
  children,
  defaultOpen = true,
}: StatusToolSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-neutral-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 group"
      >
        <span className="text-[11px] font-normal uppercase tracking-[0.08em] text-neutral-500 group-hover:text-neutral-700 transition-colors duration-200">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
            open ? '' : '-rotate-90'
          }`}
        />
      </button>

      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}
