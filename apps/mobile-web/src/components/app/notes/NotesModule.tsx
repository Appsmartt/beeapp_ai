'use client';

import { useState } from 'react';
import { List, Grid2x2, Plus, FileText, Lock } from 'lucide-react';
import { MOCK_NOTES, NoteItem } from '@/mocks/notes';
import NoteEdit from './NoteEdit';

export default function NotesModule() {
  const [notes, setNotes] = useState<NoteItem[]>(MOCK_NOTES);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const handleCreateNote = () => {
    const newNote: NoteItem = {
      id: `nt-${Date.now()}`,
      title: 'Nueva nota',
      preview: 'Escribe el contenido...',
      content: '',
      timestamp: 'Ahora',
      isProtected: false,
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNote(newNote);
  };

  const handleSaveNote = (updated: NoteItem) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNote && selectedNote.id === id) {
      setSelectedNote(null);
    }
  };

  return (
    <div className="bg-white min-h-full flex flex-col lg:flex-row pb-24 lg:pb-0">
      
      {/* LEFT COLUMN: Notes List or Grid */}
      <div className={`flex-1 lg:w-96 lg:flex-none lg:border-r lg:border-neutral-200 flex flex-col ${
        selectedNote ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Header & Controls */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h1 className="font-semibold text-base text-neutral-900">Mis Notas</h1>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                }`}
                title="Vista en lista"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'
                }`}
                title="Vista en cuadrícula"
              >
                <Grid2x2 className="w-4 h-4" />
              </button>
            </div>

            {/* New Note Button */}
            <button
              type="button"
              onClick={handleCreateNote}
              className="h-9 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-brand-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva nota</span>
            </button>
          </div>
        </div>

        {/* Content Rendering: List vs Grid */}
        <div className="p-4 flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">No tienes notas guardadas</p>
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW (Flat Rows) */
            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`py-3 px-1 flex items-start gap-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
                    selectedNote?.id === note.id ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                    {note.isProtected ? <Lock className="w-4 h-4 text-brand-primary" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-neutral-900 truncate">
                        {note.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                        {note.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                      {note.isProtected ? 'Nota protegida. Desbloquea para ver el contenido.' : note.preview}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* GRID VIEW (Responsive Columns) */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 hover:border-brand-primary/40 cursor-pointer flex flex-col justify-between h-36 transition-all ${
                    selectedNote?.id === note.id ? 'ring-2 ring-brand-primary' : ''
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-neutral-900 truncate flex-1">
                        {note.title}
                      </span>
                      {note.isProtected && <Lock className="w-3.5 h-3.5 text-brand-primary shrink-0 ml-1" />}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-normal line-clamp-3 leading-snug">
                      {note.isProtected ? 'Nota protegida' : note.preview}
                    </p>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-normal text-right pt-2 border-t border-neutral-200/40">
                    {note.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Note Editor */}
      <div className={`flex-1 flex-col ${selectedNote ? 'flex' : 'hidden lg:flex'}`}>
        {selectedNote ? (
          <NoteEdit
            note={selectedNote}
            onBack={() => setSelectedNote(null)}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
          />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <FileText className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ninguna nota seleccionada</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona o crea una nota para escribir y editar su contenido a la derecha.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
