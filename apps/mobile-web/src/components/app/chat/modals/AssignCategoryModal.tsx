'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { ChatCategory } from '@/mocks/chats';
import { getCategoryIcon } from '../categoryIcons';

interface AssignCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatName?: string;
  categories: ChatCategory[];
  currentCategoryIds?: string[];
  onSave: (assignedIds: string[]) => void;
}

export default function AssignCategoryModal({
  isOpen,
  onClose,
  chatName,
  categories,
  currentCategoryIds = [],
  onSave,
}: AssignCategoryModalProps) {
  const [selected, setSelected] = useState<string[]>(currentCategoryIds);

  useEffect(() => {
    if (isOpen) setSelected(currentCategoryIds);
  }, [isOpen, currentCategoryIds]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4 max-h-[75vh] flex flex-col">
        <div>
          <h2 className="font-semibold text-base text-neutral-900">Asignar a categoría</h2>
          {chatName && <p className="text-xs text-neutral-500 font-normal mt-0.5">{chatName}</p>}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {categories.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">
              Todavía no has creado categorías.
            </p>
          ) : (
            categories.map((category) => {
              const Icon = getCategoryIcon(category.icon);
              const isSelected = selected.includes(category.id);
              return (
                <div
                  key={category.id}
                  onClick={() => toggle(category.id)}
                  className="py-3 px-2 flex items-center justify-between cursor-pointer hover:bg-neutral-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-700"
                      style={{ backgroundColor: category.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-normal text-neutral-900">{category.name}</span>
                  </div>

                  {isSelected && <Check className="w-4.5 h-4.5 text-brand-primary shrink-0" />}
                </div>
              );
            })
          )}
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
            type="button"
            onClick={handleSave}
            className="flex-1 h-12 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
