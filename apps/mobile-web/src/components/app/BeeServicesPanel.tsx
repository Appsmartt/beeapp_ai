'use client';

import { useState } from 'react';
import { Store, Plus, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { MOCK_BUSINESSES, BusinessItem, BusinessProduct, BusinessService } from '@/mocks/myServices';
import CreateBusinessModal from './beeservices/CreateBusinessModal';
import CreateProductModal from './beeservices/CreateProductModal';
import CreateServiceModal from './beeservices/CreateServiceModal';
import { BeeServicesCatalogView, CatalogItem } from './beeservices/BeeServicesCatalogView';
import { BeeServicesItemDetail } from './beeservices/BeeServicesItemDetail';

interface BeeServicesPanelProps {
  onClose: () => void;
}

type PanelView = 'list' | 'business-detail' | 'item-detail';

export function BeeServicesPanel({ onClose }: BeeServicesPanelProps) {
  const [businesses, setBusinesses] = useState<BusinessItem[]>(MOCK_BUSINESSES);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [view, setView] = useState<PanelView>('list');

  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);

  const handleCreateBusiness = (newBusiness: BusinessItem) => {
    setBusinesses([newBusiness, ...businesses]);
    setSelectedBusiness(newBusiness);
    setView('business-detail');
  };

  const handleAddProduct = (newProd: BusinessProduct) => {
    if (!selectedBusiness) return;
    const updated = {
      ...selectedBusiness,
      products: [...selectedBusiness.products, newProd],
    };
    setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBusiness(updated);
  };

  const handleAddService = (newServ: BusinessService) => {
    if (!selectedBusiness) return;
    const updated = {
      ...selectedBusiness,
      services: [...selectedBusiness.services, newServ],
    };
    setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBusiness(updated);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {view !== 'list' && (
            <button
              type="button"
              onClick={() => {
                if (view === 'item-detail') {
                  setSelectedItem(null);
                  setView('business-detail');
                } else {
                  setSelectedBusiness(null);
                  setView('list');
                }
              }}
              className="p-1 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              title="Volver"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <h2 className="font-semibold text-base text-neutral-900 truncate">
            {view === 'list' && 'BeeServices'}
            {view === 'business-detail' && (selectedBusiness?.name || 'Detalle del Negocio')}
            {view === 'item-detail' && (selectedItem?.name || 'Detalle')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {view === 'list' && (
            <button
              type="button"
              onClick={() => setCreateBusinessOpen(true)}
              className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-brand-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear negocio</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* VIEW 1: Business List */}
        {view === 'list' && (
          <div className="space-y-4">
            {businesses.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 space-y-3">
                <Store className="w-12 h-12 mx-auto text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-800">Aún no tienes negocios</p>
                <p className="text-xs text-neutral-500 font-normal">Crea tu primer negocio para publicar productos y servicios.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-2xl overflow-hidden bg-white">
                {businesses.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBusiness(b);
                      setView('business-detail');
                    }}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-neutral-900 truncate">{b.name}</h3>
                        <p className="text-xs text-neutral-500 font-normal mt-0.5 truncate">
                          {b.category} • {b.products.length} prod / {b.services.length} serv
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Business Detail / Catalog */}
        {view === 'business-detail' && selectedBusiness && (
          <BeeServicesCatalogView
            business={selectedBusiness}
            onSelectItem={(item) => {
              setSelectedItem(item);
              setView('item-detail');
            }}
            onOpenCreateProduct={() => setCreateProductOpen(true)}
            onOpenCreateService={() => setCreateServiceOpen(true)}
          />
        )}

        {/* VIEW 3: Item Detail */}
        {view === 'item-detail' && selectedItem && (
          <BeeServicesItemDetail item={selectedItem} />
        )}
      </div>

      {/* Modals */}
      <CreateBusinessModal
        isOpen={createBusinessOpen}
        onClose={() => setCreateBusinessOpen(false)}
        onCreate={handleCreateBusiness}
      />
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
