'use client';

import { useState } from 'react';
import { ArrowLeft, MapPin, Plus, Package, Wrench } from 'lucide-react';
import { BusinessItem, BusinessProduct, BusinessService } from '@/mocks/myServices';
import CreateProductModal from './CreateProductModal';
import CreateServiceModal from './CreateServiceModal';

interface BusinessDetailViewProps {
  business: BusinessItem;
  onBack: () => void;
  onUpdateBusiness: (updated: BusinessItem) => void;
}

export default function BusinessDetailView({ business, onBack, onUpdateBusiness }: BusinessDetailViewProps) {
  const [filter, setFilter] = useState<'all' | 'products' | 'services'>('all');
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const handleAddProduct = (newProd: BusinessProduct) => {
    const updated = {
      ...business,
      products: [...business.products, newProd],
    };
    onUpdateBusiness(updated);
  };

  const handleAddService = (newServ: BusinessService) => {
    const updated = {
      ...business,
      services: [...business.services, newServ],
    };
    onUpdateBusiness(updated);
  };

  const catalogItems = [
    ...business.products.map((p) => ({ ...p, isService: false })),
    ...business.services.map((s) => ({ ...s, isService: true })),
  ].filter((item) => {
    if (filter === 'products') return !item.isService;
    if (filter === 'services') return item.isService;
    return true;
  });

  return (
    <div className="bg-white min-h-full flex flex-col pb-24 relative">
      
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm text-neutral-900 ml-2 truncate">{business.name}</h1>
      </div>

      <div className="p-4 space-y-5 flex-1">
        
        {/* Business Header Info */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary font-bold text-lg flex items-center justify-center shrink-0">
              {business.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-0.5">
              <h2 className="font-semibold text-base text-neutral-900 leading-tight">{business.name}</h2>
              <span className="text-xs text-brand-primary font-medium">{business.category}</span>
              <p className="text-[11px] text-neutral-500 font-normal flex items-center gap-1 pt-0.5">
                <MapPin className="w-3 h-3 shrink-0 text-neutral-400" /> {business.address}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-600 font-normal leading-relaxed pt-2 border-t border-neutral-200/60">
            {business.description}
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              filter === 'all' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            Todos ({catalogItems.length})
          </button>

          {business.offersProducts && (
            <button
              type="button"
              onClick={() => setFilter('products')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                filter === 'products' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              Productos ({business.products.length})
            </button>
          )}

          {business.offersServices && (
            <button
              type="button"
              onClick={() => setFilter('services')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                filter === 'services' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              Servicios ({business.services.length})
            </button>
          )}
        </div>

        {/* Catalog List */}
        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {catalogItems.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 space-y-2">
              <Package className="w-8 h-8 mx-auto text-neutral-300" />
              <p className="text-xs font-normal">El catálogo está vacío</p>
            </div>
          ) : (
            catalogItems.map((item) => (
              <div key={item.id} className="py-3 px-1 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100 text-brand-primary flex items-center justify-center shrink-0">
                  {item.isService ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-neutral-900 truncate">{item.name}</span>
                    <span className="text-xs font-bold text-neutral-900 font-mono">{item.price}</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* FAB button for adding offer */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          type="button"
          onClick={() => {
            if (business.offersProducts && business.offersServices) {
              setFabMenuOpen(!fabMenuOpen);
            } else if (business.offersProducts) {
              setCreateProductOpen(true);
            } else {
              setCreateServiceOpen(true);
            }
          }}
          className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg hover:bg-brand-dark"
        >
          <Plus className="w-6 h-6" />
        </button>

        {fabMenuOpen && (
          <div className="absolute bottom-14 right-0 w-44 bg-white border border-neutral-200 rounded-2xl shadow-xl p-1.5 text-xs space-y-1 z-40">
            <button
              onClick={() => {
                setFabMenuOpen(false);
                setCreateProductOpen(true);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-50 font-semibold text-neutral-800 text-left"
            >
              <Package className="w-4 h-4 text-brand-primary" /> Nuevo producto
            </button>
            <button
              onClick={() => {
                setFabMenuOpen(false);
                setCreateServiceOpen(true);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-50 font-semibold text-neutral-800 text-left"
            >
              <Wrench className="w-4 h-4 text-brand-primary" /> Nuevo servicio
            </button>
          </div>
        )}
      </div>

      <CreateProductModal
        isOpen={createProductOpen}
        onClose={() => setCreateProductOpen(false)}
        onAdd={handleAddProduct}
      />

      <CreateServiceModal
        isOpen={createServiceOpen}
        onClose={() => setCreateServiceOpen(false)}
        onAdd={handleAddService}
      />

    </div>
  );
}
