'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Monitor, QrCode, Shield, Smartphone, Trash2 } from 'lucide-react';
import {
  getDeviceSessions,
  revokeAllDeviceSessions,
  revokeDeviceSession,
} from '@beeapp/api-client';
import { getWebAuth } from '@/lib/client/liveData';

interface DeviceItem {
  id: string;
  name: string;
  lastSeen: string;
  isCurrent?: boolean;
}

function formatLastSeen(value: string | null | undefined, isCurrent: boolean): string {
  if (isCurrent) return 'Activo ahora · Este dispositivo';
  if (!value) return 'Sin actividad reciente';
  try {
    return new Intl.DateTimeFormat('es', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function isMobileDeviceName(name: string): boolean {
  return /iphone|android|mobile|app/i.test(name);
}

const QR_STEPS = [
  'Abre Buddy Web en el navegador donde quieras entrar.',
  'Ve a inicio de sesión y abre la pestaña QR.',
  'En el teléfono, entra a Dispositivos y escanea el código.',
];

export function DevicesPanel() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const response = await getDeviceSessions(auth);
      const sessions = response.devices ?? [];
      const currentSessionId =
        typeof window !== 'undefined' ? window.localStorage.getItem('beeapp.web.deviceSessionId') : null;
      setDevices(
        sessions.map((session) => {
          const isCurrent = currentSessionId === session.id;
          return {
            id: session.id,
            name: session.device_name || session.device_type || 'Dispositivo',
            lastSeen: formatLastSeen(session.last_seen_at, isCurrent),
            isCurrent,
          };
        }),
      );
    } catch (loadError) {
      setDevices([]);
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los dispositivos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleSignOutDevice = async (id: string) => {
    if (!confirm('¿Cerrar sesión en este dispositivo?')) return;
    setBusyId(id);
    try {
      const auth = await getWebAuth();
      await revokeDeviceSession(auth, id);
      await loadDevices();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible cerrar la sesión.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSignOutAll = async () => {
    if (!confirm('¿Cerrar sesión en todos los demás dispositivos vinculados?')) return;
    setBusyId('all');
    try {
      const auth = await getWebAuth();
      await revokeAllDeviceSessions(auth);
      await loadDevices();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible cerrar las sesiones.');
    } finally {
      setBusyId(null);
    }
  };

  const otherSessions = devices.filter((d) => !d.isCurrent);

  return (
    <div className="select-none space-y-5">
      <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
          <Shield className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-[#261743]">Sesiones de tu cuenta</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#786593]">
            Controla dónde iniciaste sesión y vincula la app móvil con Buddy Web usando QR.
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end sm:flex">
          <span className="text-2xl font-extrabold leading-none text-[#7427D5]">{loading ? '…' : devices.length}</span>
          <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Activos</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:items-start">
        <aside className="order-2 space-y-4 lg:sticky lg:top-24 lg:order-1">
          <section className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.06)]">
            <div className="border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-[#7427D5]" aria-hidden />
                <h3 className="text-sm font-extrabold text-[#261743]">Vincular app y web</h3>
              </div>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <p className="text-xs leading-relaxed text-[#786593]">
                El código QR aparece al iniciar sesión en Buddy Web. El teléfono aprueba el acceso al navegador que lo muestra.
              </p>
              <ol className="space-y-2">
                {QR_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-2 text-xs text-[#5E506B]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F6EAFE] text-[10px] font-extrabold text-[#7427D5]">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </aside>

        <section className="order-1 overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.06)] lg:order-2">
          <div className="border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:px-5">
            <h3 className="text-sm font-extrabold text-[#261743]">Dispositivos activos</h3>
            <p className="mt-0.5 text-xs text-[#786593]">
              {loading ? 'Cargando…' : `${devices.length} ${devices.length === 1 ? 'sesión' : 'sesiones'} vinculadas`}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#E7DDF2] py-10 text-xs text-[#786593]">
                <Loader2 className="h-4 w-4 animate-spin text-[#7427D5]" />
                Cargando dispositivos…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>
            ) : devices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E7DDF2] bg-[#FFFCF9] px-5 py-10 text-center">
                <Monitor className="mx-auto h-8 w-8 text-[#B8A5D6]" aria-hidden />
                <p className="mt-3 text-sm font-extrabold text-[#261743]">Sin dispositivos vinculados</p>
                <p className="mt-1 text-xs text-[#786593]">Cuando inicies sesión en otro equipo, aparecerá aquí.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {devices.map((device) => {
                  const mobile = isMobileDeviceName(device.name);
                  const Icon = mobile ? Smartphone : Monitor;
                  return (
                    <li
                      key={device.id}
                      className={`overflow-hidden rounded-2xl border transition hover:border-[#C9A8E8] ${
                        device.isCurrent ? 'border-[#C6F6D5] bg-[#F6FFF8]' : 'border-[#E7DDF2] bg-white'
                      }`}
                    >
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                              mobile
                                ? 'border-[#E8D1F1] bg-[#F6EAFE] text-[#7427D5]'
                                : 'border-[#E7DDF2] bg-[#FFFCF9] text-[#5E506B]'
                            }`}
                          >
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-extrabold text-[#261743] [overflow-wrap:anywhere]">{device.name}</p>
                              {device.isCurrent ? (
                                <span className="rounded-full bg-[#C6F6D5] px-2 py-0.5 text-[10px] font-extrabold text-[#276749]">
                                  Este dispositivo
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-[#786593]">{device.lastSeen}</p>
                          </div>
                        </div>

                        {!device.isCurrent ? (
                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => void handleSignOutDevice(device.id)}
                            className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 sm:w-auto"
                          >
                            {busyId === device.id ? 'Cerrando…' : 'Cerrar sesión'}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {otherSessions.length > 0 ? (
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void handleSignOutAll()}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {busyId === 'all' ? 'Cerrando sesiones…' : 'Cerrar todas excepto esta'}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
