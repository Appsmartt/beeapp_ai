'use client';

import { useState } from 'react';
import { X, Megaphone } from 'lucide-react';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, category: string) => void;
}

export default function CreateCommunityModal({ isOpen, onClose, onCreate }: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Negocios');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name, description, category);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-sm text-neutral-900">Nueva Comunidad</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
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
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-normal"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-normal text-neutral-800"
            >
              <option value="Negocios">Negocios</option>
              <option value="Tecnología">Tecnología</option>
              <option value="Diseño">Diseño</option>
              <option value="Finanzas">Finanzas</option>
              <option value="Educación">Educación</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Descripción</label>
            <textarea
              placeholder="Describe el propósito de la comunidad..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-normal resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            Crear comunidad
          </button>
        </form>

      </div>
    </div>
  );
}
