'use client';

import Link from 'next/link';
import { Smartphone } from 'lucide-react';
import BeeAppLogo from '@/components/BeeAppLogo';

export default function MobileBlockScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="mb-6">
        <BeeAppLogo />
      </div>

      <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-6">
        <Smartphone className="w-12 h-12 text-neutral-400" />
      </div>

      <h1 className="font-semibold text-lg text-neutral-900 mb-2">
        BeeApp Web no está disponible en este formato
      </h1>

      <p className="font-normal text-xs text-neutral-500 max-w-[300px] mb-8 leading-relaxed">
        Para la mejor experiencia en tu celular, descarga nuestra aplicación o accede desde tu computador o tablet.
      </p>

      <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            alert('Enlace de descarga de BeeApp App Móvil (Mock)');
          }}
          className="w-full py-3 rounded-full bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm text-center"
        >
          Descargar la app
        </a>

        <Link
          href="/"
          className="text-xs font-semibold text-brand-primary hover:underline py-1"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
