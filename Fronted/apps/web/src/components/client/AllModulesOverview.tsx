'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Calendar,
  ChevronRight,
  FileText,
  FolderOpen,
  Mail,
  MessageCircle,
  Pencil,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react';

import type { ModuleKey } from './modules';
import {
  EMPTY_HOME_OVERVIEW,
  loadHomeOverview,
  type HomeOverview,
} from '@/lib/client/homeOverview';

interface AllModulesOverviewProps {
  onSelectModule: (moduleKey: ModuleKey) => void;
  onOpenSideMenuOption?: (option: string) => void;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const decimals = exponent === 0 ? 0 : value >= 10 ? 1 : 2;

  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

export default function AllModulesOverview({
  onSelectModule,
  onOpenSideMenuOption,
}: AllModulesOverviewProps) {
  const router = useRouter();
  const [overview, setOverview] = useState<HomeOverview>(
    EMPTY_HOME_OVERVIEW,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadHomeOverview()
      .then(setOverview)
      .catch(() => setOverview(EMPTY_HOME_OVERVIEW))
      .finally(() => setIsLoading(false));
  }, []);

  const { buddyServices, mail, chat, calendar, notes, assistant, storage } =
    overview;

  const storageUsagePercentage = storage.summary
    ? Math.min(
      100,
      Math.max(0, storage.summary.usage_percentage),
    )
    : 0;

  const notesCountLabel = useMemo(
    () => (notes.totalCount === 1
      ? '1 nota'
      : `${notes.totalCount} notas`),
    [notes.totalCount],
  );

  const buddyChips = [
    buddyServices.businessCount > 0
      ? `${buddyServices.businessCount} Negocio${buddyServices.businessCount === 1 ? '' : 's'}`
      : null,
    buddyServices.productCount > 0
      ? `${buddyServices.productCount} Producto${buddyServices.productCount === 1 ? '' : 's'}`
      : null,
    buddyServices.serviceCount > 0
      ? `${buddyServices.serviceCount} Servicio${buddyServices.serviceCount === 1 ? '' : 's'}`
      : null,
  ].filter((chip): chip is string => Boolean(chip));

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
                BuddyServices
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

        {buddyChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {buddyChips.map((chip) => (
              <span
                key={chip}
                className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-normal text-brand-primary"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

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
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push('/app/assistant')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              router.push('/app/assistant');
            }
          }}
          className="flex h-56 cursor-pointer flex-col justify-between rounded-2xl border border-[rgba(236,72,153,0.45)] bg-gradient-to-l from-[rgba(236,72,153,0.14)] via-[rgba(244,114,182,0.10)] to-[rgba(248,250,252,1)] p-5 shadow-[0_10px_26px_rgba(236,72,153,0.20)] transition-all hover:border-[1.5px] hover:border-[rgba(236,72,153,0.90)] hover:shadow-[0_16px_40px_rgba(236,72,153,0.32)]"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-normal text-neutral-900 truncate">
                    {assistant.name}
                  </h3>

                  <p className="text-xs font-normal text-neutral-600">
                    Asistente IA · siempre aquí para ayudarte
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-rose-200 bg-white/70 px-2.5 py-0.5 text-[10px] font-medium text-rose-600">
                {assistant.statusLabel}
              </span>
            </div>

            <p className="mt-3 text-xs font-normal text-neutral-700">
              Pídeme que resuma tus correos, prepare reuniones o busque
              oportunidades para tu negocio.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {assistant.unreadNotifications > 0 ? (
                <span className="rounded-md bg-white/85 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                  {assistant.unreadNotifications > 9
                    ? '9+'
                    : assistant.unreadNotifications}{' '}
                  notificación
                  {assistant.unreadNotifications === 1 ? '' : 'es'}
                </span>
              ) : null}

              {assistant.lastMessagePreview ? (
                <span className="max-w-full truncate rounded-md bg-white/85 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                  Último: {assistant.lastMessagePreview}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/75 pt-3">
            <span className="truncate text-[11px] font-normal text-neutral-700">
              {assistant.lastMessagePreview
                || (isLoading ? 'Cargando...' : 'Abrir asistente')}
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
              {chat.unreadCount > 0 ? (
                <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                  {chat.unreadCount} no leído{chat.unreadCount === 1 ? '' : 's'}
                </span>
              ) : null}

              {chat.conversationCount > 0 ? (
                <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                  {chat.conversationCount} conversación
                  {chat.conversationCount === 1 ? '' : 'es'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-white/80 pt-3">
            <span className="truncate text-[11px] font-normal text-neutral-600">
              {chat.latestPreview || 'Sin conversaciones recientes'}
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
              {mail.unreadCount > 0 ? (
                <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                  {mail.unreadCount} Sin leer
                </span>
              ) : null}

              {mail.attachmentCount > 0 ? (
                <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                  {mail.attachmentCount} Con adjuntos
                </span>
              ) : null}

              {mail.starredCount > 0 ? (
                <span className="rounded-md border border-rose-100 bg-rose-50/95 px-2.5 py-0.5 text-[10px] font-normal text-rose-700">
                  {mail.starredCount} Destacado{mail.starredCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </div>

          <p className="truncate border-t border-white/85 pt-3 text-xs font-normal text-neutral-700">
            {mail.latestPreview || 'Sin correos recientes'}
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
              {calendar.todayCount > 0 ? (
                <span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-800">
                  {calendar.todayCount} Hoy
                </span>
              ) : null}

              {calendar.upcomingMeetingLabel ? (
                <span className="rounded-md border border-indigo-100 bg-indigo-50/95 px-2.5 py-0.5 text-[10px] font-normal text-indigo-700">
                  {calendar.upcomingMeetingLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-t border-white/85 pt-3 text-xs font-normal text-neutral-700">
            {calendar.footerHasVideo ? (
              <Video className="h-4 w-4 shrink-0 text-indigo-600/90" />
            ) : null}

            <span className="truncate">
              {calendar.footerPreview || 'Sin eventos próximos'}
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

            {notes.totalCount > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-normal text-neutral-850">
                  <Pencil className="h-3 w-3 text-rose-700/90" />
                  {notesCountLabel}
                </span>
              </div>
            ) : null}
          </div>

          <p className="truncate border-t border-white/85 pt-3 text-xs font-normal text-neutral-700">
            {notes.latestTitle
              || (notes.totalCount === 0
                ? 'Aún no tienes notas'
                : 'Toca para ver todas tus notas')}
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
                  {storage.summary
                    ? `${Math.round(storageUsagePercentage)}% usado`
                    : (isLoading ? 'Cargando...' : 'Almacenamiento')}
                </span>

                {storage.unreadNotifications > 0 ? (
                  <span className="rounded-md border border-red-100 bg-red-50/95 px-2.5 py-0.5 text-[10px] font-normal text-red-600">
                    {storage.unreadNotifications > 9
                      ? '9+'
                      : storage.unreadNotifications}{' '}
                    pendiente(s)
                  </span>
                ) : null}
              </div>
            </div>

            <h3 className="mt-2 text-sm font-normal text-neutral-900">
              Archivos
            </h3>

            <p className="text-xs font-normal text-neutral-650">
              {storage.summary
                ? `${formatBytes(storage.summary.used_bytes)} usados de ${formatBytes(storage.summary.quota_bytes)}`
                : 'Almacenamiento'}
            </p>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border border-slate-200/80 bg-white/90">
              <div
                className="h-1.5 rounded-full bg-indigo-400/80 transition-all"
                style={{ width: `${storageUsagePercentage}%` }}
              />
            </div>
          </div>

          <div className="space-y-1 border-t border-white/85 pt-2">
            {storage.recentFiles.length > 0 ? (
              storage.recentFiles.map((file) => (
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
