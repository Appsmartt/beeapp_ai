'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Bot,
  Calendar,
  ChevronRight,
  FileText,
  FolderOpen,
  Mail,
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react';
import {
  getCurrentWebNotifications,
  getCurrentWebStorageFiles,
  getCurrentWebStorageSummary,
} from '@beeapp/api-client';
import type {
  StorageFile,
  StorageSummary,
} from '@beeapp/shared-types';

import type { ModuleKey } from './modules';

interface AllModulesOverviewProps {
  onSelectModule: (moduleKey: ModuleKey) => void;
  onOpenSideMenuOption?: (option: string) => void;
}

const MOCK_AVATARS = [
  { initials: 'CM', bg: 'bg-blue-100 text-blue-800' },
  { initials: 'MA', bg: 'bg-amber-100 text-amber-800' },
  { initials: 'JP', bg: 'bg-emerald-100 text-emerald-800' },
];

function formatBytes(
  bytes: number,
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** exponent;

  const decimals = exponent === 0
    ? 0
    : value >= 10
      ? 1
      : 2;

  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

export default function AllModulesOverview({
  onSelectModule,
  onOpenSideMenuOption,
}: AllModulesOverviewProps) {
  const [storageSummary, setStorageSummary] =
    useState<StorageSummary | null>(null);

  const [recentFiles, setRecentFiles] = useState<
    StorageFile[]
  >([]);

  const [
    unreadStorageNotifications,
    setUnreadStorageNotifications,
  ] = useState(0);

  const loadStorageOverview = useCallback(async () => {
    try {
      const [
        summaryResponse,
        filesResponse,
        notificationsResponse,
      ] = await Promise.all([
        getCurrentWebStorageSummary(),
        getCurrentWebStorageFiles({
          status: 'ready',
          scope: 'recent',
          limit: 2,
          offset: 0,
        }),
        getCurrentWebNotifications({
          module: 'storage',
          unread_only: true,
          limit: 1,
          offset: 0,
        }),
      ]);

      setStorageSummary(summaryResponse.storage);
      setRecentFiles(filesResponse.files);
      setUnreadStorageNotifications(
        notificationsResponse.unread_count,
      );
    } catch {
      setStorageSummary(null);
      setRecentFiles([]);
      setUnreadStorageNotifications(0);
    }
  }, []);

  useEffect(() => {
    void loadStorageOverview();
  }, [loadStorageOverview]);

  const storageUsagePercentage = storageSummary
    ? Math.min(
      100,
      Math.max(
        0,
        storageSummary.usage_percentage,
      ),
    )
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 pb-24 select-none">
      <div
        onClick={() => onOpenSideMenuOption?.('beeservices')}
        className="cursor-pointer space-y-4 rounded-3xl border-[1.5px] border-brand-primary/40 bg-gradient-to-r from-[rgba(124,58,237,0.05)] to-[rgba(124,58,237,0.12)] p-6 shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all hover:border-brand-primary/60"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
              <ShoppingBag className="h-9 w-9" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                BeeServices
              </h2>

              <p className="text-xs font-normal text-neutral-500">
                Tus negocios y catálogo comercial
              </p>

              <p className="mt-1 max-w-2xl text-xs font-normal text-neutral-600">
                Crea tu negocio, publica productos y servicios. Los clientes te
                encontrarán a través del asistente de IA.
              </p>
            </div>
          </div>

          <ChevronRight className="h-6 w-6 shrink-0 text-brand-primary" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-normal text-brand-primary">
            2 Negocios
          </span>

          <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-normal text-brand-primary">
            4 Productos
          </span>

          <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-normal text-brand-primary">
            3 Servicios
          </span>

          <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-normal text-brand-primary">
            12 Consultas recibidas
          </span>
        </div>

        <div className="flex flex-col items-start gap-4 border-t border-brand-primary/15 pt-3 text-xs font-normal text-neutral-700 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-brand-primary" />
            <span>Los clientes te encuentran vía IA</span>
          </div>

          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0 text-brand-primary" />
            <span>Chat directo con compradores</span>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-brand-primary" />
            <span>Visibilidad en la red empresarial</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="flex h-56 cursor-pointer flex-col justify-between rounded-2xl border border-[rgba(236,72,153,0.45)] bg-gradient-to-l from-[rgba(236,72,153,0.14)] via-[rgba(244,114,182,0.10)] to-[rgba(248,250,252,1)] p-5 shadow-[0_10px_26px_rgba(236,72,153,0.20)] transition-all hover:border-[1.5px] hover:border-[rgba(236,72,153,0.90)] hover:shadow-[0_16px_40px_rgba(236,72,153,0.32)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-normal text-neutral-900">
                    Asistente IA
                  </h3>

                  <p className="text-xs font-normal text-neutral-600">
                    Siempre aquí para ayudarte
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-rose-200 bg-white/70 px-2.5 py-0.5 text-[10px] font-medium text-rose-600">
                En línea
              </span>
            </div>

            <p className="mt-3 text-xs font-normal text-neutral-700">
              Pídeme que resuma tus correos, prepare reuniones o busque
              oportunidades para tu negocio.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-white/85 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                Último: resumen de correos
              </span>

              <span className="rounded-md bg-white/85 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                3 tareas sugeridas
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/75 pt-3">
            <span className="truncate text-[11px] font-normal text-neutral-700">
              ¿En qué te ayudo hoy?
            </span>

            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white/85 text-rose-600">
              <Bot className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div
          onClick={() => onSelectModule('chat')}
          className="flex h-56 cursor-pointer flex-col justify-between rounded-2xl border border-[rgba(216,180,254,0.55)] bg-gradient-to-br from-[rgba(244,114,182,0.18)] via-[rgba(216,180,254,0.18)] to-[rgba(248,250,252,1)] p-5 shadow-[0_10px_26px_rgba(216,180,254,0.22)] transition-all hover:border-[1.5px] hover:border-[rgba(192,132,252,0.95)] hover:shadow-[0_16px_40px_rgba(192,132,252,0.32)]"
        >
          <div>
            <MessageCircle className="h-7 w-7 text-fuchsia-700/90" />

            <h3 className="mt-2 text-sm font-normal text-neutral-900">
              Chat
            </h3>

            <p className="text-xs font-normal text-neutral-650">
              Mensajería
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                3 Nuevos
              </span>

              <span className="rounded-md border border-rose-100 bg-rose-50/95 px-2.5 py-0.5 text-[10px] font-normal text-rose-600">
                1 Llamada perdida
              </span>

              <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                2 Grupos activos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-white/80 pt-3">
            <div className="flex items-center -space-x-1.5">
              {MOCK_AVATARS.map((avatar, index) => (
                <div
                  key={index}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/90 text-[10px] font-normal ${avatar.bg}`}
                >
                  {avatar.initials}
                </div>
              ))}
            </div>

            <span className="truncate text-xs font-normal text-neutral-700">
              Carlos, María y 1 más
            </span>
          </div>
        </div>

        <div
          onClick={() => onSelectModule('mail')}
          className="flex h-56 cursor-pointer flex-col justify-between rounded-2xl border border-[rgba(129,140,248,0.60)] bg-gradient-to-r from-[rgba(199,210,254,0.20)] via-[rgba(196,181,253,0.24)] to-[rgba(167,139,250,0.26)] p-5 shadow-[0_10px_26px_rgba(129,140,248,0.22)] transition-all hover:border-[1.5px] hover:border-[rgba(129,140,248,0.95)] hover:shadow-[0_16px_40px_rgba(129,140,248,0.32)]"
        >
          <div>
            <Mail className="h-7 w-7 text-indigo-700/90" />

            <h3 className="mt-2 text-sm font-normal text-neutral-900">
              Correos
            </h3>

            <p className="text-xs font-normal text-neutral-650">
              Bandeja inteligente
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                5 Sin leer
              </span>

              <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                2 Con adjuntos
              </span>

              <span className="rounded-md border border-rose-100 bg-rose-50/95 px-2.5 py-0.5 text-[10px] font-normal text-rose-700">
                1 Importante
              </span>
            </div>
          </div>

          <p className="truncate border-t border-white/85 pt-3 text-xs font-normal text-neutral-700">
            Carlos M. — Avance del proyecto Q3...
          </p>
        </div>

        <div
          onClick={() => onSelectModule('calendar')}
          className="flex h-56 cursor-pointer flex-col justify-between rounded-2xl border border-[rgba(165,180,252,0.60)] bg-gradient-to-l from-[rgba(147,197,253,0.20)] via-[rgba(196,181,253,0.22)] to-[rgba(248,250,252,1)] p-5 shadow-[0_10px_24px_rgba(165,180,252,0.20)] transition-all hover:border-[1.5px] hover:border-[rgba(129,140,248,0.95)] hover:shadow-[0_16px_36px_rgba(129,140,248,0.30)]"
        >
          <div>
            <Calendar className="h-7 w-7 text-indigo-600/90" />

            <h3 className="mt-2 text-sm font-normal text-neutral-900">
              Agenda
            </h3>

            <p className="text-xs font-normal text-neutral-650">
              Calendario
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                3 Hoy
              </span>

              <span className="rounded-md border border-indigo-100 bg-indigo-50/95 px-2.5 py-0.5 text-[10px] font-normal text-indigo-700">
                1 Reunión en 45 min
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-t border-white/85 pt-3 text-xs font-normal text-neutral-700">
            <Video className="h-4 w-4 shrink-0 text-indigo-600/90" />
            <span className="truncate">
              14:00 — Sincronización semanal
            </span>
          </div>
        </div>

        <div
          onClick={() => onSelectModule('notes')}
          className="flex h-56 cursor-pointer flex-col justify-between rounded-2xl border border-[rgba(233,213,255,0.65)] bg-gradient-to-br from-[rgba(236,72,153,0.16)] via-[rgba(233,213,255,0.24)] to-[rgba(248,250,252,1)] p-5 shadow-[0_10px_24px_rgba(233,213,255,0.26)] transition-all hover:border-[1.5px] hover:border-[rgba(217,180,255,0.98)] hover:shadow-[0_16px_36px_rgba(217,180,255,0.32)]"
        >
          <div>
            <FileText className="h-7 w-7 text-rose-700/90" />

            <h3 className="mt-2 text-sm font-normal text-neutral-900">
              Notas
            </h3>

            <p className="text-xs font-normal text-neutral-650">
              Apuntes rápidos
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-850">
                3 Nuevas
              </span>

              <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-850">
                2 Protegidas
              </span>

              <span className="rounded-md border border-rose-100 bg-rose-50/95 px-2.5 py-0.5 text-[10px] font-normal text-rose-700">
                1 Recordatorio
              </span>
            </div>
          </div>

          <p className="truncate border-t border-white/85 pt-3 text-xs font-normal text-neutral-700">
            Estrategia comercial Q3...
          </p>
        </div>

        <div
          onClick={() => onSelectModule('storage')}
          className="flex h-56 cursor-pointer flex-col justify-between rounded-2xl border border-[rgba(148,163,184,0.75)] bg-gradient-to-r from-[rgba(129,140,248,0.22)] via-[rgba(148,163,184,0.24)] to-[rgba(248,250,252,1)] p-5 shadow-[0_10px_24px_rgba(148,163,184,0.25)] transition-all hover:border-[1.5px] hover:border-[rgba(148,163,184,0.98)] hover:shadow-[0_16px_36px_rgba(148,163,184,0.35)]"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <FolderOpen className="h-7 w-7 shrink-0 text-indigo-600/85" />

              <div className="flex flex-wrap justify-end gap-1.5">
                <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-850">
                  {storageSummary
                    ? `${Math.round(
                      storageUsagePercentage,
                    )}% usado`
                    : 'Cargando...'}
                </span>

                {unreadStorageNotifications > 0 && (
                  <span className="rounded-md border border-red-100 bg-red-50/95 px-2.5 py-0.5 text-[10px] font-normal text-red-600">
                    {unreadStorageNotifications > 9
                      ? '9+'
                      : unreadStorageNotifications}{' '}
                    pendiente(s)
                  </span>
                )}
              </div>
            </div>

            <h3 className="mt-2 text-sm font-normal text-neutral-900">
              Archivos
            </h3>

            <p className="text-xs font-normal text-neutral-650">
              {storageSummary
                ? `${formatBytes(
                  storageSummary.used_bytes,
                )} usados de ${formatBytes(
                  storageSummary.quota_bytes,
                )}`
                : 'Almacenamiento'}
            </p>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border border-slate-200/80 bg-white/90">
              <div
                className="h-1.5 rounded-full bg-indigo-400/80 transition-all"
                style={{
                  width: `${storageUsagePercentage}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-1 border-t border-white/85 pt-2">
            {recentFiles.length > 0 ? (
              recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between text-xs font-normal text-neutral-700"
                >
                  <span className="truncate pr-2">
                    • {file.display_name}
                  </span>

                  <span className="shrink-0 text-[11px] text-neutral-700">
                    {formatBytes(file.size_bytes)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs font-normal text-neutral-500">
                No tienes archivos recientes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}