'use client';

import { useState } from 'react';
import { ArrowLeft, Lock, Trash2, Check, Star, Clock, Palette, Unlock } from 'lucide-react';
import { NoteItem } from '@/mocks/notes';

interface NoteEditProps {
  note: NoteItem;
  onBack: () => void;
  onSave: (updated: NoteItem) => void;
  onDelete: (id: string) => void;
}

const COLOR_TAGS = ['#A78BFA', '#F472B6', '#60A5FA', '#FB923C', '#34D399', '#9CA3AF'];

export default function NoteEdit({ note, onBack, onSave, onDelete }: NoteEditProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isProtected, setIsProtected] = useState(note.isProtected);
  const [isFavorite, setIsFavorite] = useState(!!note.isFavorite);
  const [reminder, setReminder] = useState(note.reminderDate || '');
  const [showReminder, setShowReminder] = useState(!!note.reminderDate);
  const [colorTag, setColorTag] = useState(note.colorTag || COLOR_TAGS[0]);

  const handleSave = () => {
    onSave({
      ...note,
      title: title.trim() || 'Sin Título',
      content,
      preview: isProtected ? 'Nota protegida. Desbloquea para ver el contenido.' : content.slice(0, 70),
      isProtected,
      isFavorite,
      reminderDate: showReminder && reminder.trim() ? reminder.trim() : undefined,
      colorTag,
    });
  };

  return (
    <div className="bg-white min-h-full flex flex-col select-none">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100 transition-colors shrink-0"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <input
            type="text"
            placeholder="Título de la nota..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-base font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 bg-transparent truncate"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Favorite toggle */}
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-1.5 rounded-lg transition-colors ${
              isFavorite ? 'text-amber-500 bg-amber-50' : 'text-neutral-400 hover:bg-neutral-100'
            }`}
            title={isFavorite ? 'Quitar favorita' : 'Marcar favorita'}
          >
            <Star className={`w-4.5 h-4.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Reminder toggle */}
          <button
            type="button"
            onClick={() => {
              if (showReminder) {
                setShowReminder(false);
                setReminder('');
              } else {
                setShowReminder(true);
                setReminder('28 Jul • 10:00 AM');
              }
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              showReminder ? 'text-amber-600 bg-amber-50' : 'text-neutral-400 hover:bg-neutral-100'
            }`}
            title="Recordatorio"
          >
            <Clock className="w-4.5 h-4.5" />
          </button>

          {/* Lock PIN toggle */}
          <button
            type="button"
            onClick={() => setIsProtected(!isProtected)}
            className={`p-1.5 rounded-lg transition-colors ${
              isProtected ? 'bg-brand-primary/10 text-brand-primary font-semibold' : 'text-neutral-400 hover:bg-neutral-100'
            }`}
            title={isProtected ? 'Protegida con PIN' : 'Proteger con PIN'}
          >
            {isProtected ? <Lock className="w-4.5 h-4.5" /> : <Unlock className="w-4.5 h-4.5" />}
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Eliminar nota"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className="h-8 px-3.5 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 hover:bg-brand-dark transition-colors shadow-xs ml-1"
          >
            <Check className="w-4 h-4" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Sub-header: Color tags palette & reminder input if enabled */}
      <div className="px-6 py-2.5 bg-neutral-50/70 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-neutral-400" />
          <div className="flex items-center gap-1.5">
            {COLOR_TAGS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setColorTag(col)}
                style={{ backgroundColor: col }}
                className={`w-4 h-4 rounded-full transition-transform ${
                  colorTag === col ? 'ring-2 ring-neutral-800 scale-110' : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-normal">
          <span>{note.timestamp}</span>
          {isProtected && (
            <span className="text-brand-primary font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> PIN Activo
            </span>
          )}
        </div>
      </div>

      {/* Optional Reminder Input Box */}
      {showReminder && (
        <div className="px-6 py-2 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-amber-800 font-medium shrink-0">Recordatorio:</span>
          <input
            type="text"
            placeholder="Ej: 28 Jul • 10:00 AM"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className="flex-1 bg-transparent text-xs text-neutral-800 outline-none border-b border-amber-200 focus:border-amber-500 font-normal"
          />
        </div>
      )}

      {/* Editor Body Area */}
      <div className="p-6 flex-1 flex flex-col">
        <textarea
          placeholder="Escribe el contenido de tu nota aquí..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full flex-1 min-h-[360px] text-sm text-neutral-800 outline-none resize-none placeholder:text-neutral-400 font-normal leading-relaxed border-0 bg-transparent"
        />
      </div>
    </div>
  );
}
