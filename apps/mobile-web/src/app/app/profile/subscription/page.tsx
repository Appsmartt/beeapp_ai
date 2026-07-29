'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Check } from 'lucide-react';

export default function SubscriptionPage() {
  return (
    <div className="bg-white min-h-full flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <Link href="/app" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-base text-neutral-900 ml-2">Suscripción & Verificación</h1>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        
        {/* Active Plan Card */}
        <div className="p-5 rounded-3xl bg-neutral-900 text-white space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Plan Actual</span>
            <span className="text-[10px] font-bold bg-brand-primary text-white px-2 py-0.5 rounded-full">Activo</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold">BeeApp Pro</h2>
            <p className="text-xs text-neutral-400 font-normal">$29.99 / mes • Renueva el 24 de Agosto de 2026</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-brand-primary" />
              <span>Asistente de IA por Voz y Texto ilimitado</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-brand-primary" />
              <span>15 GB de Almacenamiento Cifrado</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-brand-primary" />
              <span>Gestión de múltiples negocios en BeeServices</span>
            </div>
          </div>
        </div>

        {/* Bee Verify Card */}
        <div className="p-5 rounded-3xl bg-brand-primary/5 border border-brand-primary/20 space-y-3">
          <div className="flex items-center gap-2 text-brand-primary">
            <ShieldCheck className="w-6 h-6" />
            <h3 className="font-bold text-sm text-neutral-900">Bee Verify (Insignia Azul)</h3>
          </div>
          <p className="text-xs text-neutral-600 font-normal leading-relaxed">
            Verifica la identidad comercial de tu negocio para mostrar la insignia azul en chats, estados y catálogo de servicios.
          </p>
          <button className="w-full h-10 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors">
            Solicitar verificación
          </button>
        </div>

      </div>
    </div>
  );
}
