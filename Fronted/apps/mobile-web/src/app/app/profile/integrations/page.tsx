'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Link as LinkIcon, Check } from 'lucide-react';

const INTEGRATIONS = [
  { id: 'gmail', name: 'Google Gmail', desc: 'Sincroniza tus correos recibidos' },
  { id: 'outlook', name: 'Microsoft Outlook', desc: 'Conecta tu cuenta corporativa' },
  { id: 'gcal', name: 'Google Calendar', desc: 'Sincroniza eventos de agenda' },
  { id: 'drive', name: 'Google Drive', desc: 'Importación de documentos' },
];

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({ gmail: true });

  const toggleConnect = (id: string) => {
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white min-h-full flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <Link href="/app" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-base text-neutral-900 ml-2">Integraciones Externas</h1>
      </div>

      <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        <p className="text-xs text-neutral-500 font-normal">
          Conecta tus herramientas de trabajo para sincronizar información en BeeApp AI.
        </p>

        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {INTEGRATIONS.map((item) => {
            const isConn = !!connected[item.id];
            return (
              <div key={item.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-brand-primary flex items-center justify-center font-bold text-xs">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-neutral-900">{item.name}</h3>
                    <p className="text-[11px] text-neutral-500 font-normal">{item.desc}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleConnect(item.id)}
                  className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${
                    isConn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-brand-primary text-white hover:bg-brand-dark'
                  }`}
                >
                  {isConn ? <><Check className="w-3.5 h-3.5" /> Conectado</> : 'Conectar'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
