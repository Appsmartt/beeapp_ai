'use client';

import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import CountrySelector, { COUNTRIES, Country } from '@/components/auth/CountrySelector';
import { ContactItem } from '@/mocks/contacts';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (contact: ContactItem) => void;
}

export default function CreateContactModal({ isOpen, onClose, onCreate }: CreateContactModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    const fullName = `${firstName} ${lastName}`.trim();
    const initials = fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

    const newC: ContactItem = {
      id: `ct-${Date.now()}`,
      name: fullName,
      profession: role.trim() || 'Sin cargo',
      company: company.trim() || undefined,
      phone: `${country.dialCode} ${phone}`,
      email: email.trim(),
      activity: company.trim() || 'Contacto personal',
      interests: [],
      initials,
      color: '#F3E8FF',
      verified: false,
      category: 'my_contacts',
    };

    onCreate(newC);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-sm text-neutral-900">Nuevo Contacto</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-neutral-700">Nombre</label>
              <input
                type="text"
                required
                placeholder="Nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-700">Apellido</label>
              <input
                type="text"
                placeholder="Apellido"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Teléfono</label>
            <div className="flex items-center">
              <CountrySelector selectedCountry={country} onSelectCountry={setCountry} />
              <input
                type="tel"
                placeholder="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 h-12 px-3 bg-white border border-l-0 border-neutral-300 rounded-r-xl text-xs outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-700">Correo electrónico</label>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-neutral-700">Empresa</label>
              <input
                type="text"
                placeholder="Empresa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-700">Cargo</label>
              <input
                type="text"
                placeholder="Cargo"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!firstName.trim()}
              className="flex-1 h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
