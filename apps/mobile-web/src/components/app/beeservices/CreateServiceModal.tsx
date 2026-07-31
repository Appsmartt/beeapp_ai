'use client';

import { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { BusinessService } from '@/mocks/myServices';

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (service: BusinessService) => void;
}

export default function CreateServiceModal({ isOpen, onClose, onAdd }: CreateServiceModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newS: BusinessService = {
      id: `serv-${Date.now()}`,
      name,
      price: price ? `$${price}` : 'Cotización',
      description,
      type: 'service',
      serviceModalities: ['Virtual'],
      features: [{ key: 'Atención', value: 'Bajo agenda' }],
    };

    onAdd(newS);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-sm text-neutral-900">Nuevo Servicio</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-neutral-700">Nombre del servicio</label>
            <input
              type="text"
              required
              placeholder="Ej. Consultoría Digital"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Precio / Tarifa (dejar en blanco para Cotización)</label>
            <input
              type="text"
              placeholder="150.00 / hr"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Descripción del servicio</label>
            <textarea
              placeholder="Detalla lo que incluye el servicio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-normal resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm mt-3"
          >
            Agregar servicio
          </button>
        </form>

      </div>
    </div>
  );
}
