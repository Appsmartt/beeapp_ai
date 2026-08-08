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
        {/* IA – izquierda, rosado‑lila pastel */}
        <div className="rounded-2xl p-5 h-56 flex flex-col justify-between cursor-pointer transition-all bg-gradient-to-l from-[rgba(236,72,153,0.14)] via-[rgba(244,114,182,0.10)] to-[rgba(248,250,252,1)] border border-[rgba(236,72,153,0.45)] shadow-[0_10px_26px_rgba(236,72,153,0.20)] hover:border-[1.5px] hover:border-[rgba(236,72,153,0.90)] hover:shadow-[0_16px_40px_rgba(236,72,153,0.32)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-normal text-sm text-neutral-900">Asistente IA</h3>
                  <p className="font-normal text-xs text-neutral-600">
                    Siempre aquí para ayudarte
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white/70 text-rose-600 border border-rose-200">
                En línea
              </span>
            </div>

            <p className="font-normal text-xs text-neutral-700 mt-3">
              Pídeme que resuma tus correos, prepare reuniones o busque oportunidades para tu
              negocio.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-white/85 text-neutral-800 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                Último: resumen de correos
              </span>
              <span className="bg-white/85 text-neutral-800 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                3 tareas sugeridas
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/75">
            <span className="font-normal text-[11px] text-neutral-700 truncate">
              ¿En qué te ayudo hoy?
            </span>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/85 text-rose-600 border border-rose-200">
              <Bot className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* CHAT – centro, rosado → lila suave */}
        <div
          onClick={() => onSelectModule('chat')}
          className="rounded-2xl p-5 h-56 flex flex-col justify-between cursor-pointer transition-all bg-gradient-to-br from-[rgba(244,114,182,0.18)] via-[rgba(216,180,254,0.18)] to-[rgba(248,250,252,1)] border border-[rgba(216,180,254,0.55)] shadow-[0_10px_26px_rgba(216,180,254,0.22)] hover:border-[1.5px] hover:border-[rgba(192,132,252,0.95)] hover:shadow-[0_16px_40px_rgba(192,132,252,0.32)]"
        >
          <div>
            <MessageCircle className="w-7 h-7 text-fuchsia-700/90" />
            <h3 className="font-normal text-sm text-neutral-900 mt-2">Chat</h3>
            <p className="font-normal text-xs text-neutral-650">Mensajería</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-white/90 text-neutral-800 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                3 Nuevos
              </span>
              <span className="bg-rose-50/95 text-rose-600 text-[10px] font-normal px-2.5 py-0.5 rounded-md border border-rose-100">
                1 Llamada perdida
              </span>
              <span className="bg-white/90 text-neutral-800 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                2 Grupos activos
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-white/80">
            <div className="flex items-center -space-x-1.5">
              {MOCK_AVATARS.map((av, idx) => (
                <div
                  key={idx}
                  className={`w-6 h-6 rounded-full ${av.bg} font-normal text-[10px] flex items-center justify-center border-2 border-white/90`}
                >
                  {av.initials}
                </div>
              ))}
            </div>
            <span className="font-normal text-xs text-neutral-700 truncate">
              Carlos, María y 1 más
            </span>
          </div>
        </div>

        {/* CORREOS – derecha, lila → violeta pastel */}
        <div
          onClick={() => onSelectModule('mail')}
          className="rounded-2xl p-5 h-56 flex flex-col justify-between cursor-pointer transition-all bg-gradient-to-r from-[rgba(199,210,254,0.20)] via-[rgba(196,181,253,0.24)] to-[rgba(167,139,250,0.26)] border border-[rgba(129,140,248,0.60)] shadow-[0_10px_26px_rgba(129,140,248,0.22)] hover:border-[1.5px] hover:border-[rgba(129,140,248,0.95)] hover:shadow-[0_16px_40px_rgba(129,140,248,0.32)]"
        >
          <div>
            <Mail className="w-7 h-7 text-indigo-700/90" />
            <h3 className="font-normal text-sm text-neutral-900 mt-2">Correos</h3>
            <p className="font-normal text-xs text-neutral-650">Bandeja inteligente</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-white/90 text-neutral-800 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                5 Sin leer
              </span>
              <span className="bg-white/90 text-neutral-800 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                2 Con adjuntos
              </span>
              <span className="bg-rose-50/95 text-rose-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md border border-rose-100">
                1 Importante
              </span>
            </div>
          </div>
          <p className="font-normal text-xs text-neutral-700 truncate pt-3 border-t border-white/85">
            Carlos M. — Avance del proyecto Q3...
          </p>
        </div>

        {/* AGENDA – fila 2, izquierda, rosado → lila azulado */}
        <div
          onClick={() => onSelectModule('calendar')}
          className="rounded-2xl p-5 h-56 flex flex-col justify-between cursor-pointer transition-all bg-gradient-to-l from-[rgba(147,197,253,0.20)] via-[rgba(196,181,253,0.22)] to-[rgba(248,250,252,1)] border border-[rgba(165,180,252,0.60)] shadow-[0_10px_24px_rgba(165,180,252,0.20)] hover:border-[1.5px] hover:border-[rgba(129,140,248,0.95)] hover:shadow-[0_16px_36px_rgba(129,140,248,0.30)]"
        >
          <div>
            <Calendar className="w-7 h-7 text-indigo-600/90" />
            <h3 className="font-normal text-sm text-neutral-900 mt-2">Agenda</h3>
            <p className="font-normal text-xs text-neutral-650">Calendario</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-white/90 text-neutral-800 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                3 Hoy
              </span>
              <span className="bg-indigo-50/95 text-indigo-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md border border-indigo-100">
                1 Reunión en 45 min
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-3 border-t border-white/85 font-normal text-xs text-neutral-700">
            <Video className="w-4 h-4 text-indigo-600/90 shrink-0" />
            <span className="truncate">14:00 — Sincronización semanal</span>
          </div>
        </div>

        {/* NOTAS – fila 2, centro, rosado‑violeta equilibrado */}
        <div
          onClick={() => onSelectModule('notes')}
          className="rounded-2xl p-5 h-56 flex flex-col justify-between cursor-pointer transition-all bg-gradient-to-br from-[rgba(236,72,153,0.16)] via-[rgba(233,213,255,0.24)] to-[rgba(248,250,252,1)] border border-[rgba(233,213,255,0.65)] shadow-[0_10px_24px_rgba(233,213,255,0.26)] hover:border-[1.5px] hover:border-[rgba(217,180,255,0.98)] hover:shadow-[0_16px_36px_rgba(217,180,255,0.32)]"
        >
          <div>
            <FileText className="w-7 h-7 text-rose-700/90" />
            <h3 className="font-normal text-sm text-neutral-900 mt-2">Notas</h3>
            <p className="font-normal text-xs text-neutral-650">Apuntes rápidos</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="bg-white/90 text-neutral-850 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                3 Nuevas
              </span>
              <span className="bg-white/90 text-neutral-850 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                2 Protegidas
              </span>
              <span className="bg-rose-50/95 text-rose-700 text-[10px] font-normal px-2.5 py-0.5 rounded-md border border-rose-100">
                1 Recordatorio
              </span>
            </div>
          </div>
          <p className="font-normal text-xs text-neutral-700 truncate pt-3 border-t border-white/85">
            Estrategia comercial Q3...
          </p>
        </div>

        {/* ARCHIVOS – fila 2, derecha, más violeta/azul frío */}
        <div
          onClick={() => onSelectModule('storage')}
          className="rounded-2xl p-5 h-56 flex flex-col justify_between cursor-pointer transition-all bg-gradient-to-r from-[rgba(129,140,248,0.22)] via-[rgba(148,163,184,0.24)] to-[rgba(248,250,252,1)] border border-[rgba(148,163,184,0.75)] shadow-[0_10px_24px_rgba(148,163,184,0.25)] hover:border-[1.5px] hover:border-[rgba(148,163,184,0.98)] hover:shadow-[0_16px_36px_rgba(148,163,184,0.35)]"
        >
          <div>
            <div className="flex items-center justify-between">
              <FolderOpen className="w-7 h-7 text-indigo-600/85" />
              <div className="flex gap-1.5">
                <span className="bg-white/90 text-neutral-850 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                  57% usado
                </span>
                <span className="bg-white/90 text-neutral-850 text-[10px] font-normal px-2.5 py-0.5 rounded-md">
                  8.5 GB de 15 GB
                </span>
              </div>
            </div>
            <h3 className="font-normal text-sm text-neutral-900 mt-2">Archivos</h3>
            <p className="font-normal text-xs text-neutral-650">Almacenamiento</p>
            <div className="w-full bg-white/90 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-200/80">
              <div className="bg-indigo-400/80 h-1.5 rounded-full w-[57%]" />
            </div>
          </div>
          <div className="space-y-1 pt-2 border-t border-white/85">
            {RECENT_FILES.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-normal text-neutral-700"
              >
                <span className="truncate pr-2">• {file.name}</span>
                <span className="shrink-0 text-[11px] text-neutral-700">
                  {file.size}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}