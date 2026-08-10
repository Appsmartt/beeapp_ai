'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, MessageCircle, FolderOpen, Calendar } from 'lucide-react';

const NOTIFICATIONS = [
  { id: '1', group: 'HOY', title: 'Nuevo correo de Juan Pérez', desc: 'Asunto: Revisión de propuesta comercial', time: '10:30 AM', icon: Mail, unread: true },
  { id: '2', group: 'HOY', title: 'Respuesta del Asistente IA', desc: 'Se respondieron 2 solicitudes de clientes automáticamente', time: '09:15 AM', icon: MessageCircle, unread: true },
  { id: '3', group: 'AYER', title: 'Documento firmado', desc: 'Contrato_Servicios_2026.pdf ha sido firmado por Laura Restrepo', time: 'Ayer', icon: FolderOpen, unread: false },
  { id: '4', group: 'ESTA SEMANA', title: 'Recordatorio de reunión', desc: 'Reunión de alineación de producto a las 09:00 AM', time: '26 Jul', icon: Calendar, unread: false },
];

export default function NotificationsPage() {
  return (
    <div className="bg-white min-h-full flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <Link href="/app" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-base text-neutral-900 ml-2">Centro de Notificaciones</h1>
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
          {NOTIFICATIONS.map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                className={`py-3.5 px-1 flex items-start gap-3 ${
                  item.unread ? 'bg-brand-primary/5' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <IconComp className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-neutral-900 truncate">{item.title}</span>
                    <span className="text-[10px] text-neutral-400 font-normal shrink-0">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
