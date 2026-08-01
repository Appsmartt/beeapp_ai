'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Lock, Trash2, Check, Star, Clock, Unlock } from 'lucide-react';
import type { NoteItem } from '@/mocks/notes';
import NoteCategoryChips from './NoteCategoryChips';
import NoteFormatToolbar, { type FormatAction } from './NoteFormatToolbar';

interface NoteEditProps {
  note: NoteItem;
  onBack: () => void;
  onSave: (updated: NoteItem) => void;
  onDelete: (id: string) => void;
}

const IMAGE_HTML =
  '<img src="" alt="imagen" style="width:100%;max-width:300px;height:150px;background:#f0f0f0;display:block;margin:8px 0;border-radius:8px;" />';

const toHtml = (content: string) =>
  content.includes('<') ? content : content.replace(/\n/g, '<br>');

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

const ICON_BTN = 'p-1.5 rounded-lg transition-colors';

export default function NoteEdit({ note, onBack, onSave, onDelete }: NoteEditProps) {
  const [title, setTitle] = useState(note.title);
  const [isProtected, setIsProtected] = useState(note.isProtected);
  const [isFavorite, setIsFavorite] = useState(!!note.isFavorite);
  const [reminder, setReminder] = useState(note.reminderDate || '');
  const [showReminder, setShowReminder] = useState(!!note.reminderDate);
  const [categoryIds, setCategoryIds] = useState<string[]>([note.categoryId]);
  const [words, setWords] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);

  // El editor es no controlado: el HTML se siembra una sola vez por nota,
  // si no cada tecla reescribiría el contenido y movería el cursor.
  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    node.innerHTML = toHtml(note.content);
    setWords(countWords(node.innerText));
  }, [note.id]);

  const refreshWords = () => setWords(countWords(editorRef.current?.innerText ?? ''));

  const applyFormat = (action: FormatAction) => {
    editorRef.current?.focus();

    if (action === 'bold') document.execCommand('bold');
    if (action === 'italic') document.execCommand('italic');
    if (action === 'bullet') document.execCommand('insertUnorderedList');
    if (action === 'numbered') document.execCommand('insertOrderedList');

    if (action === 'heading') {
      const current = document.queryCommandValue('formatBlock').toLowerCase();
      document.execCommand('formatBlock', false, current === 'h2' ? 'p' : 'h2');
    }

    if (action === 'link') {
      const url = window.prompt('URL:');
      if (url) document.execCommand('createLink', false, url);
    }

    if (action === 'image') document.execCommand('insertHTML', false, IMAGE_HTML);

    refreshWords();
  };

  const handleSave = () => {
    const node = editorRef.current;

    onSave({
      ...note,
      title: title.trim() || 'Sin Título',
      content: node?.innerHTML ?? note.content,
      preview: isProtected
        ? 'Nota protegida. Desbloquea para ver el contenido.'
        : (node?.innerText ?? '').slice(0, 70),
      isProtected,
      isFavorite,
      reminderDate: showReminder && reminder.trim() ? reminder.trim() : undefined,
      categoryId: categoryIds[0] ?? note.categoryId,
    });
  };

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Cabecera de acciones */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          title="Volver"
          className={`${ICON_BTN} text-neutral-600 hover:bg-neutral-100`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            title={isFavorite ? 'Quitar favorita' : 'Marcar favorita'}
            className={`${ICON_BTN} ${
              isFavorite ? 'text-amber-500 bg-amber-50' : 'text-neutral-400 hover:bg-neutral-100'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowReminder(!showReminder);
              setReminder(showReminder ? '' : '28 Jul • 10:00 AM');
            }}
            title="Recordatorio"
            className={`${ICON_BTN} ${
              showReminder ? 'text-amber-600 bg-amber-50' : 'text-neutral-400 hover:bg-neutral-100'
            }`}
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsProtected(!isProtected)}
            title={isProtected ? 'Protegida con PIN' : 'Proteger con PIN'}
            className={`${ICON_BTN} ${
              isProtected
                ? 'bg-brand-primary/10 text-brand-primary'
                : 'text-neutral-400 hover:bg-neutral-100'
            }`}
          >
            {isProtected ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onDelete(note.id)}
            title="Eliminar nota"
            className={`${ICON_BTN} text-neutral-400 hover:text-red-600 hover:bg-red-50`}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="h-8 px-3.5 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 hover:bg-brand-dark transition-colors ml-1"
          >
            <Check className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>

      {showReminder && (
        <div className="px-6 py-2 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs font-normal text-amber-800 shrink-0">Recordatorio:</span>
          <input
            type="text"
            placeholder="Ej: 28 Jul • 10:00 AM"
            value={reminder}
            onChange={(event) => setReminder(event.target.value)}
            className="flex-1 bg-transparent text-xs font-normal text-neutral-800 outline-none border-b border-amber-200 focus:border-amber-500"
          />
        </div>
      )}

      {/* Cuerpo: título, categorías y contenido editable */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5">
          <input
            type="text"
            placeholder="Título de la nota..."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={{ fontSize: 24, fontWeight: 600 }}
            className="w-full border-0 outline-none bg-transparent text-neutral-900 placeholder:text-neutral-300"
          />

          <div className="mt-3 pb-3 border-b border-neutral-100">
            <NoteCategoryChips value={categoryIds} onChange={setCategoryIds} />
          </div>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={refreshWords}
          data-placeholder="Escribe el contenido de tu nota aquí..."
          style={{ minHeight: 300, outline: 'none', padding: 16, fontSize: 15, lineHeight: 1.6 }}
          className="note-editor text-neutral-800 font-normal"
        />
      </div>

      <NoteFormatToolbar onAction={applyFormat} words={words} />
    </div>
  );
}
