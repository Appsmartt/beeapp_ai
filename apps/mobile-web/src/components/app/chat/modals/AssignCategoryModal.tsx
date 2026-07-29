'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';

interface AssignCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatName: string;
  categories: { id: string; name: string }[];
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
  const [selectedIds, setSelectedIds] = useState<string[]>(currentCategoryIds);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = () => {
    onSave(selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 p-5 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="font-semibold text-sm text-neutral-900">Asignar a categoría</h2>
            <p className="text-xs text-neutral-500 font-normal">{chatName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 max-h-60 overflow-y-auto">
          {categories.map((cat) => {
            const checked = selectedIds.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 px-2"
              >
                <span className="text-xs font-semibold text-neutral-800">{cat.name}</span>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  checked ? 'bg-brand-primary border-brand-primary text-white' : 'border-neutral-300'
                }`}>
                  {checked && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
        >
          Guardar categorías
        </button>

      </div>
    </div>
  );
}
