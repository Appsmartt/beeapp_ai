'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Eye, EyeOff, Loader2, RefreshCw, X } from 'lucide-react';
import {
  discoverCurrentWebExternalCalendars,
  getCurrentWebCalendarIntegrations,
  getCurrentWebExternalCalendars,
  syncCurrentWebCalendarIntegration,
  updateCurrentWebExternalCalendarPreferences,
} from '@beeapp/api-client';
import type { CalendarIntegration, ExternalCalendar } from '@beeapp/shared-types';

interface ExternalCalendarsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function ExternalCalendarsModal({
  isOpen,
  onClose,
  onUpdated,
}: ExternalCalendarsModalProps) {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [calendarsByIntegration, setCalendarsByIntegration] = useState<Record<string, ExternalCalendar[]>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const intRes = await getCurrentWebCalendarIntegrations();
      const list = intRes.integrations || [];
      setIntegrations(list);
      const map: Record<string, ExternalCalendar[]> = {};
      await Promise.all(
        list.map(async (item) => {
          const calRes = await getCurrentWebExternalCalendars(item.id).catch(() => ({ external_calendars: [] }));
          map[item.id] = calRes.external_calendars || [];
        }),
      );
      setCalendarsByIntegration(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los calendarios externos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleDiscoverAndSync = async (integrationId: string) => {
    setBusyId(integrationId);
    setError(null);
    setNotice(null);
    try {
      await discoverCurrentWebExternalCalendars(integrationId);
      await syncCurrentWebCalendarIntegration(integrationId, {});
      await loadData();
      setNotice('Calendarios descubiertos y sincronizados correctamente.');
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible sincronizar esta cuenta.');
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePreference = async (
    extCal: ExternalCalendar,
    patch: { is_selected?: boolean; is_visible?: 'visible' | 'hidden' },
  ) => {
    setBusyId(extCal.id);
    setError(null);
    try {
      const updated = await updateCurrentWebExternalCalendarPreferences(extCal.id, patch);
      setCalendarsByIntegration((prev) => {
        const next = { ...prev };
        for (const intId of Object.keys(next)) {
          next[intId] = (next[intId] || []).map((item) =>
            item.id === extCal.id ? updated.external_calendar : item,
          );
        }
        return next;
      });
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el calendario.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Calendarios externos</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Descubre, selecciona y sincroniza calendarios de Google y Microsoft.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-neutral-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
              <span>Cargando cuentas conectadas...</span>
            </div>
          ) : integrations.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center space-y-2">
              <CalendarDays className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="text-sm font-semibold text-neutral-800">Sin cuentas de calendario conectadas</p>
              <p className="text-xs text-neutral-500">
                Conecta tu cuenta de Google o Microsoft desde Perfil → Integraciones.
              </p>
            </div>
          ) : (
            integrations.map((integration) => {
              const extCalendars = calendarsByIntegration[integration.id] || [];
              const isSyncing = busyId === integration.id;
              return (
                <div
                  key={integration.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {integration.provider_email || integration.provider_display_name || integration.provider}
                      </p>
                      <p className="text-[11px] text-neutral-500 capitalize">
                        {integration.provider} · {integration.status === 'active' ? 'Conectado' : integration.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => void handleDiscoverAndSync(integration.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Descubrir y sincronizar'}</span>
                    </button>
                  </div>

                  {extCalendars.length === 0 ? (
                    <p className="text-xs text-neutral-400">
                      Aún no se han descubierto calendarios en esta cuenta. Haz clic en &quot;Descubrir y sincronizar&quot;.
                    </p>
                  ) : (
                    <div className="divide-y divide-neutral-100 border-t border-neutral-100 pt-2">
                      {extCalendars.map((cal) => {
                        const isBusy = busyId === cal.id;
                        const isVisible = cal.is_visible === 'visible';
                        return (
                          <div key={cal.id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: cal.display_color || cal.provider_color || '#6025D2' }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-neutral-800 truncate">{cal.name}</p>
                                {cal.is_primary && (
                                  <span className="text-[10px] text-brand-primary font-semibold">Principal</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void handleTogglePreference(cal, {
                                    is_visible: isVisible ? 'hidden' : 'visible',
                                  })
                                }
                                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                  isVisible
                                    ? 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'
                                    : 'border-neutral-200 text-neutral-400'
                                }`}
                                title={isVisible ? 'Visible en agenda' : 'Oculto en agenda'}
                              >
                                {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void handleTogglePreference(cal, { is_selected: !cal.is_selected })
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                  cal.is_selected
                                    ? 'bg-brand-primary text-white'
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                              >
                                {cal.is_selected ? 'Sincronizado' : 'Activar'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
