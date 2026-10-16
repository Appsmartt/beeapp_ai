'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { loadNoteCategoryPalette, type NoteCategory } from '@/lib/client/noteCategories';
import { getNoteCategoryIcon } from './noteCategoryIcons';

interface CreateNoteCategoryModalProps {
  isOpen: boolean;
  onCreate: (category: Omit<NoteCategory, 'id'>) => void;
  onClose: () => void;
}

export default function CreateNoteCategoryModal({
  isOpen,
  onCreate,
  onClose,
}: CreateNoteCategoryModalProps) {
  const [name, setName] = useState('');
  const [iconKeys, setIconKeys] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [iconKey, setIconKey] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    void loadNoteCategoryPalette().then((palette) => {
      setIconKeys(palette.iconKeys);
      setColors(palette.colors);
      setIconKey(palette.iconKeys[0] ?? '');
      setColor(palette.colors[0] ?? '#6025d2');
    });
    setName('');
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
            {iconKeys.length === 0 ? (
              <p className="text-xs text-neutral-500">Paleta de íconos no configurada.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {iconKeys.map((key) => {
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
            )}
          </div>

          <div>
            <label className="block text-[11px] font-normal text-neutral-500 mb-2">Color</label>
            {colors.length === 0 ? (
              <p className="text-xs text-neutral-500">Paleta de colores no configurada.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {colors.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-label={`Color ${option}`}
                    style={{ backgroundColor: option }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105"
                  >
                    {color === option ? <Check className="w-4 h-4" /> : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!name.trim() || !iconKey || !color}
            onClick={() => {
              onCreate({ name: name.trim(), iconKey, color });
              onClose();
            }}
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            Crear categoría
          </button>
        </div>
      </div>
    </div>
  );
}
