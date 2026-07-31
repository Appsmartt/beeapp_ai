'use client';

import { useState, FormEvent, useMemo } from 'react';
import { Camera, UserCheck, Mail, Check, AlertCircle } from 'lucide-react';
import { CURRENT_USER } from '@/mocks/currentUser';
import CountrySelector, { COUNTRIES, Country } from '@/components/auth/CountrySelector';

export function EditProfilePanel() {
  const [name, setName] = useState(CURRENT_USER.name);
  const [email, setEmail] = useState(CURRENT_USER.email);
  const [phone, setPhone] = useState('300 123 4567');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [saved, setSaved] = useState(false);

  // Email format validation (requires @ and .)
  const isEmailValid = useMemo(() => {
    if (!email.trim()) return false;
    return email.includes('@') && email.includes('.');
  }, [email]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!isEmailValid) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 select-none">
      {/* Avatar Section */}
      <div className="flex flex-col items-center space-y-2">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-brand-primary text-white font-bold text-xl flex items-center justify-center shadow-md">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={() => alert('Selector de foto de perfil (simulado)')}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-sm hover:bg-neutral-800 transition-colors"
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

      {/* Datos Personales */}
      <div className="space-y-4">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Datos Personales
        </span>

        {/* Nombre completo */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">Nombre completo *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ingresa tu nombre completo..."
            className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary transition-colors"
          />
        </div>

        {/* Correo electrónico con validación visual */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">Correo electrónico *</label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className={`w-full h-11 pl-10 pr-3.5 bg-neutral-50 border rounded-xl text-xs font-normal text-neutral-900 outline-none transition-colors ${
                !isEmailValid && email.length > 0
                  ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                  : 'border-neutral-200 focus:border-brand-primary'
              }`}
            />
          </div>
          {!isEmailValid && email.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-red-500 font-normal mt-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Ingresa un correo electrónico válido (ejemplo@dominio.com)</span>
            </div>
          )}
        </div>

        {/* Teléfono con selector de indicativo de país */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">Número de Teléfono *</label>
          <div className="flex items-center">
            <CountrySelector selectedCountry={country} onSelectCountry={setCountry} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="300 000 0000"
              className="flex-1 h-12 px-3.5 bg-white border border-l-0 border-neutral-300 rounded-r-xl text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setName(CURRENT_USER.name);
            setEmail(CURRENT_USER.email);
            setPhone('300 123 4567');
          }}
          className="flex-1 h-11 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          Descartar
        </button>
        <button
          type="submit"
          disabled={!name.trim() || !isEmailValid}
          className="flex-1 h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              <span>Cambios guardados</span>
            </>
          ) : (
            <span>Guardar Cambios</span>
          )}
        </button>
      </div>
    </form>
  );
}
