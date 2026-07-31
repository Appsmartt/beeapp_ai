'use client';

import { useState } from 'react';
import { Link as LinkIcon, Check, Info, ChevronRight, X } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  desc: string;
  connected: boolean;
  email: string;
  syncDetails: string[];
  scopes: string[];
  iconColor: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    desc: 'Sincroniza tus correos entrantes, respuestas inteligentes y borradores.',
    connected: true,
    email: 'santiago.valencia@consultores.com',
    syncDetails: ['Correos recibidos', 'Borradores automáticos', 'Etiquetas de negocio'],
    iconColor: '#EA4335',
    scopes: [
      'Ver y gestionar correos electrónicos en Gmail',
      'Redactar y enviar correos mediante BeeAI asistente',
      'Acceso de solo lectura a contactos de Google',
    ],
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    desc: 'Sincroniza tus eventos, agendas de reuniones y recordatorios de tareas.',
    connected: true,
    email: 'santiago.valencia@consultores.com',
    syncDetails: ['Eventos del calendario', 'Reservas de clientes', 'Recordatorios'],
    iconColor: '#4285F4',
    scopes: [
      'Ver tus calendarios de Google',
      'Crear, editar y eliminar eventos en tus calendarios',
    ],
  },
  {
    id: 'outlook_mail',
    name: 'Outlook Mail',
    desc: 'Sincroniza correos de Office 365 e integraciones de Outlook unificado.',
    connected: false,
    email: '',
    syncDetails: ['Correos recibidos', 'Contactos corporativos'],
    iconColor: '#0078D4',
    scopes: [
      'Acceso a correos corporativos de Microsoft',
      'Crear borradores automatizados con IA',
    ],
  },
  {
    id: 'outlook_cal',
    name: 'Outlook Calendar',
    desc: 'Agenda reuniones corporativas en Teams y sincroniza con Office 365.',
    connected: false,
    email: '',
    syncDetails: ['Eventos de Outlook', 'Reuniones de Microsoft Teams'],
    iconColor: '#107C41',
    scopes: [
      'Ver y actualizar citas de calendario corporativo',
      'Generar links de Teams automáticos',
    ],
  },
];

export function IntegrationsPanel() {
  const [items, setItems] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [selectedDetail, setSelectedDetail] = useState<Integration | null>(null);

  const toggleConnect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.connected;
          return {
            ...item,
            connected: nextState,
            email: nextState ? 'santiago.valencia@consultores.com' : '',
          };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-5 select-none">
      <p className="text-xs text-neutral-500 font-normal leading-relaxed">
        Conecta tus herramientas de trabajo externas para sincronizar información y permitir al asistente de IA gestionar tus agendas y correos.
      </p>

      {/* Integration List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3 transition-colors hover:bg-neutral-50/80"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: item.iconColor }}
                >
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-xs text-neutral-900">{item.name}</h4>
                    {item.connected && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                        Conectado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 font-normal leading-snug mt-0.5">
                    {item.desc}
                  </p>
                  {item.connected && item.email && (
                    <p className="text-[10px] text-neutral-400 font-normal truncate mt-1">
                      Cuenta: {item.email}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleConnect(item.id)}
                className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  item.connected
                    ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                    : 'bg-brand-primary text-white hover:bg-brand-dark'
                }`}
              >
                {item.connected ? 'Desconectar' : 'Conectar'}
              </button>
            </div>

            {/* Sync Pills */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-[11px]">
              <div className="flex flex-wrap gap-1.5">
                {item.syncDetails.map((detail, idx) => (
                  <span key={idx} className="bg-white text-neutral-600 px-2 py-0.5 rounded-md border border-neutral-200 font-normal">
                    {detail}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(item)}
                className="text-brand-primary font-semibold flex items-center gap-0.5 hover:underline shrink-0 ml-2"
              >
                <span>Permisos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Detail Modal */}
      {selectedDetail && (
        <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-primary font-semibold text-xs">
              <Info className="w-4 h-4" />
              <span>Permisos de {selectedDetail.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="p-1 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5 text-xs text-neutral-700 font-normal">
            {selectedDetail.scopes.map((scope, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                <span>{scope}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
