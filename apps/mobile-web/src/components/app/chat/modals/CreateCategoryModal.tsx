'use client';

import { useState } from 'react';
import { X, Users, Briefcase, Heart, Home, Star, GraduationCap, Coffee, Gamepad2, Check } from 'lucide-react';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, iconName: string, color: string) => void;
}

const ICONS = [
  { name: 'Users', icon: Users },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Heart', icon: Heart },
  { name: 'Home', icon: Home },
  { name: 'Star', icon: Star },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Coffee', icon: Coffee },
  { name: 'Gamepad2', icon: Gamepad2 },
];

const COLORS = ['#6025d2', '#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0'];

export default function CreateCategoryModal({ isOpen, onClose, onCreate }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Briefcase');
  const [selectedColor, setSelectedColor] = useState('#6025d2');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name, selectedIcon, selectedColor);
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 p-5 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="font-semibold text-sm text-neutral-900">Nueva Categoría de Chat</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Nombre de la categoría</label>
            <input
              type="text"
              required
              placeholder="Ej. Clientes VIP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Ícono</label>
            <div className="grid grid-cols-4 gap-2">
              {ICONS.map((item) => {
                const IconComp = item.icon;
                const isSel = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`h-10 rounded-xl border flex items-center justify-center transition-colors ${
                      isSel ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xs"
                >
                  {selectedColor === c && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm mt-2"
          >
            Crear categoría
          </button>
        </form>

      </div>
    </div>
  );
}
