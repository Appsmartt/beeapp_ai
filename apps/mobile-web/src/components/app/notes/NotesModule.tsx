'use client';

import { useState } from 'react';
import { List, Grid2x2, Plus, FileText, ArrowUpDown } from 'lucide-react';
import { MOCK_NOTES, NoteItem } from '@/mocks/notes';
import NoteEdit from './NoteEdit';
import NoteRow from './NoteRow';
import NotesOptionsBar, { NotesFilter } from './NotesOptionsBar';
import PinLockModal from '../chat/modals/PinLockModal';

export default function NotesModule() {
  const [notes, setNotes] = useState<NoteItem[]>(MOCK_NOTES);
  const [filter, setFilter] = useState<NotesFilter>('all');
  const [sortOption, setSortOption] = useState<'updated' | 'created' | 'alpha'>('updated');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [lockedNote, setLockedNote] = useState<NoteItem | null>(null);

  const handleCreateNote = () => {
    const newNote: NoteItem = {
      id: `nt-${Date.now()}`,
      title: 'Nueva nota',
      preview: 'Escribe el contenido...',
      content: '',
      timestamp: 'Ahora',
      isProtected: false,
      isFavorite: false,
      folder: 'notes',
      createdAt: new Date().toISOString(),
      colorTag: '#A78BFA',
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNote(newNote);
  };

  const handleSaveNote = (updated: NoteItem) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSelectedNote(updated);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const handleToggleFavorite = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n))
    );
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleToggleProtection = (note: NoteItem) => {
    const next = !note.isProtected;
    const updated = { ...note, isProtected: next };
    handleSaveNote(updated);
  };

  const handleToggleReminder = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const nextRem = n.reminderDate ? undefined : '28 Jul • 10:00 AM';
        return { ...n, reminderDate: nextRem };
      })
    );
  };

  const handleSelectNote = (note: NoteItem) => {
    if (note.isProtected) {
      setLockedNote(note);
    } else {
      setSelectedNote(note);
    }
  };

  const handleCycleSort = () => {
    if (sortOption === 'updated') setSortOption('created');
    else if (sortOption === 'created') setSortOption('alpha');
    else setSortOption('updated');
  };

  const getSortLabel = () => {
    if (sortOption === 'alpha') return 'A-Z';
    if (sortOption === 'created') return 'Creado';
    return 'Modificado';
  };

  // Filter application
  const filteredNotes = notes.filter((n) => {
    if (filter === 'favorite') return n.isFavorite;
    if (filter === 'reminder') return !!n.reminderDate;
    if (filter === 'protected') return n.isProtected;
    if (filter === 'recent') {
      return n.timestamp.includes('Hoy') || n.timestamp.includes('Ahora') || n.timestamp.includes('Ayer');
    }
    return true;
  });

  // Sort application
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortOption === 'alpha') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="bg-white min-h-full flex flex-row relative select-none">
      {/* 1. BARRA DE OPCIONES DE NOTAS (56px) */}
      <NotesOptionsBar filter={filter} onSelectFilter={setFilter} />

      {/* 2. PANEL IZQUIERDO: Lista de notas (40% de ancho, min 380px, max 450px) */}
      <div className="w-[380px] lg:w-[420px] shrink-0 border-r border-neutral-200 flex flex-col bg-white">
        {/* Cabecera del panel de lista */}
        <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between gap-2">
          <h1 className="font-semibold text-base text-neutral-900 truncate">Mis Notas</h1>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Selector de orden */}
            <button
              type="button"
              onClick={handleCycleSort}
              className="h-8 px-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 text-xs font-medium text-brand-primary flex items-center gap-1 transition-colors"
              title="Cambiar orden"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{getSortLabel()}</span>
            </button>

            {/* Toggle de vista lista / cuadrícula */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                }`}
                title="Vista en lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                }`}
                title="Vista en cuadrícula"
              >
                <Grid2x2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Botón Nueva Nota */}
            <button
              type="button"
              onClick={handleCreateNote}
              className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-brand-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva</span>
            </button>
          </div>
        </div>

        {/* Contenido: Lista o Cuadrícula */}
        <div className="flex-1 overflow-y-auto">
          {sortedNotes.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">No hay notas en esta carpeta</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-neutral-100">
              {sortedNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  isSelected={selectedNote?.id === note.id}
                  viewMode="list"
                  onClick={() => handleSelectNote(note)}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleProtection={handleToggleProtection}
                  onToggleReminder={handleToggleReminder}
                  onDelete={handleDeleteNote}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-3.5">
              {sortedNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  isSelected={selectedNote?.id === note.id}
                  viewMode="grid"
                  onClick={() => handleSelectNote(note)}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleProtection={handleToggleProtection}
                  onToggleReminder={handleToggleReminder}
                  onDelete={handleDeleteNote}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. PANEL DERECHO: Editor de notas (flex-1) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selectedNote ? (
          <NoteEdit
            key={selectedNote.id}
            note={selectedNote}
            onBack={() => setSelectedNote(null)}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <FileText className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ninguna nota seleccionada</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona una nota de la lista para ver su contenido o crea una nueva.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PinLockModal para abrir notas protegidas */}
      <PinLockModal
        visible={!!lockedNote}
        itemName={lockedNote?.title}
        onClose={() => setLockedNote(null)}
        onSuccess={() => {
          if (lockedNote) {
            const noteToOpen = lockedNote;
            setLockedNote(null);
            setSelectedNote(noteToOpen);
          }
        }}
      />
    </div>
  );
}
