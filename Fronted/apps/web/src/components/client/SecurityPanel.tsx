'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  configureAccountSecurityPin,
  getAccountSecurityPinStatus,
  listProtectedChats,
  replaceAccountSecurityPin,
} from '@beeapp/api-client';
import { getWebAuth } from '@/lib/client/liveData';
import {
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/client/beeservices/CommercialShell';

const securityFieldLabel = 'mb-1.5 block text-[11px] font-extrabold text-[#4E3B68]';

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
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#E7DDF2] bg-white px-6 py-12 text-xs text-[#786593]">
        <Loader2 className="h-4 w-4 animate-spin text-[#7427D5]" />
        Cargando seguridad…
      </div>
    );
  }

  return (
    <div className="select-none space-y-5">
      <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-[#261743]">Protección de tu cuenta</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#786593]">
            En web usas un PIN de 4 dígitos para desbloquear chats sensibles, notas y almacenamiento.
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end sm:flex">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
              pinConfigured ? 'bg-[#C6F6D5] text-[#276749]' : 'bg-[#E2E8F0] text-[#4A5568]'
            }`}
          >
            {pinConfigured ? 'PIN activo' : 'Sin PIN'}
          </span>
        </div>
      </div>

      {error && !changingPin ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
        <div className="order-2 space-y-4 lg:order-1">
          <section className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.06)]">
            <div className="border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:px-5">
              <h3 className="text-sm font-extrabold text-[#261743]">Bloqueo de aplicación</h3>
              <p className="mt-0.5 text-xs text-[#786593]">Biometría en móvil y PIN en la web.</p>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex gap-3 rounded-2xl border border-[#F1EAF6] bg-[#FFFCF9] p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                  <Smartphone className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-[#261743]">Biometría en app móvil</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#786593]">
                    Huella o rostro se configuran en la app Buddy para iOS y Android.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-[#FAF4FF] p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F6EAFE] text-[#7427D5]">
                  <Lock className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-[#261743]">PIN en Buddy Web</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#786593]">
                    Desbloquea contenido sensible sin depender del dispositivo.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm">
              <MessageCircle className="h-5 w-5 text-[#7427D5]" aria-hidden />
              <p className="mt-2 text-2xl font-extrabold text-[#261743]">{protectedCount}</p>
              <p className="text-xs text-[#786593]">
                {protectedCount === 1 ? 'Chat protegido' : 'Chats protegidos'}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm">
              <KeyRound className="h-5 w-5 text-[#7427D5]" aria-hidden />
              <p className="mt-2 text-sm font-extrabold text-[#261743]">4 dígitos</p>
              <p className="text-xs text-[#786593]">PIN exclusivo de tu cuenta web</p>
            </div>
          </div>
        </div>

        <section className="order-1 overflow-hidden rounded-2xl border border-[#E7DDF2] bg-gradient-to-br from-white via-[#FFFCF9] to-[#F6EAFE] shadow-[0_10px_30px_rgba(116,39,213,0.08)] lg:sticky lg:top-24 lg:order-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1EAF6] bg-white/90 px-4 py-4 backdrop-blur sm:px-5">
            <div>
              <h3 className="text-sm font-extrabold text-[#261743]">PIN de cuenta</h3>
              <p className="mt-0.5 text-xs text-[#786593]">Cuatro dígitos para contenido sensible.</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:hidden ${
                pinConfigured ? 'bg-[#C6F6D5] text-[#276749]' : 'bg-[#E2E8F0] text-[#4A5568]'
              }`}
            >
              {pinConfigured ? 'PIN activo' : 'Sin PIN'}
            </span>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <p className="text-xs leading-relaxed text-[#5E506B]">
              Protege chats sensibles, notas y acciones de almacenamiento cuando compartes el equipo.
            </p>

            {msg ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#E8D1F1] bg-[#FAF4FF] px-3 py-2 text-xs font-semibold text-[#5E1ABF]">
                <Check className="h-4 w-4 shrink-0" aria-hidden />
                {msg}
              </div>
            ) : null}

            {error && changingPin ? (
              <p className="text-xs text-rose-600">{error}</p>
            ) : null}

            {!changingPin ? (
              <button
                type="button"
                onClick={() => {
                  setChangingPin(true);
                  setError('');
                }}
                className={`${primaryButtonClass} w-full gap-2`}
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                {pinConfigured ? 'Cambiar PIN de cuenta' : 'Crear PIN de cuenta'}
              </button>
            ) : (
              <form onSubmit={(event) => void handleSavePin(event)} className="space-y-4 rounded-2xl border border-[#E8D1F1] bg-white p-4">
                {pinConfigured ? (
                  <div>
                    <label className={securityFieldLabel} htmlFor="security-password">
                      Contraseña actual
                    </label>
                    <input
                      id="security-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={fieldClass}
                      autoComplete="current-password"
                    />
                  </div>
                ) : null}

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-[#4E3B68]" htmlFor="security-new-pin">
                      Nuevo PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin((value) => !value)}
                      className="rounded-lg p-1 text-[#8A72B2] hover:bg-[#F6EAFE] hover:text-[#7427D5]"
                      aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id="security-new-pin"
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className={`${fieldClass} text-center font-mono text-base tracking-[0.35em]`}
                      autoComplete="off"
                    />
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      aria-label="Confirmar PIN"
                      className={`${fieldClass} text-center font-mono text-base tracking-[0.35em]`}
                      autoComplete="off"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#8A72B2]">Repite el mismo PIN en ambos campos.</p>
                </div>

                <p className="text-[11px] text-[#786593]">
                  Chats protegidos actuales: <strong className="text-[#261743]">{protectedCount}</strong>
                </p>

                <p className="text-[10px] leading-relaxed text-[#B8A5D6]">
                  En web pide el PIN al desbloquear chats, notas privadas y acciones sensibles de
                  almacenamiento. No sustituye tu contraseña de inicio de sesión.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPin(false);
                      setError('');
                      setPassword('');
                      setNewPin('');
                      setConfirmPin('');
                    }}
                    className={`${secondaryButtonClass} w-full sm:flex-1`}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full sm:flex-1`}>
                    {submitting ? 'Guardando…' : 'Guardar PIN'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
