'use client';

import { useCallback, useEffect, useState } from 'react';
import { Monitor, Trash2, Smartphone, Loader2, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
import {
  createQrLoginChallenge,
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
  if (isCurrent) return 'Activo ahora (Este dispositivo)';
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

export function DevicesPanel() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = await getWebAuth();
      const response = await getDeviceSessions(auth);
      const sessions = response.devices ?? [];
      const currentSessionId =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('beeapp.web.deviceSessionId')
          : null;
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

  const handleCreateQr = async () => {
    setQrLoading(true);
    try {
      const challenge = await createQrLoginChallenge();
      setQrToken(challenge.challenge_token);
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : 'No fue posible generar el código QR.');
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
          <QrCode className="w-4 h-4 text-brand-primary" />
          <span>Vincular otro dispositivo</span>
        </div>
        <p className="text-xs text-neutral-600 font-normal leading-relaxed">
          Genera un código QR y escanéalo desde la app móvil de Buddy (Iniciar sesión → Escanear QR).
        </p>
        {qrToken ? (
          <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-neutral-200">
            <QRCode value={JSON.stringify({ type: 'buddy_qr_login', challenge_token: qrToken })} size={160} />
            <p className="text-[10px] text-neutral-500 break-all text-center max-w-xs">{qrToken}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void handleCreateQr()}
          disabled={qrLoading}
          className="w-full h-10 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-50"
        >
          {qrLoading ? 'Generando…' : qrToken ? 'Generar nuevo código' : 'Mostrar código QR'}
        </button>
      </div>

      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Dispositivos activos ({devices.length})
        </span>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-xs text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando dispositivos…
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-xs text-red-700">{error}</div>
        ) : devices.length === 0 ? (
          <div className="p-4 rounded-2xl bg-neutral-50 text-center text-xs text-neutral-500 font-normal">
            No hay dispositivos vinculados a tu cuenta.
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div
                key={d.id}
                className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 shrink-0">
                    {/iphone|android|mobile|app/i.test(d.name) ? (
                      <Smartphone className="w-4.5 h-4.5 text-brand-primary" />
                    ) : (
                      <Monitor className="w-4.5 h-4.5 text-neutral-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{d.name}</p>
                    <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">{d.lastSeen}</p>
                  </div>
                </div>

                {!d.isCurrent && (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void handleSignOutDevice(d.id)}
                    className="h-8 px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-[11px] font-medium hover:bg-red-100 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {busyId === d.id ? 'Cerrando…' : 'Cerrar sesión'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {otherSessions.length > 0 && (
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => void handleSignOutAll()}
            className="w-full h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{busyId === 'all' ? 'Cerrando sesiones…' : 'Cerrar todas las sesiones excepto esta'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
