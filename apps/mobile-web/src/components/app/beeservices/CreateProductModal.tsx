'use client';

import { useState } from 'react';
import { X, Package } from 'lucide-react';
import { BusinessProduct } from '@/mocks/myServices';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: BusinessProduct) => void;
}

export default function CreateProductModal({ isOpen, onClose, onAdd }: CreateProductModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newP: BusinessProduct = {
      id: `prod-${Date.now()}`,
      name,
      price: price ? `$${price}` : '$0.00',
      description,
      type: 'product',
      deliveryMethods: ['Domicilio'],
      features: [{ key: 'Entrega', value: '24-48 horas' }],
    };

    onAdd(newP);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-sm text-neutral-900">Nuevo Producto</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-neutral-700">Nombre del producto</label>
            <input
              type="text"
              required
              placeholder="Ej. Kit de Banners PNG"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Precio ($ USD)</label>
            <input
              type="text"
              placeholder="45.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Descripción</label>
            <textarea
              placeholder="Detalla lo que incluye el producto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-normal resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm mt-3"
          >
            Agregar producto
          </button>
        </form>

      </div>
    </div>
  );
}
