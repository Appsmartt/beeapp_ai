'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { MOCK_CONTACTS } from '@/mocks/contacts';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (selectedNames: string[]) => void;
}

export default function AddMemberModal({ isOpen, onClose, onAdd }: AddMemberModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirm = () => {
    const selectedNames = MOCK_CONTACTS.filter((c) => selectedIds.includes(c.id)).map((c) => c.name);
    onAdd(selectedNames);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 p-5 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="font-semibold text-sm text-neutral-900">Agregar miembros</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 max-h-60 overflow-y-auto">
          {MOCK_CONTACTS.map((c) => {
            const checked = selectedIds.includes(c.id);
            return (
              <div
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 px-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 font-bold text-xs flex items-center justify-center">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-800">{c.name}</p>
                    <p className="text-[10px] text-neutral-400 font-normal">{c.company}</p>
                  </div>
                </div>
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
          onClick={handleConfirm}
          disabled={selectedIds.length === 0}
          className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50"
        >
          Agregar ({selectedIds.length})
        </button>

      </div>
    </div>
  );
}
