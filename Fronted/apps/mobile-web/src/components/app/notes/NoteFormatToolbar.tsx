'use client';

import { Bold, Italic, List, ListOrdered, Heading, Link, ImagePlus } from 'lucide-react';

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'bullet'
  | 'numbered'
  | 'heading'
  | 'link'
  | 'image';

interface NoteFormatToolbarProps {
  onAction: (action: FormatAction) => void;
  words: number;
}

const ACTIONS: { key: FormatAction; label: string; icon: typeof Bold }[] = [
  { key: 'bold', label: 'Negrita', icon: Bold },
  { key: 'italic', label: 'Itálica', icon: Italic },
  { key: 'bullet', label: 'Viñetas', icon: List },
  { key: 'numbered', label: 'Lista numerada', icon: ListOrdered },
  { key: 'heading', label: 'Título', icon: Heading },
  { key: 'link', label: 'Enlace', icon: Link },
  { key: 'image', label: 'Imagen', icon: ImagePlus },
];

/** Barra de formato bajo el editor de notas */
export default function NoteFormatToolbar({ onAction, words }: NoteFormatToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-2.5 border-t border-neutral-200 bg-white">
      <div className="flex items-center gap-1.5 flex-wrap">
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            title={action.label}
            aria-label={action.label}
            // El foco debe quedarse en el editor para que execCommand actúe
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onAction(action.key)}
            className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center hover:bg-neutral-200 transition-colors"
          >
            <action.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <span className="text-[11px] font-normal text-neutral-500 shrink-0">
        {words} {words === 1 ? 'palabra' : 'palabras'}
      </span>
    </div>
  );
}
