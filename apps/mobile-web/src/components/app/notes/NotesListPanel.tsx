'use client';

import { FileText } from 'lucide-react';
import type { NoteItem } from '@/mocks/notes';
import NoteRow from './NoteRow';

interface NotesListPanelProps {
  notes: NoteItem[];
  selectedId?: string;
  viewMode: 'list' | 'grid';
  onSelect: (note: NoteItem) => void;
  onToggleFavorite: (id: string) => void;
  onToggleProtection: (note: NoteItem) => void;
  onToggleReminder: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Notas de la categoría abierta, en filas o en cuadrícula */
export default function NotesListPanel({
  notes,
  selectedId,
  viewMode,
  onSelect,
  onToggleFavorite,
  onToggleProtection,
  onToggleReminder,
  onDelete,
}: NotesListPanelProps) {
  if (notes.length === 0) {
    return (
      <div className="p-12 text-center space-y-2">
        <FileText className="w-10 h-10 mx-auto text-neutral-300" />
        <p className="text-xs font-normal text-neutral-500">No hay notas en esta categoría</p>
      </div>
    );
  }

  const rows = notes.map((note) => (
    <NoteRow
      key={note.id}
      note={note}
      isSelected={selectedId === note.id}
      viewMode={viewMode}
      onClick={() => onSelect(note)}
      onToggleFavorite={onToggleFavorite}
      onToggleProtection={onToggleProtection}
      onToggleReminder={onToggleReminder}
      onDelete={onDelete}
    />
  ));

  return viewMode === 'list' ? (
    <div className="divide-y divide-neutral-100">{rows}</div>
  ) : (
    <div className="grid grid-cols-2 gap-3 p-3.5">{rows}</div>
  );
}
