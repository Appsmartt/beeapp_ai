'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import { BusinessItem, BusinessProduct, BusinessService } from '@/lib/client/myServices';
import { loadOwnedBusinesses } from '@/lib/client/liveData';
import CreateProductModal from './beeservices/CreateProductModal';
import CreateServiceModal from './beeservices/CreateServiceModal';
import { BeeServicesCatalogView, CatalogItem } from './beeservices/BeeServicesCatalogView';
import { BeeServicesItemDetail } from './beeservices/BeeServicesItemDetail';

interface BeeServicesPanelProps {
  onClose: () => void;
}

type PanelView = 'list' | 'business-detail' | 'item-detail';

export function BeeServicesPanel({ onClose }: BeeServicesPanelProps) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [view, setView] = useState<PanelView>('list');

  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);

  useEffect(() => {
    loadOwnedBusinesses().then(setBusinesses).catch(() => setBusinesses([]));
  }, []);

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

  const handleBack = () => {
    if (view === 'item-detail') {
      setSelectedItem(null);
      setView('business-detail');
      return;
    }

    if (view === 'business-detail') {
      setSelectedBusiness(null);
      setView('list');
      return;
    }

    onClose();
  };

  const heading = view === 'business-detail'
    ? (selectedBusiness?.name || 'Detalle del negocio')
    : view === 'item-detail'
      ? (selectedItem?.name || 'Detalle')
      : 'Mis negocios';

  return (
    <div className="relative flex h-full flex-col bg-[#FFFCF9]">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#F0EAF3] px-5 py-5 sm:px-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              aria-label={view === 'list' ? 'Volver al inicio' : 'Volver'}
              className="rounded-full p-1.5 text-[#7865AD] transition-colors hover:bg-[#F6EAFE] hover:text-[#7427D5]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="truncate text-2xl font-extrabold leading-tight text-[#7427D5]">
              {heading}
            </h1>
          </div>
          {view === 'list' ? (
            <p className="ml-9 mt-1 text-sm text-[#7865AD]">
              Elige un negocio para administrar sus operaciones.
            </p>
          ) : null}
        </div>

        {view === 'list' ? (
          <button
            type="button"
            onClick={() => router.push('/app/beeservices/create')}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#7427D5] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#5E1ABF]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Crear negocio</span>
          </button>
        ) : null}
      </header>

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
