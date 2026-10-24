'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Lock, Smartphone, KeyRound, Check, Eye, EyeOff, Loader2,
} from 'lucide-react';
import {
  configureAccountSecurityPin,
  getAccountSecurityPinStatus,
  listProtectedChats,
  replaceAccountSecurityPin,
} from '@beeapp/api-client';
import { getWebAuth } from '@/lib/client/liveData';

export function SecurityPanel() {
  const [loading, setLoading] = useState(true);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [protectedCount, setProtectedCount] = useState(0);
  const [changingPin, setChangingPin] = useState(false);
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const [status, protectedChats] = await Promise.all([
        getAccountSecurityPinStatus(auth),
        listProtectedChats(auth).catch(() => ({ conversation_ids: [] as string[] })),
      ]);
      setPinConfigured(Boolean(status.configured));
      setProtectedCount(protectedChats.conversation_ids?.length ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la seguridad.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSavePin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPin.length !== 4) {
      setError('El PIN debe tener exactamente 4 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Los PIN ingresados no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      const auth = await getWebAuth();
      if (pinConfigured) {
        if (!password.trim()) {
          setError('Ingresa tu contraseña para cambiar el PIN.');
          return;
        }
        await replaceAccountSecurityPin(auth, password, newPin);
      } else {
        await configureAccountSecurityPin(auth, newPin);
      }
      setPinConfigured(true);
      setChangingPin(false);
      setPassword('');
      setNewPin('');
      setConfirmPin('');
      setMsg('PIN de cuenta actualizado correctamente.');
      window.setTimeout(() => setMsg(null), 3000);
      await loadStatus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar el PIN.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-xs text-neutral-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando seguridad…
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
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
              <h4 className="font-semibold text-xs text-neutral-900">Biometría en app móvil</h4>
              <p className="text-[11px] text-neutral-500 font-normal leading-relaxed mt-0.5">
                El bloqueo biométrico del dispositivo se configura desde la app móvil. En web proteges cuenta, chats y archivos con PIN.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-primary font-semibold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>PIN de cuenta (4 dígitos)</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            pinConfigured ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-neutral-100 text-neutral-600'
          }`}>
            {pinConfigured ? 'PIN activo' : 'Sin PIN'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-4">
          <p className="text-xs text-neutral-600 font-normal leading-relaxed">
            Protege chats sensibles, notas y acciones de almacenamiento. Chats protegidos: {protectedCount}.
          </p>

          {msg ? (
            <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-xs font-medium text-brand-primary flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{msg}</span>
            </div>
          ) : null}
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : null}

          {!changingPin ? (
            <button
              type="button"
              onClick={() => setChangingPin(true)}
              className="w-full h-10 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <KeyRound className="w-4 h-4 text-brand-primary" />
              <span>{pinConfigured ? 'Cambiar PIN de cuenta' : 'Crear PIN de cuenta'}</span>
            </button>
          ) : (
            <form onSubmit={(e) => void handleSavePin(e)} className="space-y-3 p-3 bg-white rounded-xl border border-neutral-200">
              {pinConfigured ? (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-700">Contraseña actual</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:border-brand-primary"
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900">Nuevo PIN</span>
                <button type="button" onClick={() => setShowPin(!showPin)} className="text-neutral-400 hover:text-neutral-700">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full h-10 text-center bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-semibold tracking-widest outline-none focus:border-brand-primary"
                />
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full h-10 text-center bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-semibold tracking-widest outline-none focus:border-brand-primary"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setChangingPin(false)} className="flex-1 h-9 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="flex-1 h-9 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-50">
                  {submitting ? 'Guardando…' : 'Guardar PIN'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
