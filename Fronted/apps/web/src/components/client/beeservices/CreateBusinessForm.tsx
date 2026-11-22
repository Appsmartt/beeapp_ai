'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Check, Loader2, Plus, X } from 'lucide-react';
import {
  createCommercialProfile,
  createOwnedCommercialOffer,
  getCommercialCities,
  getCommercialCountries,
  getPublicCommercialCategories,
  uploadCurrentWebStorageFiles,
} from '@beeapp/api-client';
import type {
  CommercialCategory,
  CommercialModality,
  CommercialOfferType,
  CommercialProfileSocialLink,
} from '@beeapp/shared-types';
import { BusinessItem } from '@/lib/client/myServices';
import { getWebAuth, loadOwnedBusinesses } from '@/lib/client/liveData';

interface CreateBusinessFormProps {
  onCreated?: (business: BusinessItem) => void;
}

const ALL_MODALITIES: Array<{ value: CommercialModality; label: string }> = [
  { value: 'at_establishment', label: 'En establecimiento' },
  { value: 'in_person', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'home_visit', label: 'Visita a domicilio' },
  { value: 'delivery', label: 'Entrega a domicilio' },
  { value: 'pickup', label: 'Recoger en negocio' },
  { value: 'phone_call', label: 'Llamada telefónica' },
  { value: 'buddy_chat', label: 'Chat Buddy' },
];

export default function CreateBusinessForm({
  onCreated,
}: CreateBusinessFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [offerType, setOfferType] = useState<CommercialOfferType>('mixed');
  const [countryCode, setCountryCode] = useState('CO');
  const [city, setCity] = useState('Bogotá');
  const [customCity, setCustomCity] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [locationReference, setLocationReference] = useState('');
  const [isAddressPublic, setIsAddressPublic] = useState(true);

  const [phoneDialCode, setPhoneDialCode] = useState('+57');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhonePublic, setIsPhonePublic] = useState(true);
  const [publicEmail, setPublicEmail] = useState('');
  const [isEmailPublic, setIsEmailPublic] = useState(true);

  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Logo upload
  const [logoFileId, setLogoFileId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Categories (up to 5)
  const [availableCategories, setAvailableCategories] = useState<CommercialCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newCategoryNames, setNewCategoryNames] = useState<string[]>([]);
  const [customActivityText, setCustomActivityText] = useState('');

  // Modalities
  const [modalities, setModalities] = useState<CommercialModality[]>([
    'delivery',
    'pickup',
    'buddy_chat',
  ]);

  // Optional first offer
  const [createInitialOffer, setCreateInitialOffer] = useState(true);
  const [initialOfferTitle, setInitialOfferTitle] = useState('');
  const [initialOfferPrice, setInitialOfferPrice] = useState('');
  const [initialOfferKind, setInitialOfferKind] = useState<'product' | 'service'>('product');

  const [countries, setCountries] = useState<string[]>(['CO']);
  const [cities, setCities] = useState<string[]>(['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Montería']);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then((auth) => getCommercialCountries(auth))
      .then((res) => {
        if (!active) return;
        const list = (res.countries || []).map((c) => c.country_code);
        if (list.length > 0) {
          setCountries(list);
          if (!list.includes('CO')) setCountryCode(list[0]);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!countryCode) return undefined;
    let active = true;
    getWebAuth()
      .then((auth) => getCommercialCities(auth, countryCode))
      .then((res) => {
        if (!active) return;
        const list = (res.cities || []).map((c) => c.city);
        if (list.length > 0) {
          setCities(list);
          setCity((curr) => (list.includes(curr) ? curr : list[0]));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [countryCode]);

  useEffect(() => {
    let active = true;
    getWebAuth()
      .then((auth) =>
        getPublicCommercialCategories(auth, {
          offer_type: offerType,
          limit: 60,
        }),
      )
      .then((res) => {
        if (active) setAvailableCategories(res.categories || []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [offerType]);

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('files', file);
      const uploaded = await uploadCurrentWebStorageFiles(formData);
      const first = uploaded.files?.[0];
      if (!first?.id) throw new Error('No fue posible subir el logo.');
      setLogoFileId(first.id);
      setLogoPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible subir el logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(catId)) return prev.filter((id) => id !== catId);
      if (prev.length + newCategoryNames.length >= 5) return prev;
      return [...prev, catId];
    });
  };

  const addCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (selectedCategoryIds.length + newCategoryNames.length >= 5) return;
    if (!newCategoryNames.includes(trimmed)) {
      setNewCategoryNames((prev) => [...prev, trimmed]);
    }
    setNewCategoryInput('');
  };

  const toggleModality = (mod: CommercialModality) => {
    setModalities((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const resolvedCity = customCity.trim() || city.trim();
    if (!name.trim() || !resolvedCity) {
      setError('Ingresa el nombre y la ciudad del negocio.');
      return;
    }
    if (modalities.length === 0) {
      setError('Selecciona al menos una modalidad de atención.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const auth = await getWebAuth();
      const socialLinks: CommercialProfileSocialLink[] = [];
      if (instagramUrl.trim()) {
        socialLinks.push({ platform: 'instagram', url: instagramUrl.trim() });
      }
      if (websiteUrl.trim()) {
        socialLinks.push({ platform: 'website', url: websiteUrl.trim() });
      }

      const created = await createCommercialProfile(auth, {
        offer_type: offerType,
        display_name: name.trim(),
        description: description.trim() || name.trim(),
        country_code: countryCode || 'CO',
        city: resolvedCity,
        address: address.trim() || null,
        neighborhood: neighborhood.trim() || null,
        location_reference: locationReference.trim() || null,
        is_address_public: isAddressPublic,
        phone_dial_code: phoneNumber.trim() ? phoneDialCode.trim() : null,
        phone_number: phoneNumber.trim() || null,
        is_phone_public: isPhonePublic,
        public_email: publicEmail.trim() || null,
        is_email_public: isEmailPublic,
        logo_file_id: logoFileId,
        category_ids: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        new_category_names: newCategoryNames.length > 0 ? newCategoryNames : undefined,
        custom_activity_text:
          customActivityText.trim()
          || newCategoryNames[0]
          || availableCategories.find((c) => c.id === selectedCategoryIds[0])?.name
          || null,
        modalities,
        social_links: socialLinks.length > 0 ? socialLinks : undefined,
      });

      const businessId = created.profile.id;

      if (createInitialOffer && initialOfferTitle.trim()) {
        await createOwnedCommercialOffer(auth, businessId, {
          offer_kind: initialOfferKind,
          title: initialOfferTitle.trim(),
          pricing_strategy: initialOfferPrice.trim() ? 'fixed' : 'to_be_confirmed',
          base_price_amount: initialOfferPrice.trim() ? Number(initialOfferPrice) : null,
          modalities,
          status: 'published',
        }).catch(() => null);
      }

      const all = await loadOwnedBusinesses().catch(() => [] as BusinessItem[]);
      const saved = all.find((item) => item.id === businessId);
      if (saved) onCreated?.(saved);

      router.push(`/app/beeservices?created=1&businessId=${encodeURIComponent(businessId)}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible guardar el negocio. Inténtalo de nuevo.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {/* Logo uploader */}
      <div className="flex items-center gap-4">
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleLogoChange(e)}
        />
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          disabled={uploadingLogo || isSaving}
          className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-brand-primary"
        >
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
          ) : uploadingLogo ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </button>
        <div className="text-xs">
          <p className="font-semibold text-neutral-800">Logo del negocio (opcional)</p>
          <p className="text-neutral-500">Haz clic para subir una imagen cuadrada.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-neutral-700">Nombre del negocio *</label>
          <input
            type="text"
            required
            placeholder="Ej. Mi Tienda Digital"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSaving}
            className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-900 outline-none focus:border-brand-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700">Tipo de oferta *</label>
          <select
            value={offerType}
            onChange={(e) => setOfferType(e.target.value as CommercialOfferType)}
            disabled={isSaving}
            className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-800 outline-none focus:border-brand-primary"
          >
            <option value="mixed">Productos y servicios</option>
            <option value="products">Solo productos</option>
            <option value="services">Solo servicios</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700">Descripción del negocio *</label>
        <textarea
          required
          placeholder="Resume lo que ofrece tu negocio..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSaving}
          className="mt-1 h-20 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-900 outline-none focus:border-brand-primary"
        />
      </div>

      {/* Categories up to 5 */}
      <div className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-700">
            Categorías (máximo 5)
          </label>
          <span className="text-[11px] font-semibold text-brand-primary">
            {selectedCategoryIds.length + newCategoryNames.length}/5
          </span>
        </div>

        {availableCategories.length > 0 ? (
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {availableCategories.map((cat) => {
              const active = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-brand-primary text-white'
                      : 'border border-neutral-200 bg-white text-neutral-700 hover:border-brand-primary'
                  }`}
                >
                  {active ? <Check className="h-3 w-3" /> : null}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            placeholder="Agregar nueva categoría o actividad..."
            className="h-9 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-brand-primary"
          />
          <button
            type="button"
            onClick={addCustomCategory}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-brand-primary px-3 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        </div>

        {newCategoryNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {newCategoryNames.map((catName) => (
              <span
                key={catName}
                className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary"
              >
                <span>{catName}</span>
                <button
                  type="button"
                  onClick={() =>
                    setNewCategoryNames((prev) => prev.filter((item) => item !== catName))
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <input
          type="text"
          value={customActivityText}
          onChange={(e) => setCustomActivityText(e.target.value)}
          placeholder="Actividad principal visible (ej. Cafetería de especialidad)"
          className="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-brand-primary"
        />
      </div>

      {/* Location */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-neutral-700">País *</label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700">Ciudad *</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700">Otra ciudad (opcional)</label>
          <input
            type="text"
            value={customCity}
            onChange={(e) => setCustomCity(e.target.value)}
            placeholder="Escribir ciudad..."
            className="mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-neutral-700">Dirección</label>
          <input
            type="text"
            placeholder="Calle 10 # 5-20"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-700">Barrio</label>
          <input
            type="text"
            placeholder="Ej. El Poblado"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-700">Referencia de ubicación</label>
          <input
            type="text"
            placeholder="Ej. Local 204, frente al parque"
            value={locationReference}
            onChange={(e) => setLocationReference(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Contact & Privacy */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-neutral-700">Teléfono público</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={phoneDialCode}
              onChange={(e) => setPhoneDialCode(e.target.value)}
              className="h-10 w-20 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 text-xs outline-none focus:border-brand-primary"
            />
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="3001234567"
              className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700">Correo público</label>
          <input
            type="email"
            value={publicEmail}
            onChange={(e) => setPublicEmail(e.target.value)}
            placeholder="contacto@minegocio.com"
            className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-neutral-700">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAddressPublic}
            onChange={(e) => setIsAddressPublic(e.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
          <span>Mostrar dirección públicamente</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPhonePublic}
            onChange={(e) => setIsPhonePublic(e.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
          <span>Mostrar teléfono públicamente</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isEmailPublic}
            onChange={(e) => setIsEmailPublic(e.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
          <span>Mostrar correo públicamente</span>
        </label>
      </div>

      {/* 8 Modalities */}
      <div className="space-y-2 border-t border-neutral-100 pt-3">
        <label className="text-xs font-semibold text-neutral-700">
          Modalidades de atención *
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_MODALITIES.map((item) => {
            const active = modalities.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => toggleModality(item.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-brand-primary text-white'
                    : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-brand-primary'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Social Links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-neutral-700">Instagram (opcional)</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/minegocio"
            className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-700">Sitio web (opcional)</label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://minegocio.com"
            className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Guided Initial Offer */}
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
        <label className="flex items-center justify-between gap-2 text-xs font-semibold text-neutral-800">
          <span>Crear primera oferta al finalizar (opcional)</span>
          <input
            type="checkbox"
            checked={createInitialOffer}
            onChange={(e) => setCreateInitialOffer(e.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
        </label>

        {createInitialOffer ? (
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-neutral-600">
                Primera oferta (opcional)
              </label>
              <input
                type="text"
                value={initialOfferTitle}
                onChange={(e) => setInitialOfferTitle(e.target.value)}
                placeholder="Ej. Café Americano"
                className="mt-1 h-9 w-full rounded-xl border border-neutral-200 bg-white px-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-0 flex-1">
                <label className="text-[11px] font-semibold text-neutral-600">
                  Precio (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={initialOfferPrice}
                  onChange={(e) => setInitialOfferPrice(e.target.value)}
                  placeholder="15000"
                  className="mt-1 h-9 w-full rounded-xl border border-neutral-200 bg-white px-2.5 text-xs outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600">Tipo</label>
                <select
                  value={initialOfferKind}
                  onChange={(e) => setInitialOfferKind(e.target.value as 'product' | 'service')}
                  className="mt-1 h-9 rounded-xl border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-brand-primary"
                >
                  <option value="product">Producto</option>
                  <option value="service">Servicio</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSaving || uploadingLogo}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando negocio...
          </>
        ) : (
          'Crear negocio'
        )}
      </button>
    </form>
  );
}
