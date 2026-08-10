'use client';

import { useState } from 'react';
import {
  Check, Sparkles, Database, ShieldCheck, BadgeCheck, Store, Search, MessageCircle, Clock,
} from 'lucide-react';

const BENEFITS = [
  'Asistente de IA por Voz y Texto ilimitado',
  '15 GB de Almacenamiento Cifrado de archivos',
  'Gestión de múltiples negocios en BeeServices',
  'Sincronización automática multidispositivo',
  'Canales y chats grupales sin límites',
];

const VERIFY_BENEFITS = [
  { icon: ShieldCheck, title: 'Identidad confirmada', desc: 'La insignia azul aparece junto a tu nombre en chats, contactos y estados.' },
  { icon: Store, title: 'Más confianza al vender', desc: 'Los clientes ven que tu negocio fue revisado por el equipo de BeeApp.' },
  { icon: Search, title: 'Mejor posición en la red', desc: 'Las cuentas verificadas se destacan en los resultados de búsqueda.' },
  { icon: MessageCircle, title: 'Menos suplantación', desc: 'La insignia distingue tu cuenta real de cualquier intento de imitación.' },
];

const REQUIREMENTS = [
  { text: 'Perfil completo: nombre, ocupación y foto de perfil', done: true },
  { text: 'Número de celular verificado por SMS', done: true },
  { text: 'Datos de empresa registrados (nombre y actividad)', done: true },
  { text: 'Documento de identidad o RUT de la empresa', done: false },
  { text: 'Al menos 30 días de actividad en BeeApp', done: false },
];

export function SubscriptionPanel() {
  const [subStatus, setSubStatus] = useState<'free' | 'plus'>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [verifyRequested, setVerifyRequested] = useState(false);

  const pendingReqs = REQUIREMENTS.filter((r) => !r.done).length;

  return (
    <div className="space-y-6 select-none">
      {/* SECCIÓN 1: MI PLAN ACTUAL */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Mi Plan Actual
        </span>

        {subStatus === 'free' ? (
          <div className="p-5 rounded-3xl bg-neutral-900 text-white space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Plan Activo: BeeApp Gratis
                </span>
              </div>
              <span className="text-[10px] font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700">
                Básico
              </span>
            </div>

            <p className="text-xs text-neutral-400 font-normal leading-relaxed">
              Tu plan actual es gratuito. Tienes funciones de organización básicas con límites de almacenamiento.
            </p>

            {/* Storage Usage Bar */}
            <div className="p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Database className="w-4 h-4 text-brand-primary" />
                  <span className="font-semibold">Almacenamiento</span>
                </div>
                <span className="text-neutral-400 font-normal">8.2 GB de 15 GB (55%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-700 overflow-hidden">
                <div className="h-full bg-brand-primary rounded-full" style={{ width: '55%' }} />
              </div>
            </div>

            {/* Cycle Selector */}
            <div className="flex bg-neutral-800 p-1 rounded-xl text-xs font-normal">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  billingCycle === 'monthly' ? 'bg-brand-primary text-white font-semibold' : 'text-neutral-400'
                }`}
              >
                Mensual ($9.99/mes)
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  billingCycle === 'yearly' ? 'bg-brand-primary text-white font-semibold' : 'text-neutral-400'
                }`}
              >
                Anual ($7.99/mes)
              </button>
            </div>

            {/* Beneficios list */}
            <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs text-neutral-300">
              {BENEFITS.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSubStatus('plus')}
              className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-brand-dark transition-colors shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Mejorar a BeeApp Plus</span>
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-3xl bg-neutral-900 text-white space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Plan Actual</span>
              <span className="text-[10px] font-bold bg-brand-primary text-white px-2.5 py-0.5 rounded-full">Activo</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">BeeApp Plus</h3>
              <p className="text-xs text-neutral-400 font-normal mt-0.5">
                {billingCycle === 'monthly' ? '$9.99 USD / mes' : '$7.99 USD / mes (facturado anual)'} • Renueva el 24 de Agosto de 2026
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubStatus('free')}
              className="w-full h-9 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-normal hover:bg-neutral-700 transition-colors"
            >
              Cambiar o cancelar suscripción
            </button>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: BEE VERIFY */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Verificación Comercial
        </span>

        <div className="p-5 rounded-3xl bg-brand-primary/5 border border-brand-primary/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-neutral-900">Bee Verify (Insignia Azul)</h4>
              <p className="text-[11px] text-neutral-500 font-normal">Insignia oficial de verificación para cuentas y empresas.</p>
            </div>
          </div>

          {/* Account Preview */}
          <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 space-y-2">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Vista previa de tu cuenta</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white font-bold text-sm flex items-center justify-center">
                SV
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900">
                  <span>Santiago Valencia</span>
                  <BadgeCheck className="w-4 h-4 text-brand-primary shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Verify Benefits */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {VERIFY_BENEFITS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="p-2.5 bg-white rounded-xl border border-neutral-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-brand-primary font-semibold text-[11px]">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-normal leading-tight">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Requirements Check List */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-neutral-700">Requisitos para solicitar:</span>
            <div className="space-y-1.5">
              {REQUIREMENTS.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-normal text-neutral-700">
                  {r.done ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className={r.done ? 'text-neutral-800' : 'text-neutral-500'}>{r.text}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setVerifyRequested(true);
              alert('Solicitud de Bee Verify enviada con éxito. El equipo revisará tus documentos en 24-48 horas.');
            }}
            disabled={verifyRequested}
            className={`w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs ${
              verifyRequested
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-brand-primary text-white hover:bg-brand-dark'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{verifyRequested ? 'Solicitud en revisión' : `Solicitar verificación (${pendingReqs} pendientes)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
