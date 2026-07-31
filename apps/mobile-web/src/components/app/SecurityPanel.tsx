'use client';

import { useState } from 'react';
import {
  ShieldCheck, Lock, Smartphone, KeyRound, MessageSquare, Mail, Check, Eye, EyeOff,
} from 'lucide-react';

export function SecurityPanel() {
  const [pinActive, setPinActive] = useState(true);
  const [pinRecoveryMethod, setPinRecoveryMethod] = useState<'sms' | 'email'>('sms');
  const [changingPin, setChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) return setMsg('El PIN debe tener exactamente 4 dígitos.');
    if (newPin !== confirmPin) return setMsg('Los PIN ingresados no coinciden.');
    setPinActive(true);
    setChangingPin(false);
    setNewPin('');
    setConfirmPin('');
    setMsg('PIN de 4 dígitos actualizado correctamente.');
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="space-y-6 select-none">
      {/* SECCIÓN 1: BLOQUEO DE APLICACIÓN */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-brand-primary font-semibold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Bloqueo de Aplicación</span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-neutral-900">Bloqueo biométrico o PIN de app</h4>
              <p className="text-[11px] text-neutral-500 font-normal leading-relaxed mt-0.5">
                No disponible en la versión web. Configura el bloqueo de la aplicación desde la app móvil.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: PIN DE ARCHIVOS Y CHATS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-primary font-semibold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>PIN de Archivos y Chats (4 dígitos)</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            pinActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-neutral-100 text-neutral-600'
          }`}>
            {pinActive ? 'PIN Activo' : 'Sin PIN'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-4">
          <p className="text-xs text-neutral-600 font-normal leading-relaxed">
            Protección mediante código PIN de 4 dígitos para carpetas de almacenamiento, notas y chats privados.
          </p>

          {msg && (
            <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-xs font-medium text-brand-primary flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {!changingPin ? (
            <button
              type="button"
              onClick={() => setChangingPin(true)}
              className="w-full h-10 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <KeyRound className="w-4 h-4 text-brand-primary" />
              <span>{pinActive ? 'Cambiar PIN de 4 dígitos' : 'Crear PIN de 4 dígitos'}</span>
            </button>
          ) : (
            <form onSubmit={handleSavePin} className="space-y-3 p-3 bg-white rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900">Configurar nuevo PIN</span>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700">Nuevo PIN (4 dígitos)</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="****"
                    className="w-full h-10 text-center bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-semibold tracking-widest outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700">Confirmar PIN</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="****"
                    className="w-full h-10 text-center bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-semibold tracking-widest outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setChangingPin(false)}
                  className="flex-1 h-9 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newPin.length !== 4 || confirmPin.length !== 4}
                  className="flex-1 h-9 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-50"
                >
                  Guardar PIN
                </button>
              </div>
            </form>
          )}

          {/* Recuperación de PIN */}
          <div className="pt-3 border-t border-neutral-200/60 space-y-2">
            <span className="text-[11px] font-semibold text-neutral-700">Método de recuperación de PIN</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPinRecoveryMethod('sms')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-normal flex items-center justify-center gap-1.5 transition-colors ${
                  pinRecoveryMethod === 'sms'
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold'
                    : 'border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Mensaje SMS</span>
              </button>
              <button
                type="button"
                onClick={() => setPinRecoveryMethod('email')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-normal flex items-center justify-center gap-1.5 transition-colors ${
                  pinRecoveryMethod === 'email'
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold'
                    : 'border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Correo electrónico</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
