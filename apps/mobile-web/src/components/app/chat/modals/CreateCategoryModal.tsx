'use client';

import { useEffect, useState } from 'react';
import { ChatCategory } from '@/mocks/chats';
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_NAMES,
  CATEGORY_COLORS,
  CategoryIconName,
} from '../categoryIcons';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (category: Omit<ChatCategory, 'id'>) => void;
}

export default function CreateCategoryModal({
  isOpen,
  onClose,
  onCreate,
}: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIconName>('Users');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setIcon('Users');
      setColor(CATEGORY_COLORS[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), icon, color });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4">
        <h2 className="font-semibold text-base text-neutral-900">Crear categoría</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Nombre de la categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-3 bg-neutral-100 rounded-xl text-sm font-normal text-neutral-900 outline-none focus:ring-2 focus:ring-brand-primary"
          />

          <div className="space-y-2">
            <label className="text-xs font-normal text-neutral-500">Ícono</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICON_NAMES.map((iconName) => {
                const Icon = CATEGORY_ICONS[iconName];
                const isSelected = icon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-2 border-brand-primary bg-brand-primary/10 text-brand-primary'
                        : 'border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-normal text-neutral-500">Color del chip</label>
            <div className="flex flex-wrap gap-2.5">
              {CATEGORY_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  style={{ backgroundColor: option }}
                  className={`w-8 h-8 rounded-full border border-neutral-300 transition-transform ${
                    color === option ? 'border-2 border-brand-primary scale-110' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-normal hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 h-12 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
