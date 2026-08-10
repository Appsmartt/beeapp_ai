'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import {
  NOTE_CATEGORY_COLORS,
  NOTE_CATEGORY_ICON_KEYS,
  type NoteCategory,
} from '@/mocks/noteCategories';
import { getNoteCategoryIcon } from './noteCategoryIcons';

interface CreateNoteCategoryModalProps {
  isOpen: boolean;
  onCreate: (category: Omit<NoteCategory, 'id'>) => void;
  onClose: () => void;
}

/** Modal para crear una categoría de notas: nombre, ícono y color */
export default function CreateNoteCategoryModal({
  isOpen,
  onCreate,
  onClose,
}: CreateNoteCategoryModalProps) {
  const [name, setName] = useState('');
  const [iconKey, setIconKey] = useState(NOTE_CATEGORY_ICON_KEYS[0]);
  const [color, setColor] = useState(NOTE_CATEGORY_COLORS[0]);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setIconKey(NOTE_CATEGORY_ICON_KEYS[0]);
    setColor(NOTE_CATEGORY_COLORS[0]);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-neutral-900/40" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Nueva categoría</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-[11px] font-normal text-neutral-500 mb-2">Nombre</label>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Trabajo"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-brand-primary placeholder:text-neutral-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-normal text-neutral-500 mb-2">Ícono</label>
            <div className="flex flex-wrap gap-2">
              {NOTE_CATEGORY_ICON_KEYS.map((key) => {
                const Icon = getNoteCategoryIcon(key);
                const isActive = key === iconKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIconKey(key)}
                    aria-label={key}
                    style={isActive ? { borderColor: color, color } : undefined}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
                      isActive ? '' : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-normal text-neutral-500 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {NOTE_CATEGORY_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  aria-label={`Color ${option}`}
                  style={{ backgroundColor: option }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105"
                >
                  {option === color && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onCreate({ name: name.trim(), iconKey, color })}
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-40 disabled:hover:bg-brand-primary transition-colors"
          >
            Crear categoría
          </button>
        </div>
      </div>
    </div>
  );
}
