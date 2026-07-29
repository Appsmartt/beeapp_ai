'use client';

import { X, GripVertical, Check } from 'lucide-react';

interface CustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomizeModal({ isOpen, onClose }: CustomizeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 p-5 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="font-semibold text-sm text-neutral-900">Personalizar Módulos</h2>
            <p className="text-[11px] text-neutral-500 font-normal">Reordena la posición de los chips en la pantalla principal</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {['Correos', 'Notas', 'Contactos', 'Almacenamiento', 'Agenda', 'Chat'].map((m) => (
            <div key={m} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800">{m}</span>
              <GripVertical className="w-4 h-4 text-neutral-400 cursor-grab" />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          <span>Guardar orden</span>
        </button>

      </div>
    </div>
  );
}
