'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Fingerprint, ScanFace, KeyRound, Mail, MessageSquare } from 'lucide-react';

export default function SecurityPage() {
  const [appLockMethod, setAppLockMethod] = useState<'fingerprint' | 'face' | 'pin'>('pin');
  const [pinRecoveryMethod, setPinRecoveryMethod] = useState<'sms' | 'email'>('sms');

  return (
    <div className="bg-white min-h-full flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <Link href="/app" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-base text-neutral-900 ml-2">Seguridad & PIN</h1>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        
        {/* SECTION 1: BLOQUEO DE APP */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand-primary font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Bloqueo de Aplicación</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <p className="text-xs text-neutral-600 font-normal">
              Método de desbloqueo al abrir BeeApp AI:
            </p>

            <div className="space-y-2">
              {[
                { id: 'pin', label: 'Código PIN de 6 dígitos', icon: KeyRound },
                { id: 'fingerprint', label: 'Huella Dactilar', icon: Fingerprint },
                { id: 'face', label: 'Face ID / Reconocimiento Facial', icon: ScanFace },
              ].map((m) => {
                const IconComp = m.icon;
                const active = appLockMethod === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setAppLockMethod(m.id as 'pin' | 'fingerprint' | 'face')}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      active ? 'border-brand-primary bg-brand-primary/5' : 'border-neutral-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp className="w-4 h-4 text-brand-primary" />
                      <span className="text-xs font-semibold text-neutral-800">{m.label}</span>
                    </div>
                    <input type="radio" checked={active} onChange={() => {}} className="accent-brand-primary" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: PIN DE ARCHIVOS Y CHATS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand-primary font-semibold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>PIN de Archivos y Chats (4 dígitos)</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <p className="text-xs text-neutral-600 font-normal">
              Protección adicional para carpetas, notas y conversaciones privadas.
            </p>

            <button className="w-full h-10 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-100">
              Cambiar PIN de 4 dígitos
            </button>

            <div className="pt-2 border-t border-neutral-200/60 space-y-2">
              <span className="text-[11px] font-semibold text-neutral-700">Método de recuperación de PIN</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPinRecoveryMethod('sms')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 ${
                    pinRecoveryMethod === 'sms' ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> SMS
                </button>
                <button
                  type="button"
                  onClick={() => setPinRecoveryMethod('email')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 ${
                    pinRecoveryMethod === 'email' ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Correo
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
