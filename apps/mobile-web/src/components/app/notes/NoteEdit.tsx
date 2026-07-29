'use client';

import { useState } from 'react';
import { ArrowLeft, Lock, Trash2, Check } from 'lucide-react';
import { NoteItem } from '@/mocks/notes';

interface NoteEditProps {
  note: NoteItem;
  onBack: () => void;
  onSave: (updated: NoteItem) => void;
  onDelete: (id: string) => void;
}

export default function NoteEdit({ note, onBack, onSave, onDelete }: NoteEditProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isProtected, setIsProtected] = useState(note.isProtected);

  const handleSave = () => {
    onSave({
      ...note,
      title,
      content,
      preview: isProtected ? 'Nota protegida. Desbloquea para ver el contenido.' : content.slice(0, 60),
      isProtected,
    });
    onBack();
  };

  return (
    <div className="bg-white min-h-full flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          {/* Lock PIN toggle */}
          <button
            type="button"
            onClick={() => setIsProtected(!isProtected)}
            className={`p-1.5 rounded-full transition-colors ${
              isProtected ? 'bg-brand-primary/10 text-brand-primary font-semibold' : 'text-neutral-400 hover:bg-neutral-100'
            }`}
            title={isProtected ? 'Protegida con PIN' : 'Proteger con PIN'}
          >
            <Lock className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-neutral-100 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 hover:bg-brand-dark transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-4 space-y-4 flex-1 flex flex-col">
        {/* Title Input */}
        <input
          type="text"
          placeholder="Título de la nota"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-lg font-semibold text-neutral-900 border-b border-neutral-100 pb-2 outline-none placeholder:text-neutral-400"
        />

        {/* Timestamp & Protection Banner */}
        <div className="flex items-center justify-between text-xs text-neutral-400 font-normal">
          <span>{note.timestamp}</span>
          {isProtected && (
            <span className="text-brand-primary font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> Protegida con PIN
            </span>
          )}
        </div>

        {/* Content Textarea */}
        <textarea
          placeholder="Escribe tu nota aquí..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full flex-1 min-h-[300px] text-sm text-neutral-800 outline-none resize-none placeholder:text-neutral-400 font-normal leading-relaxed"
        />
      </div>

    </div>
  );
}
