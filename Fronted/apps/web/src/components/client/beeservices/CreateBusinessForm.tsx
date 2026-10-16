'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { BusinessItem } from '@/lib/client/myServices';
import { createOwnedBusiness } from '@/lib/client/liveData';

interface CreateBusinessFormProps {
  onCreated?: (business: BusinessItem) => void;
}

export default function CreateBusinessForm({
  onCreated,
}: CreateBusinessFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Diseño & Publicidad');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [offersProducts, setOffersProducts] = useState(true);
  const [offersServices, setOffersServices] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    const draft: BusinessItem = {
      id: `biz-${Date.now()}`,
      name: name.trim(),
      category,
      address: address.trim() || 'Dirección no especificada',
      description: description.trim(),
      offersProducts,
      offersServices,
      deliveryMethods: offersProducts ? ['Domicilio', 'Recoger en local'] : [],
      serviceModalities: offersServices ? ['Virtual', 'Presencial'] : [],
      products: [],
      services: [],
    };

    setIsSaving(true);
    setError('');

    try {
      const saved = await createOwnedBusiness(draft);
      onCreated?.(saved);
      router.push(
        `/app/beeservices?created=1&businessId=${encodeURIComponent(saved.id)}`,
      );
    } catch {
      setError('No fue posible guardar el negocio. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      <div>
        <label className="text-xs font-semibold text-neutral-700">
          Nombre del negocio
        </label>
        <input
          type="text"
          required
          placeholder="Ej. Mi Tienda Digital"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSaving}
          className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-60"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700">
          Categoría
        </label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={isSaving}
          className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-normal text-neutral-800 outline-none transition-colors focus:border-brand-primary disabled:opacity-60"
        >
          <option value="Diseño & Publicidad">Diseño & Publicidad</option>
          <option value="Desarrollo de Software">Desarrollo de Software</option>
          <option value="Consultoría Empresarial">Consultoría Empresarial</option>
          <option value="Comercio & Retail">Comercio & Retail</option>
          <option value="Servicios Profesionales">Servicios Profesionales</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700">
          Dirección o ciudad
        </label>
        <input
          type="text"
          placeholder="Calle 10 # 5-20, Bogotá"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          disabled={isSaving}
          className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-60"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700">
          Descripción del negocio
        </label>
        <textarea
          placeholder="Resume lo que ofrece tu negocio..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSaving}
          className="mt-1 h-24 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:opacity-60"
        />
      </div>

      <div className="space-y-3 border-t border-neutral-100 pt-4">
        <span className="text-xs font-semibold text-neutral-700">
          Tipo de oferta disponible
        </span>

        <label className="flex items-center justify-between gap-3">
          <span className="text-xs font-normal text-neutral-800">
            Ofrece productos físicos/digitales
          </span>
          <input
            type="checkbox"
            checked={offersProducts}
            onChange={(event) => setOffersProducts(event.target.checked)}
            disabled={isSaving}
            className="h-4 w-4 accent-brand-primary"
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-xs font-normal text-neutral-800">
            Ofrece servicios profesionales
          </span>
          <input
            type="checkbox"
            checked={offersServices}
            onChange={(event) => setOffersServices(event.target.checked)}
            disabled={isSaving}
            className="h-4 w-4 accent-brand-primary"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          'Guardar negocio'
        )}
      </button>
    </form>
  );
}
