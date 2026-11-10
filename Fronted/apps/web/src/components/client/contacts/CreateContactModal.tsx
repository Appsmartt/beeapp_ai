'use client';

import { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import CountrySelector, { type Country } from '@/components/auth/CountrySelector';
import { loadRegistrationCountries } from '@/lib/client/publicAppSettings';
import { createMyContact } from '@beeapp/api-client';
import { contactColor, contactInitials, ContactItem } from '@/lib/client/contacts';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (contact: ContactItem) => void;
}

const fieldClass =
  'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15';

export default function CreateContactModal({
  isOpen,
  onClose,
  onCreate,
}: CreateContactModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadRegistrationCountries().then((list) => {
      setCountries(list);
      setCountry((current) => current ?? list[0] ?? null);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !country || saving) return;

    const fullName = `${firstName} ${lastName}`.trim();
    setSaving(true);

    void createMyContact({
      displayName: fullName,
      phone: `${country.dialCode} ${phone}`.trim(),
      email: email.trim(),
      notes: [role.trim(), company.trim()].filter(Boolean).join(' · '),
    })
      .then((saved) => {
        onCreate({
          id: saved.id,
          name: saved.display_name,
          profession: role.trim(),
          company: company.trim() || undefined,
          phone: saved.phone || '',
          email: saved.email || '',
          activity: company.trim(),
          interests: [],
          initials: contactInitials(saved.display_name),
          color: contactColor(saved.id),
          linkedUserId: saved.linked_user_id,
        });
        onClose();
      })
      .catch(() => undefined)
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-contact-title"
        className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <UserPlus className="h-4 w-4" />
            </span>
            <h2
              id="create-contact-title"
              className="text-base font-semibold text-neutral-900"
            >
              Nuevo contacto
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          id="create-contact-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">
                Nombre *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">
                Apellido
              </label>
              <input
                type="text"
                placeholder="Apellido"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700">
              Teléfono
            </label>

            <div className="flex h-11 items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15">
              <CountrySelector
                countries={countries}
                selectedCountry={country}
                onSelectCountry={setCountry}
                variant="inline"
              />

              <div className="w-px shrink-0 self-stretch bg-neutral-200" />

              <input
                type="tel"
                placeholder="300 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">
                Empresa
              </label>
              <input
                type="text"
                placeholder="Empresa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">
                Cargo
              </label>
              <input
                type="text"
                placeholder="Cargo"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </form>

        <footer className="flex shrink-0 gap-3 border-t border-neutral-100 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 flex-1 rounded-full border border-neutral-200 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="create-contact-form"
            disabled={!firstName.trim() || !country || saving}
            className="h-11 flex-1 rounded-full bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </footer>
      </div>
    </div>
  );
}
