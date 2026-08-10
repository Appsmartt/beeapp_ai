'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Camera, UserCheck } from 'lucide-react';
import { CURRENT_USER } from '@/mocks/currentUser';
import CountrySelector, { COUNTRIES, Country } from '@/components/auth/CountrySelector';

export default function EditProfilePage() {
  const [name, setName] = useState(CURRENT_USER.name);
  const [email, setEmail] = useState(CURRENT_USER.email);
  const [phone, setPhone] = useState('300 123 4567');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white min-h-full flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/app" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-base text-neutral-900">Editar Perfil</h1>
        </div>

        <button
          onClick={handleSubmit}
          className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1 hover:bg-brand-dark transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>{saved ? 'Guardado' : 'Guardar'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6 flex-1 overflow-y-auto">
        {/* Photo Avatar */}
        <div className="flex flex-col items-center space-y-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-brand-primary text-white font-bold text-xl flex items-center justify-center shadow-md">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-sm"
              title="Cambiar foto"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-brand-primary font-semibold">
            <UserCheck className="w-4 h-4" />
            <span>Cuenta Verificada</span>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-700">Nombre completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-normal outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-normal outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700">Teléfono</label>
            <div className="flex items-center">
              <CountrySelector selectedCountry={country} onSelectCountry={setCountry} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 h-12 px-3 bg-white border border-l-0 border-neutral-300 rounded-r-xl text-xs font-normal outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
