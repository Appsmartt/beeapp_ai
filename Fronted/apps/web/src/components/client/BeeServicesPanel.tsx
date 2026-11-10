'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, Plus, ArrowLeft, Store } from 'lucide-react';
import { BusinessItem, BusinessProduct, BusinessService } from '@/lib/client/myServices';
import { loadOwnedBusinesses } from '@/lib/client/liveData';
import { ListSkeleton } from '@/components/client/RouteSkeleton';
import OwnedBusinessCard from './beeservices/OwnedBusinessCard';
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
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [view, setView] = useState<PanelView>('list');

  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);

  const reloadBusinesses = () => {
    setLoadingBusinesses(true);
    loadOwnedBusinesses()
      .then(setBusinesses)
      .catch(() => setBusinesses([]))
      .finally(() => setLoadingBusinesses(false));
  };

  useEffect(() => {
    reloadBusinesses();
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
      <header className="shrink-0 border-b border-[#F0EAF3] bg-[#FFFCF9] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                aria-label={view === 'list' ? 'Volver al inicio' : 'Volver'}
                className="rounded-2xl border border-[#E7DDF2] bg-white p-2 text-[#7865AD] transition hover:bg-[#F6EAFE] hover:text-[#7427D5]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="truncate text-xl font-extrabold leading-tight text-[#261743] sm:text-2xl">
                {heading}
              </h1>
            </div>
            {view === 'list' ? (
              <p className="mt-2 pl-12 text-xs leading-relaxed text-[#786593] sm:text-sm">
                Elige un negocio para administrar sus operaciones.
              </p>
            ) : null}
          </div>

          {view === 'list' ? (
            <button
              type="button"
              onClick={() => router.push('/app/beeservices/create')}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7427D5] px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#5E1ABF] sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Crear negocio
            </button>
          ) : null}
        </div>
      </header>

      {/* Body Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {/* VIEW 1: Business List */}
        {view === 'list' && (
          <div className="mx-auto w-full max-w-6xl space-y-5">
            {!loadingBusinesses && businesses.length > 0 ? (
              <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
                  <BriefcaseBusiness className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-extrabold text-[#261743]">Tu portafolio comercial</h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#786593]">
                    Administra catálogo, solicitudes, pagos y operación de cada negocio.
                  </p>
                </div>
                <div className="hidden shrink-0 flex-col items-end sm:flex">
                  <span className="text-2xl font-extrabold leading-none text-[#7427D5]">{businesses.length}</span>
                  <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">
                    {businesses.length === 1 ? 'Negocio' : 'Negocios'}
                  </span>
                </div>
              </div>
            ) : null}

            {loadingBusinesses ? <ListSkeleton /> : null}

            {!loadingBusinesses && businesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E7DDF2] bg-white px-6 py-14 text-center shadow-sm sm:py-16">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6EAFE] text-[#7427D5]">
                  <Store className="h-7 w-7" aria-hidden />
                </span>
                <p className="mt-4 text-base font-extrabold text-[#261743]">Aún no tienes negocios</p>
                <p className="mt-1 text-xs text-[#786593]">Crea tu primer negocio para publicar productos y servicios.</p>
                <button
                  type="button"
                  onClick={() => router.push('/app/beeservices/create')}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7427D5] px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#5E1ABF]"
                >
                  <Plus className="h-4 w-4" />
                  Crear negocio
                </button>
              </div>
            ) : null}

            {!loadingBusinesses && businesses.length > 0 ? (
              <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                {businesses.map((business) => (
                  <OwnedBusinessCard key={business.id} business={business} onChanged={reloadBusinesses} />
                ))}
              </ul>
            ) : null}
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
