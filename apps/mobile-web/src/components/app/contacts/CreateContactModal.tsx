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

    const newC: ContactItem = {
      id: `ct-${Date.now()}`,
      name: `${firstName} ${lastName}`.trim(),
      role: role || 'Contacto',
      company: company || 'Independiente',
      phone: `${country.dialCode} ${phone}`,
      email,
      verified: false,
      category: 'my_contacts',
    };

    onCreate(newC);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-primary" />
            <h2 className="font-semibold text-sm text-neutral-900">Nuevo Contacto</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
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
                placeholder="Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-700">Apellido</label>
              <input
                type="text"
                placeholder="Pérez"
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
                placeholder="300 123 4567"
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
              placeholder="juan@empresa.com"
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
                placeholder="TechCorp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-700">Cargo</label>
              <input
                type="text"
                placeholder="Director"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm mt-3"
          >
            Guardar contacto
          </button>
        </form>

      </div>
    </div>
  );
}
