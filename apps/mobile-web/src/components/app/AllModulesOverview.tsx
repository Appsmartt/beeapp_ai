'use client';

import {
  MessageCircle,
  Mail,
  Calendar,
  FileText,
  FolderOpen,
  ShoppingBag,
  ChevronRight,
  Search,
  TrendingUp,
  Video,
  Sparkles,
  Bot,
} from 'lucide-react';
import { ModuleKey } from './modules';

interface AllModulesOverviewProps {
  onSelectModule: (moduleKey: ModuleKey) => void;
  onOpenSideMenuOption?: (option: string) => void;
}

const MOCK_AVATARS = [
  { initials: 'CM', bg: 'bg-blue-100 text-blue-800' },
  { initials: 'MA', bg: 'bg-amber-100 text-amber-800' },
  { initials: 'JP', bg: 'bg-emerald-100 text-emerald-800' },
];

const RECENT_FILES = [
  { name: 'Contrato_Cliente_Q3.pdf', size: '2.4 MB' },
  { name: 'Presentación_Ventas.pdf', size: '5.1 MB' },
];

export default function AllModulesOverview({
  onSelectModule,
  onOpenSideMenuOption,
}: AllModulesOverviewProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto pb-24 space-y-6 select-none">
      {/* 1. BEESERVICES HERO CARD */}
      <div
        onClick={() => onOpenSideMenuOption?.('beeservices')}
        className="bg-gradient-to-r from-[rgba(124,58,237,0.05)] to-[rgba(124,58,237,0.12)] border-[1.5px] border-brand-primary/40 rounded-3xl p-6 shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-brand-primary/60 transition-all cursor-pointer space-y-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="w-9 h-9" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-neutral-900">BeeServices</h2>
              <p className="font-normal text-xs text-neutral-500">
                Tus negocios y catálogo comercial
              </p>
              <p className="font-normal text-xs text-neutral-600 mt-1 max-w-2xl">
                Crea tu negocio, publica productos y servicios. Los clientes te encontrarán a través
                del asistente de IA.
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-brand-primary shrink-0" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-brand-primary/10 text-brand-primary text-xs font-normal px-3 py-1 rounded-xl">
            2 Negocios
          </span>
          <span className="bg-brand-primary/10 text-brand-primary text-xs font-normal px-3 py-1 rounded-xl">
            4 Productos
          </span>
          <span className="bg-brand-primary/10 text-brand-primary text-xs font-normal px-3 py-1 rounded-xl">
            3 Servicios
          </span>
          <span className="bg-brand-primary/10 text-brand-primary text-xs font-normal px-3 py-1 rounded-xl">
            12 Consultas recibidas
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-3 border-t border-brand-primary/15 text-xs text-neutral-700 font-normal">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-brand-primary shrink-0" />
            <span>Los clientes te encuentran vía IA</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-brand-primary shrink-0" />
            <span>Chat directo con compradores</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-primary shrink-0" />
            <span>Visibilidad en la red empresarial</span>
          </div>
        </div>
      </div>

      {/* 2. GRID ÚNICO DE MÓDULOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* IA */}
        <div className="bg-white rounded-2xl border border-brand-primary/20 p-5 flex flex-col justify-between h-56 shadow-sm hover:shadow-md hover:border-brand-primary/40 transition-all cursor-pointer">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-normal text-sm text-neutral-800">Asistente IA</h3>
                  <p className="font-normal text-xs text-neutral-500">
                    Siempre aquí para ayudarte
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary">
                En línea
              </span>
            </div>

            <p className="font-normal text-xs text-neutral-600 mt-3">
              Pídeme que resuma tus correos, prepare reuniones o busque oportunidades para tu
              negocio.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                Último: resumen de correos
              </span>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                3 tareas sugeridas
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
            <span className="font-normal text-[11px] text-neutral-500 truncate">
              ¿En qué te ayudo hoy?
            </span>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary">
              <Bot className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* CHAT */}
        <div
          onClick={() => onSelectModule('chat')}
          className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col justify-between h-56 hover:border-neutral-300 transition-colors cursor-pointer"
        >
          <div>
            <MessageCircle className="w-7 h-7 text-brand-primary/70" />
            <h3 className="font-normal text-sm text-neutral-800 mt-2">Chat</h3>
            <p className="font-normal text-xs text-neutral-500">Mensajería</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                3 Nuevos
              </span>
              <span className="bg-red-50 text-red-500 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                1 Llamada perdida
              </span>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                2 Grupos activos
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
            <div className="flex items-center -space-x-1.5">
              {MOCK_AVATARS.map((av, idx) => (
                <div
                  key={idx}
                  className={`w-6 h-6 rounded-full ${av.bg} font-normal text-[10px] flex items-center justify-center border-2 border-white`}
                >
                  {av.initials}
                </div>
              ))}
            </div>
            <span className="font-normal text-xs text-neutral-500 truncate">
              Carlos, María y 1 más
            </span>
          </div>
        </div>

        {/* CORREOS */}
        <div
          onClick={() => onSelectModule('mail')}
          className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col justify-between h-56 hover:border-neutral-300 transition-colors cursor-pointer"
        >
          <div>
            <Mail className="w-7 h-7 text-brand-primary/70" />
            <h3 className="font-normal text-sm text-neutral-800 mt-2">Correos</h3>
            <p className="font-normal text-xs text-neutral-500">Bandeja inteligente</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                5 Sin leer
              </span>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                2 Con adjuntos
              </span>
              <span className="bg-red-50 text-red-500 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                1 Importante
              </span>
            </div>
          </div>
          <p className="font-normal text-xs text-neutral-500 truncate pt-3 border-t border-neutral-100">
            Carlos M. — Avance del proyecto Q3...
          </p>
        </div>

        {/* AGENDA */}
        <div
          onClick={() => onSelectModule('calendar')}
          className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col justify-between h-56 hover:border-neutral-300 transition-colors cursor-pointer"
        >
          <div>
            <Calendar className="w-7 h-7 text-brand-primary/70" />
            <h3 className="font-normal text-sm text-neutral-800 mt-2">Agenda</h3>
            <p className="font-normal text-xs text-neutral-500">Calendario</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                3 Hoy
              </span>
              <span className="bg-red-50 text-red-500 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                1 Reunión en 45 min
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-3 border-t border-neutral-100 font-normal text-xs text-neutral-500">
            <Video className="w-4 h-4 text-brand-primary/70 shrink-0" />
            <span className="truncate">14:00 — Sincronización semanal</span>
          </div>
        </div>

        {/* NOTAS */}
        <div
          onClick={() => onSelectModule('notes')}
          className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col justify-between h-56 hover:border-neutral-300 transition-colors cursor-pointer"
        >
          <div>
            <FileText className="w-7 h-7 text-brand-primary/70" />
            <h3 className="font-normal text-sm text-neutral-800 mt-2">Notas</h3>
            <p className="font-normal text-xs text-neutral-500">Apuntes rápidos</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                3 Nuevas
              </span>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                2 Protegidas
              </span>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                1 Recordatorio
              </span>
            </div>
          </div>
          <p className="font-normal text-xs text-neutral-500 truncate pt-3 border-t border-neutral-100">
            Estrategia comercial Q3...
          </p>
        </div>

        {/* ARCHIVOS */}
        <div
          onClick={() => onSelectModule('storage')}
          className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col justify-between h-56 hover:border-neutral-300 transition-colors cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <FolderOpen className="w-7 h-7 text-brand-primary/70" />
              <div className="flex gap-1.5">
                <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                  57% usado
                </span>
                <span className="bg-neutral-100 text-neutral-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                  8.5 GB de 15 GB
                </span>
              </div>
            </div>
            <h3 className="font-normal text-sm text-neutral-800 mt-2">Archivos</h3>
            <p className="font-normal text-xs text-neutral-500">Almacenamiento</p>
            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden mt-3">
              <div className="bg-brand-primary/50 h-1.5 rounded-full w-[57%]" />
            </div>
          </div>
          <div className="space-y-1 pt-2 border-t border-neutral-100">
            {RECENT_FILES.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-normal text-neutral-500"
              >
                <span className="truncate pr-2">• {file.name}</span>
                <span className="shrink-0 text-[11px] text-neutral-500">{file.size}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}