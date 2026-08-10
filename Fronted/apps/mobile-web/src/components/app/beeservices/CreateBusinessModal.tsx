'use client';

import { useState } from 'react';
import { X, Store } from 'lucide-react';
import { BusinessItem } from '@/mocks/myServices';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (business: BusinessItem) => void;
}

export default function CreateBusinessModal({ isOpen, onClose, onCreate }: CreateBusinessModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Diseño & Publicidad');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [offersProducts, setOffersProducts] = useState(true);
  const [offersServices, setOffersServices] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newB: BusinessItem = {
      id: `biz-${Date.now()}`,
      name,
      category,
      address: address || 'Dirección no especificada',
      description,
      offersProducts,
      offersServices,
      deliveryMethods: offersProducts ? ['Domicilio', 'Recoger en local'] : [],
      serviceModalities: offersServices ? ['Virtual', 'Presencial'] : [],
      products: [],
      services: [],
    };

    onCreate(newB);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-sm text-neutral-900">Crear Nuevo Negocio</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-neutral-700">Nombre del negocio</label>
            <input
              type="text"
              required
              placeholder="Ej. Mi Tienda Digital"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-normal text-neutral-800"
            >
              <option value="Diseño & Publicidad">Diseño & Publicidad</option>
              <option value="Desarrollo de Software">Desarrollo de Software</option>
              <option value="Consultoría Empresarial">Consultoría Empresarial</option>
              <option value="Comercio & Retail">Comercio & Retail</option>
              <option value="Servicios Profesionales">Servicios Profesionales</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Dirección o ciudad</label>
            <input
              type="text"
              placeholder="Calle 10 # 5-20, Bogotá"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Descripción del negocio</label>
            <textarea
              placeholder="Resume lo que ofrece tu negocio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-normal resize-none"
            />
          </div>

          {/* Offer type toggles */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <span className="text-[11px] font-semibold text-neutral-700">Tipo de oferta disponible</span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-neutral-800">Ofrece Productos físic/digitales</span>
              <input
                type="checkbox"
                checked={offersProducts}
                onChange={(e) => setOffersProducts(e.target.checked)}
                className="w-4 h-4 accent-brand-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-neutral-800">Ofrece Servicios profesionales</span>
              <input
                type="checkbox"
                checked={offersServices}
                onChange={(e) => setOffersServices(e.target.checked)}
                className="w-4 h-4 accent-brand-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm mt-3"
          >
            Guardar negocio
          </button>
        </form>

      </div>
    </div>
  );
}
