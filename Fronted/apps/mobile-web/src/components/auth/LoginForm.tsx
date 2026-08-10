'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, ArrowLeft } from 'lucide-react';
import CountrySelector, { COUNTRIES, Country } from './CountrySelector';

export default function LoginForm() {
  const router = useRouter();
  const [country, setCountry] = useState<Country>(COUNTRIES[0]); // Colombia by default
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    // Navigate to verification page
    router.push('/verify');
  };

  return (
    <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl sm:border sm:border-neutral-200/80 sm:shadow-xl space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary mb-1">
          <Bot className="w-7 h-7" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
          Inicia sesión
        </h1>
        <p className="text-sm text-neutral-600 font-normal max-w-xs">
          Ingresa tu número de teléfono para continuar
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-700">
            Número de teléfono
          </label>
          <div className="flex items-center">
            <CountrySelector
              selectedCountry={country}
              onSelectCountry={setCountry}
            />
            <input
              type="tel"
              required
              placeholder="300 123 4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 h-12 px-4 bg-white border border-l-0 border-neutral-300 rounded-r-xl text-neutral-900 text-sm font-normal outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-dark transition-colors shadow-md flex items-center justify-center"
        >
          Continuar
        </button>
      </form>

      {/* Terms & Footer Links */}
      <div className="text-center space-y-4 pt-2">
        <p className="text-xs text-neutral-500 font-normal leading-relaxed">
          Al continuar aceptas nuestros{' '}
          <a href="#" className="text-brand-primary underline hover:text-brand-dark">
            Términos y Condiciones
          </a>{' '}
          y{' '}
          <a href="#" className="text-brand-primary underline hover:text-brand-dark">
            Política de Privacidad
          </a>.
        </p>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-normal transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al inicio</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
