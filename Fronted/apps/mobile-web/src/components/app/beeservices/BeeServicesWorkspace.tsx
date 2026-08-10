'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ChevronRight,
    MessageCircle,
    Plus,
    Search,
    Store,
    TrendingUp,
    } from 'lucide-react';
import {
    MOCK_BUSINESSES,
    BusinessItem,
    } from '@/mocks/myServices';
import {
    BeeServicesCategory,
    BeeServicesQuickAction,
    } from '@/mocks/beeServicesExplore';
import CreateBusinessModal from './CreateBusinessModal';
import BusinessDetailView from './BusinessDetailView';
import BeeServicesAiSearchCard from './BeeServicesAiSearchCard';
import BeeServicesQuickActions from './BeeServicesQuickActions';
import BeeServicesCategoryGrid from './BeeServicesCategoryGrid';

export default function BeeServicesWorkspace() {
    const [businesses, setBusinesses] = useState<BusinessItem[]>(
        () => [...MOCK_BUSINESSES],
    );
    const [selectedBusiness, setSelectedBusiness] =
        useState<BusinessItem | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] =
        useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const metrics = useMemo(() => {
        const productCount = businesses.reduce(
        (total, business) => total + business.products.length,
        0,
        );

        const serviceCount = businesses.reduce(
        (total, business) => total + business.services.length,
        0,
        );

        return {
        businesses: businesses.length,
        products: productCount,
        services: serviceCount,
        };
    }, [businesses]);

    const showNotice = (message: string) => {
        setNotice(message);

        window.setTimeout(() => {
        setNotice(null);
        }, 3200);
    };

    const handleCreateBusiness = (business: BusinessItem) => {
        setBusinesses((current) => [business, ...current]);
        setSelectedBusiness(business);
        showNotice(`${business.name} fue creado correctamente.`);
    };

    const handleUpdateBusiness = (updatedBusiness: BusinessItem) => {
        setBusinesses((current) =>
        current.map((business) =>
            business.id === updatedBusiness.id ? updatedBusiness : business,
        ),
        );

        setSelectedBusiness(updatedBusiness);
    };

    const handleQuickAction = (action: BeeServicesQuickAction) => {
        setActiveAction(action.id);
        showNotice(`${action.label} estará disponible próximamente.`);
    };

    const handleCategory = (category: BeeServicesCategory) => {
        setSelectedCategoryId(category.id);
        showNotice(
        `Explorando la categoría ${category.title}: ${category.subtitle}.`,
        );
    };

    const handleSearch = () => {
        showNotice(
        'La búsqueda asistida por IA se conectará próximamente.',
        );
    };

    const handleVoiceSearch = () => {
        showNotice(
        'La búsqueda por voz se conectará próximamente.',
        );
    };

    const openBusinessManagement = () => {
        if (businesses.length === 0) {
        setCreateModalOpen(true);
        return;
        }

        setSelectedBusiness(businesses[0]);

        window.setTimeout(() => {
        document
            .getElementById('bee-services-businesses')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    };

    return (
        <div className="min-h-full bg-[#FFFCF9] pb-24">
        <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
            <header className="mb-6 flex items-start justify-between">
            <div>
                <div className="flex items-center gap-2">
                <Link
                    href="/app"
                    aria-label="Volver al inicio"
                    className="rounded-full p-1.5 text-[#7865AD] transition-colors hover:bg-[#F6EAFE] hover:text-[#7427D5]"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>

                <h1 className="text-2xl font-extrabold leading-tight text-[#7427D5]">
                    BeeServices
                </h1>
                </div>

                <p className="ml-9 mt-1 text-sm text-[#7865AD]">
                Conecta necesidades con soluciones
                </p>
            </div>

            <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="hidden h-10 items-center gap-2 rounded-full bg-[#7427D5] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#5E1ABF] sm:flex"
            >
                <Plus className="h-4 w-4" />
                Crear negocio
            </button>
            </header>

            <BeeServicesAiSearchCard
            onPressSearch={handleSearch}
            onPressVoice={handleVoiceSearch}
            />

            {notice && (
            <div
                role="status"
                className="mt-4 rounded-xl border border-[#E8D1F1] bg-[#F6EAFE] px-4 py-3 text-sm text-[#5E1ABF]"
            >
                {notice}
            </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="min-w-0 space-y-6">
                <button
                type="button"
                onClick={openBusinessManagement}
                className="flex min-h-[116px] w-full items-center rounded-[20px] border border-[#E8D1F1] bg-[#F6EAFE] p-5 text-left transition-all hover:border-[#CBA0DA] hover:shadow-[0_8px_20px_rgba(116,39,213,0.10)]"
                >
                <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[15px] bg-white shadow-[0_3px_7px_rgba(167,136,178,0.12)]">
                    <Store className="h-6 w-6 text-[#7B2DD9]" />
                </span>

                <span className="ml-4 min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-[#261743]">
                    Gestiona tu negocio
                    </span>

                    <span className="mt-1 block max-w-xl text-xs leading-5 text-[#8A68B5]">
                    Crea tu perfil, agrega servicios y recibe solicitudes.
                    </span>
                </span>

                <span className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7427D5] text-white">
                    <ChevronRight className="h-5 w-5" />
                </span>
                </button>

                <section
                id="bee-services-businesses"
                className="scroll-mt-6 rounded-[20px] border border-[#F0EAF3] bg-white shadow-[0_4px_12px_rgba(42,26,69,0.05)]"
                >
                <div className="flex items-center justify-between border-b border-[#F4EFF6] px-5 py-4">
                    <div>
                    <h2 className="text-base font-bold text-[#261743]">
                        Mis negocios y catálogo
                    </h2>
                    <p className="mt-1 text-xs text-[#8A72B2]">
                        Administra tus productos y servicios publicados.
                    </p>
                    </div>

                    <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-[#7427D5] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#5E1ABF]"
                    >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Crear negocio</span>
                    </button>
                </div>

                <div className="p-4">
                    {businesses.length === 0 ? (
                    <div className="py-12 text-center">
                        <Store className="mx-auto h-12 w-12 text-[#D8AEE5]" />
                        <h3 className="mt-3 text-sm font-semibold text-[#261743]">
                        Aún no tienes negocios
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#8A72B2]">
                        Crea tu primer negocio para publicar productos y
                        servicios.
                        </p>
                    </div>
                    ) : (
                    <div className="divide-y divide-[#F4EFF6]">
                        {businesses.map((business) => {
                        const isSelected =
                            selectedBusiness?.id === business.id;

                        return (
                            <button
                            key={business.id}
                            type="button"
                            onClick={() => setSelectedBusiness(business)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors ${
                                isSelected
                                ? 'bg-[#F6EAFE]'
                                : 'hover:bg-[#FCFAFD]'
                            }`}
                            >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6EAFE] text-xs font-bold text-[#7427D5]">
                                {business.name.slice(0, 2).toUpperCase()}
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-[#261743]">
                                {business.name}
                                </span>

                                <span className="mt-1 block truncate text-xs text-[#8A72B2]">
                                {business.category} ·{' '}
                                {business.products.length} productos ·{' '}
                                {business.services.length} servicios
                                </span>
                            </span>

                            <ChevronRight className="h-5 w-5 shrink-0 text-[#A98BC2]" />
                            </button>
                        );
                        })}
                    </div>
                    )}
                </div>
                </section>

                {selectedBusiness && (
                <section className="overflow-hidden rounded-[20px] border border-[#F0EAF3] bg-white shadow-[0_4px_12px_rgba(42,26,69,0.05)]">
                    <BusinessDetailView
                    business={selectedBusiness}
                    onBack={() => setSelectedBusiness(null)}
                    onUpdateBusiness={handleUpdateBusiness}
                    />
                </section>
                )}
            </main>

            <aside className="space-y-6">
                <section className="rounded-[20px] border border-[#F0EAF3] bg-white p-5 shadow-[0_4px_12px_rgba(42,26,69,0.05)]">
                <h2 className="mb-4 text-base font-bold text-[#261743]">
                    Tu actividad
                </h2>

                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-[#F6EAFE] px-2 py-3 text-center">
                    <span className="block text-lg font-extrabold text-[#7427D5]">
                        {metrics.businesses}
                    </span>
                    <span className="text-[10px] text-[#8A68B5]">
                        Negocios
                    </span>
                    </div>

                    <div className="rounded-xl bg-[#F6EAFE] px-2 py-3 text-center">
                    <span className="block text-lg font-extrabold text-[#7427D5]">
                        {metrics.products}
                    </span>
                    <span className="text-[10px] text-[#8A68B5]">
                        Productos
                    </span>
                    </div>

                    <div className="rounded-xl bg-[#F6EAFE] px-2 py-3 text-center">
                    <span className="block text-lg font-extrabold text-[#7427D5]">
                        {metrics.services}
                    </span>
                    <span className="text-[10px] text-[#8A68B5]">
                        Servicios
                    </span>
                    </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-[#F4EFF6] pt-4 text-xs text-[#594C67]">
                    <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-[#7427D5]" />
                    Los clientes te encuentran vía IA
                    </div>

                    <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-[#7427D5]" />
                    Chat directo con compradores
                    </div>

                    <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#7427D5]" />
                    Visibilidad en la red empresarial
                    </div>
                </div>
                </section>

                <section className="rounded-[20px] border border-[#F0EAF3] bg-white p-5 shadow-[0_4px_12px_rgba(42,26,69,0.05)]">
                <BeeServicesQuickActions
                    activeAction={activeAction}
                    onPressAction={handleQuickAction}
                />
                </section>

                <section className="rounded-[20px] border border-[#F0EAF3] bg-white p-5 shadow-[0_4px_12px_rgba(42,26,69,0.05)]">
                <BeeServicesCategoryGrid
                    selectedCategoryId={selectedCategoryId}
                    onPressCategory={handleCategory}
                />
                </section>
            </aside>
            </div>

            <footer className="flex flex-col items-center py-7">
            <p className="text-[11px] text-[#594C67]">
                Impulsando economías locales con BeeApp AI
            </p>
            <span className="mt-2 h-1 w-9 rounded-full bg-[#D8AEE5]" />
            </footer>
        </div>

        <CreateBusinessModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreate={handleCreateBusiness}
        />
        </div>
    );
}