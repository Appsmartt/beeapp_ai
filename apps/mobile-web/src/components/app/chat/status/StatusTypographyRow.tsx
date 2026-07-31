'use client';

import { Bold, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { StatusTextAlign } from '@/mocks/statuses';

interface StatusTypographyRowProps {
  textSize: number;
  onChangeSize: (size: number) => void;
  bold: boolean;
  onToggleBold: () => void;
  align: StatusTextAlign;
  onChangeAlign: (align: StatusTextAlign) => void;
}

const ALIGNMENTS: { key: StatusTextAlign; label: string; icon: typeof AlignLeft }[] = [
  { key: 'left', label: 'Alinear a la izquierda', icon: AlignLeft },
  { key: 'center', label: 'Centrar', icon: AlignCenter },
  { key: 'right', label: 'Alinear a la derecha', icon: AlignRight },
];

const TOGGLE =
  'w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 shrink-0';

/** Tamaño (slider 16-40px), negrita y alineación del texto del estado */
export default function StatusTypographyRow({
  textSize,
  onChangeSize,
  bold,
  onToggleBold,
  align,
  onChangeAlign,
}: StatusTypographyRowProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-normal text-neutral-500">Tamaño</span>
          <span className="text-xs font-normal text-neutral-900 tabular-nums">{textSize}px</span>
        </div>
        <input
          type="range"
          min={16}
          max={40}
          step={1}
          value={textSize}
          onChange={(event) => onChangeSize(Number(event.target.value))}
          aria-label="Tamaño del texto"
          className="w-full accent-brand-primary cursor-pointer"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleBold}
          aria-label="Negrita"
          aria-pressed={bold}
          className={`${TOGGLE} ${
            bold
              ? 'bg-brand-primary/10 text-brand-primary'
              : 'text-neutral-500 hover:bg-neutral-100'
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>

        <span className="w-px h-6 bg-neutral-200 mx-1 shrink-0" />

        {ALIGNMENTS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChangeAlign(option.key)}
            aria-label={option.label}
            aria-pressed={align === option.key}
            className={`${TOGGLE} ${
              align === option.key
                ? 'bg-brand-primary/10 text-brand-primary'
                : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <option.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
