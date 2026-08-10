'use client';

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { MOCK_NOTE_CATEGORIES } from '@/mocks/noteCategories';
import { getNoteCategoryIcon } from './noteCategoryIcons';

interface NoteCategoryChipsProps {
  /** Ids de las categorías asignadas a la nota */
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Chips de las categorías de la nota, con "+" para asignar más */
export default function NoteCategoryChips({ value, onChange }: NoteCategoryChipsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {value.map((id) => {
        const category = MOCK_NOTE_CATEGORIES.find((item) => item.id === id);
        if (!category) return null;
        const Icon = getNoteCategoryIcon(category.iconKey);

        return (
          <span
            key={id}
            style={{ borderColor: category.color, color: category.color }}
            className="inline-flex items-center gap-1.5 border rounded-full pl-2 pr-1.5 py-1 text-[11px] font-normal"
          >
            <Icon className="w-3 h-3" />
            {category.name}
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-label={`Quitar ${category.name}`}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={() => setPickerOpen(!pickerOpen)}
        aria-label="Asignar categorías"
        className="w-6 h-6 rounded-full border border-dashed border-neutral-300 text-neutral-500 flex items-center justify-center hover:border-brand-primary hover:text-brand-primary transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>

      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setPickerOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-30 w-60 max-h-64 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-xl py-1">
            {MOCK_NOTE_CATEGORIES.map((category) => {
              const Icon = getNoteCategoryIcon(category.iconKey);
              const isOn = value.includes(category.id);

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggle(category.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 transition-colors"
                >
                  <span
                    style={{ backgroundColor: `${category.color}1A` }}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: category.color }} />
                  </span>
                  <span className="flex-1 text-left text-xs font-normal text-neutral-900">
                    {category.name}
                  </span>
                  {isOn && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
