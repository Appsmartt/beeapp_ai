'use client';

import { useState } from 'react';
import { List, Grid2x2, Plus, FileText, FolderPlus, ArrowLeft } from 'lucide-react';
import { MOCK_NOTES, type NoteItem } from '@/mocks/notes';
import {
  FIXED_NOTE_CATEGORIES,
  MOCK_NOTE_CATEGORIES,
  type NoteCategory,
} from '@/mocks/noteCategories';
import NoteEdit from './NoteEdit';
import NotesOptionsBar from './NotesOptionsBar';
import NoteCategoryGrid from './NoteCategoryGrid';
import NotesListPanel from './NotesListPanel';
import CreateNoteCategoryModal from './CreateNoteCategoryModal';
import PinLockModal from '../chat/modals/PinLockModal';

export default function NotesModule() {
  const [notes, setNotes] = useState<NoteItem[]>(MOCK_NOTES);
  const [categories, setCategories] = useState<NoteCategory[]>([
    ...FIXED_NOTE_CATEGORIES,
    ...MOCK_NOTE_CATEGORIES,
  ]);
  /** null = cuadrícula de categorías; con valor = lista de esa categoría */
  const [category, setCategory] = useState<NoteCategory | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [lockedNote, setLockedNote] = useState<NoteItem | null>(null);

  const notesOf = (target: NoteCategory) =>
    notes.filter((note) => {
      if (target.id === 'all') return true;
      if (target.id === 'protected') return note.isProtected;
      return note.categoryId === target.id;
    });

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
      categoryId: category && !category.isFixed ? category.id : 'documento',
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNote(newNote);
  };

  const handleSaveNote = (updated: NoteItem) => {
    setNotes((prev) => prev.map((note) => (note.id === updated.id ? updated : note)));
    setSelectedNote(updated);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  const handleToggleFavorite = (id: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, isFavorite: !note.isFavorite } : note))
    );
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleToggleReminder = (id: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, reminderDate: note.reminderDate ? undefined : '28 Jul • 10:00 AM' }
          : note
      )
    );
  };

  const handleSelectNote = (note: NoteItem) => {
    if (note.isProtected) setLockedNote(note);
    else setSelectedNote(note);
  };

  return (
    // Sin `select-none`: bloquea la selección de texto dentro del
    // contentEditable del editor y con ella los comandos de formato.
    <div className="bg-white min-h-full flex flex-row relative">
      <NotesOptionsBar />

      {/* PANEL IZQUIERDO: categorías o la lista de la categoría abierta */}
      <div className="w-[380px] lg:w-[420px] shrink-0 border-r border-neutral-200 flex flex-col bg-white">
        <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {category && (
              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-label="Volver a categorías"
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-base font-semibold text-neutral-900 truncate">
              {category ? category.name : 'Mis Notas'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {category ? (
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Vista en lista"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white text-brand-primary' : 'text-neutral-500'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista en cuadrícula"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-brand-primary' : 'text-neutral-500'
                  }`}
                >
                  <Grid2x2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingCategory(true)}
                title="Nueva categoría"
                aria-label="Nueva categoría"
                className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateNote}
              className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 hover:bg-brand-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {category ? (
            <NotesListPanel
              notes={notesOf(category)}
              selectedId={selectedNote?.id}
              viewMode={viewMode}
              onSelect={handleSelectNote}
              onToggleFavorite={handleToggleFavorite}
              onToggleProtection={(note) =>
                handleSaveNote({ ...note, isProtected: !note.isProtected })
              }
              onToggleReminder={handleToggleReminder}
              onDelete={handleDeleteNote}
            />
          ) : (
            <NoteCategoryGrid
              categories={categories}
              countOf={(item) => notesOf(item).length}
              onOpen={setCategory}
              onRemove={(id) => setCategories(categories.filter((item) => item.id !== id))}
            />
          )}
        </div>
      </div>

      {/* PANEL DERECHO: editor de la nota seleccionada */}
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
          <div className="flex-1 flex items-center justify-center p-12 text-center bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <FileText className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="text-sm font-semibold text-neutral-700">Ninguna nota seleccionada</h3>
              <p className="text-xs font-normal text-neutral-500">
                Abre una categoría y elige una nota, o crea una nueva.
              </p>
            </div>
          </div>
        )}
      </div>

      <CreateNoteCategoryModal
        isOpen={creatingCategory}
        onCreate={(draft) => {
          setCategories([...categories, { ...draft, id: `cat_${Date.now().toString(36)}` }]);
          setCreatingCategory(false);
        }}
        onClose={() => setCreatingCategory(false)}
      />

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
