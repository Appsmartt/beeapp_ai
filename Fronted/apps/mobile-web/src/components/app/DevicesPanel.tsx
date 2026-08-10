'use client';

import { useState } from 'react';
import { QrCode, Monitor, Trash2, Smartphone, X } from 'lucide-react';

interface DeviceItem {
  id: string;
  name: string;
  lastSeen: string;
  isCurrent?: boolean;
}

const INITIAL_DEVICES: DeviceItem[] = [
  { id: 'dev-1', name: 'Google Chrome (macOS)', lastSeen: 'Activo ahora (Este dispositivo)', isCurrent: true },
  { id: 'dev-2', name: 'iPhone 15 Pro (App Móvil)', lastSeen: 'Hace 15 minutos' },
  { id: 'dev-3', name: 'Mozilla Firefox (Windows)', lastSeen: 'Ayer, 04:30 PM' },
];

export function DevicesPanel() {
  const [devices, setDevices] = useState<DeviceItem[]>(INITIAL_DEVICES);
  const [scanning, setScanning] = useState(false);

  const handleSignOutDevice = (id: string) => {
    if (confirm('¿Cerrar sesión en este dispositivo?')) {
      setDevices((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleSignOutAll = () => {
    if (confirm('¿Cerrar sesión en todos los demás dispositivos vinculados?')) {
      setDevices((prev) => prev.filter((d) => d.isCurrent));
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* SECCIÓN 1 — Escanear Código QR */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Vincular Nuevo Dispositivo
        </span>

        {scanning ? (
          <div className="p-6 rounded-2xl bg-neutral-900 text-white flex flex-col items-center justify-center text-center space-y-4 relative">
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="absolute top-3 right-3 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-brand-primary/80 flex items-center justify-center bg-black/40 animate-pulse">
              <QrCode className="w-16 h-16 text-brand-primary" />
            </div>
            <p className="text-xs text-neutral-300 font-normal max-w-xs">
              Apunta la cámara del celular al código QR para vincular la cuenta.
            </p>
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="px-4 py-2 rounded-xl bg-neutral-800 text-xs text-neutral-300 font-medium hover:bg-neutral-700"
            >
              Cancelar escáner
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-brand-dark transition-colors shadow-xs"
            >
              <QrCode className="w-4 h-4" />
              <span>Escanear código QR</span>
            </button>
            <p className="text-[11px] text-neutral-500 font-normal text-center leading-relaxed">
              Escanea el código QR que aparece en la pantalla de BeeApp Web o App móvil para vincular tu sesión de forma segura.
            </p>
          </div>
        )}
      </div>

      {/* SECCIÓN 2 — Dispositivos Activos */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          Dispositivos Activos ({devices.length})
        </span>

        {devices.length === 0 ? (
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
                    {d.name.includes('iPhone') || d.name.includes('App') ? (
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
                    onClick={() => handleSignOutDevice(d.id)}
                    className="h-8 px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-[11px] font-medium hover:bg-red-100 transition-colors shrink-0"
                  >
                    Cerrar sesión
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {devices.length > 1 && (
          <button
            type="button"
            onClick={handleSignOutAll}
            className="w-full h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 mt-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Cerrar todas las sesiones excepto esta</span>
          </button>
        )}
      </div>
    </div>
  );
}
