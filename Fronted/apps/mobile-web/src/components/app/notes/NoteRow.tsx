'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, Lock, Star, Clock, MoreVertical, Trash2, Bell, Unlock } from 'lucide-react';
import { NoteItem } from '@/mocks/notes';

interface NoteRowProps {
  note: NoteItem;
  isSelected: boolean;
  viewMode: 'list' | 'grid';
  onClick: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleProtection: (note: NoteItem) => void;
  onToggleReminder: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NoteRow({
  note,
  isSelected,
  viewMode,
  onClick,
  onToggleFavorite,
  onToggleProtection,
  onToggleReminder,
  onDelete,
}: NoteRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const colorTag = note.colorTag || '#A78BFA';

  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        className={`relative p-3.5 rounded-2xl bg-white border border-neutral-200/80 hover:border-brand-primary/40 cursor-pointer flex flex-col justify-between h-40 transition-all select-none ${
          isSelected ? 'ring-2 ring-brand-primary border-transparent' : ''
        }`}
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorTag }} />
              <span className="font-semibold text-xs text-neutral-900 truncate">
                {note.isProtected ? 'Nota protegida' : note.title || 'Sin Título'}
              </span>
            </div>
            {note.isProtected ? (
              <Lock className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(note.id);
                }}
                className="text-neutral-400 hover:text-amber-400 shrink-0"
              >
                <Star className={`w-3.5 h-3.5 ${note.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
              </button>
            )}
          </div>

          <p className="text-[11px] text-neutral-500 font-normal line-clamp-3 leading-snug">
            {note.isProtected ? 'Desbloquea para ver el contenido' : note.preview || note.content}
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-normal pt-2 border-t border-neutral-100">
          {note.reminderDate ? (
            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium">
              <Clock className="w-3 h-3" /> {note.reminderDate.split('•')[0]}
            </span>
          ) : (
            <span />
          )}
          <span>{note.timestamp}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`group relative py-3 px-3 flex items-start gap-3 cursor-pointer bg-white border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
        isSelected ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
      }`}
    >
      {/* Circle Icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: note.isProtected ? '#F3F4F6' : `${colorTag}18`,
          color: note.isProtected ? '#6B7280' : colorTag,
        }}
      >
        {note.isProtected ? <Lock className="w-4 h-4 text-neutral-500" /> : <FileText className="w-4 h-4" />}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-xs text-neutral-900 truncate">
            {note.isProtected ? 'Nota protegida' : note.title || 'Sin Título'}
          </span>
          <span className="text-[10px] text-neutral-400 font-normal shrink-0">
            {note.timestamp}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[11px] text-neutral-500 font-normal truncate flex-1">
            {note.isProtected ? 'Nota protegida. Desbloquea para ver el contenido.' : note.preview || note.content}
          </p>

          {note.reminderDate && (
            <span className="inline-flex items-center gap-1 text-[9px] font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
              <Clock className="w-2.5 h-2.5" />
              <span>{note.reminderDate.split('•')[0]}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right actions: Star & 3-dots */}
      <div className="flex items-center gap-1 shrink-0 self-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(note.id);
          }}
          className="p-1 text-neutral-300 hover:text-amber-400 transition-colors"
          title={note.isFavorite ? 'Quitar favorita' : 'Marcar favorita'}
        >
          <Star className={`w-4 h-4 ${note.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          title="Opciones de nota"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Context Menu Dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-9 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 py-1.5 text-xs text-neutral-800 select-none animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onToggleFavorite(note.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal"
          >
            <Star className={`w-3.5 h-3.5 ${note.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-neutral-500'}`} />
            <span>{note.isFavorite ? 'Quitar favorita' : 'Favorita'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onToggleReminder(note.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal"
          >
            <Bell className="w-3.5 h-3.5 text-neutral-500" />
            <span>{note.reminderDate ? 'Quitar recordatorio' : 'Agregar recordatorio'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onToggleProtection(note);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left font-normal"
          >
            {note.isProtected ? (
              <Unlock className="w-3.5 h-3.5 text-brand-primary" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-neutral-500" />
            )}
            <span>{note.isProtected ? 'Quitar protección' : 'Proteger con PIN'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete(note.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 text-left font-normal"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      )}
    </div>
  );
}
