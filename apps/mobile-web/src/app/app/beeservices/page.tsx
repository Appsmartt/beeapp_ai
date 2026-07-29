'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Store, Plus, ChevronRight } from 'lucide-react';
import { MOCK_BUSINESSES, BusinessItem } from '@/mocks/myServices';
import CreateBusinessModal from '@/components/app/beeservices/CreateBusinessModal';
import BusinessDetailView from '@/components/app/beeservices/BusinessDetailView';

export default function BeeServicesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>(MOCK_BUSINESSES);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleCreateBusiness = (newBusiness: BusinessItem) => {
    setBusinesses([newBusiness, ...businesses]);
    setSelectedBusiness(newBusiness);
  };

  return (
    <div className="bg-white min-h-full flex flex-col lg:flex-row pb-24 lg:pb-0 relative">
      
      {/* LEFT COLUMN: Business List */}
      <div className={`flex-1 lg:w-96 lg:flex-none lg:border-r lg:border-neutral-200 flex flex-col ${
        selectedBusiness ? 'hidden lg:flex' : 'flex'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href="/app" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-semibold text-base text-neutral-900">BeeServices</h1>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-brand-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Crear negocio</span>
          </button>
        </div>

        {/* Business List */}
        <div className="p-4 flex-1 overflow-y-auto">
          {businesses.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-3">
              <Store className="w-12 h-12 mx-auto text-neutral-300" />
              <p className="text-sm font-semibold text-neutral-800">Aún no tienes negocios</p>
              <p className="text-xs text-neutral-500 font-normal">Crea tu primer negocio para publicar productos y servicios.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
              {businesses.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBusiness(b)}
                  className={`py-3.5 px-1 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors ${
                    selectedBusiness?.id === b.id ? 'bg-brand-primary/10 border-l-4 border-brand-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {b.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-neutral-900">{b.name}</h3>
                      <p className="text-[11px] text-neutral-500 font-normal mt-0.5">
                        {b.category} • {b.products.length} prod / {b.services.length} serv
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Business Detail & Catalog Management */}
      <div className={`flex-1 flex-col ${selectedBusiness ? 'flex' : 'hidden lg:flex'}`}>
        {selectedBusiness ? (
          <BusinessDetailView
            business={selectedBusiness}
            onBack={() => setSelectedBusiness(null)}
            onUpdateBusiness={(updated) => {
              setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
              setSelectedBusiness(updated);
            }}
          />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center p-12 text-center text-neutral-400 bg-neutral-50/50">
            <div className="space-y-3 max-w-xs">
              <Store className="w-12 h-12 mx-auto text-neutral-300" />
              <h3 className="font-semibold text-sm text-neutral-700">Ningún negocio seleccionado</h3>
              <p className="text-xs text-neutral-500 font-normal">
                Selecciona un negocio de la lista de la izquierda para ver su información y catálogo de oferta.
              </p>
            </div>
          </div>
        )}
      </div>

      <CreateBusinessModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateBusiness}
      />

    </div>
  );
}
