'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { loadCommunityCategoryLabels } from '@/lib/client/communities';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, category: string) => void;
}

const DEFAULT_CATEGORIES = ['Negocios', 'Tecnología', 'Diseño', 'Finanzas', 'Educación'];

export default function CreateCommunityModal({
  isOpen,
  onClose,
  onCreate,
}: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [category, setCategory] = useState('Negocios');

  useEffect(() => {
    if (!isOpen) return;
    void loadCommunityCategoryLabels()
      .then((labels) => {
        if (labels.length > 0) {
          setCategories(labels);
          setCategory((current) => (labels.includes(current) ? current : labels[0]));
        }
      })
      .catch(() => undefined);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim(), category);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative z-50 w-full max-w-[430px] space-y-4 rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand-primary" />
            <h2 className="text-sm font-semibold text-neutral-900">Nueva Comunidad</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Nombre de la comunidad</label>
            <input
              type="text"
              required
              placeholder="Ej. Red de Emprendedores"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-normal outline-none focus:border-brand-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-normal text-neutral-800 outline-none focus:border-brand-primary"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Descripción</label>
            <textarea
              placeholder="Describe el propósito de la comunidad..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs font-normal outline-none focus:border-brand-primary"
            />
          </div>

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-brand-primary text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            Crear comunidad
          </button>
        </form>
      </div>
    </div>
  );
}
