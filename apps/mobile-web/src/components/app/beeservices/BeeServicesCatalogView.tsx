'use client';

import { useState } from 'react';
import { MapPin, Plus, Package, Wrench, ChevronRight } from 'lucide-react';
import { BusinessItem, BusinessProduct, BusinessService } from '@/mocks/myServices';

export type CatalogItem = (BusinessProduct | BusinessService) & { isService: boolean };

interface BeeServicesCatalogViewProps {
  business: BusinessItem;
  onSelectItem: (item: CatalogItem) => void;
  onOpenCreateProduct: () => void;
  onOpenCreateService: () => void;
}

export function BeeServicesCatalogView({
  business,
  onSelectItem,
  onOpenCreateProduct,
  onOpenCreateService,
}: BeeServicesCatalogViewProps) {
  const [filter, setFilter] = useState<'all' | 'products' | 'services'>('all');
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const getCatalogItems = (): CatalogItem[] => {
    return [
      ...business.products.map((p) => ({ ...p, isService: false })),
      ...business.services.map((s) => ({ ...s, isService: true })),
    ].filter((item) => {
      if (filter === 'products') return !item.isService;
      if (filter === 'services') return item.isService;
      return true;
    });
  };

  const catalogItems = getCatalogItems();

  return (
    <div className="space-y-5 relative">
      {/* Header Card */}
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary font-bold text-base flex items-center justify-center shrink-0">
            {business.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-base text-neutral-900 leading-tight">{business.name}</h3>
            <span className="text-xs text-brand-primary font-medium">{business.category}</span>
            <p className="text-xs text-neutral-500 font-normal flex items-center gap-1 pt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400" /> {business.address}
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

      {/* Catalog Items */}
      <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-2xl overflow-hidden bg-white">
        {catalogItems.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 space-y-2">
            <Package className="w-8 h-8 mx-auto text-neutral-300" />
            <p className="text-xs font-normal">El catálogo está vacío</p>
          </div>
        ) : (
          catalogItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  {item.isService ? <Wrench className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-neutral-900 truncate">{item.name}</span>
                    <span className="text-xs font-semibold text-brand-primary">{item.price}</span>
                  </div>
                  <p className="text-xs text-neutral-500 font-normal truncate mt-0.5">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
            </div>
          ))
        )}
      </div>

      {/* Add Action Button / FAB */}
      <div className="pt-2 flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (business.offersProducts && business.offersServices) {
                setFabMenuOpen(!fabMenuOpen);
              } else if (business.offersProducts) {
                onOpenCreateProduct();
              } else {
                onOpenCreateService();
              }
            }}
            className="h-10 px-4 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-2 shadow-md hover:bg-brand-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar oferta</span>
          </button>

          {fabMenuOpen && (
            <div className="absolute right-0 bottom-12 w-44 bg-white border border-neutral-200 rounded-2xl shadow-xl p-1.5 text-xs space-y-1 z-40">
              <button
                onClick={() => {
                  setFabMenuOpen(false);
                  onOpenCreateProduct();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-50 font-normal text-neutral-800 text-left"
              >
                <Package className="w-4 h-4 text-brand-primary" /> Nuevo producto
              </button>
              <button
                onClick={() => {
                  setFabMenuOpen(false);
                  onOpenCreateService();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-50 font-normal text-neutral-800 text-left"
              >
                <Wrench className="w-4 h-4 text-brand-primary" /> Nuevo servicio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
