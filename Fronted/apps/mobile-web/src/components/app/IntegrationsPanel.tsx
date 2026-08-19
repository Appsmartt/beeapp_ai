'use client';

import {
  useMemo,
  useState,
} from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unlink,
  X,
} from 'lucide-react';

import {
  useIntegrations,
} from '@/hooks/useIntegrations';
import {
  buildConnectionPresentations,
  isReconnectable,
  PROVIDER_OPTIONS,
  type IntegrationConnectionPresentation,
  type ProviderOption,
} from '@/services/integrationsService';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Inténtalo nuevamente.';
}

export function IntegrationsPanel() {
  const {
    connections,
    loading,
    refreshing,
    error,
    loadIntegrations,
    startAuthorization,
    reauthorize,
    disconnect,
    removeConnectionRecord,
  } = useIntegrations();

  const [isProviderModalOpen, setIsProviderModalOpen] =
    useState(false);

  const [selectedConnection, setSelectedConnection] =
    useState<IntegrationConnectionPresentation | null>(
      null,
    );

  const [actionId, setActionId] = useState<string | null>(
    null,
  );

  const connectionItems = useMemo(
    () => buildConnectionPresentations(connections),
    [connections],
  );

  const redirectToProvider = (
    authorizationUrl: string,
  ) => {
    window.location.assign(authorizationUrl);
  };

  const handleProviderPress = async (
    provider: ProviderOption,
  ) => {
    if (provider.availability !== 'available') {
      return;
    }

    try {
      setActionId(`provider:${provider.provider}`);

      const authorizationUrl = await startAuthorization(
        provider.provider,
        [],
      );

      redirectToProvider(authorizationUrl);
    } catch (connectError) {
      window.alert(
        `No fue posible iniciar la conexión.\n\n${
          getErrorMessage(connectError)
        }`,
      );
    } finally {
      setActionId(null);
    }
  };

  const handleReauthorize = async (
    item: IntegrationConnectionPresentation,
  ) => {
    try {
      setActionId(item.id);

      const authorizationUrl = await reauthorize(
        item.connection.id,
        item.connection.capabilities,
      );

      redirectToProvider(authorizationUrl);
    } catch (reauthorizeError) {
      window.alert(
        `No fue posible iniciar la reconexión.\n\n${
          getErrorMessage(reauthorizeError)
        }`,
      );
    } finally {
      setActionId(null);
    }
  };

  const handleDisconnect = async (
    item: IntegrationConnectionPresentation,
  ) => {
    const shouldDisconnect = window.confirm(
      `¿Desconectar ${item.providerName}?\n\n`
      + `Se eliminará la autorización de ${item.accountLabel} `
      + 'guardada en BeeApp. Podrás vincularla nuevamente '
      + 'cuando quieras.',
    );

    if (!shouldDisconnect) {
      return;
    }

    try {
      setActionId(item.id);

      await disconnect(item.connection.id);

      setSelectedConnection(null);
    } catch (disconnectError) {
      window.alert(
        `No fue posible desconectar la cuenta.\n\n${
          getErrorMessage(disconnectError)
        }`,
      );
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteRecord = async (
    item: IntegrationConnectionPresentation,
  ) => {
    const shouldDelete = window.confirm(
      '¿Eliminar cuenta de la lista?\n\n'
      + `${item.accountLabel} dejará de aparecer en BeeApp. `
      + 'La cuenta ya está desconectada y sus credenciales '
      + 'no se conservan.',
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setActionId(item.id);

      await removeConnectionRecord(item.connection.id);

      setSelectedConnection(null);
    } catch (deleteError) {
      window.alert(
        `No fue posible eliminar la cuenta.\n\n${
          getErrorMessage(deleteError)
        }`,
      );
    } finally {
      setActionId(null);
    }
  };

  const selectedConnectionIsConnected = (
    selectedConnection?.status === 'connected'
  );

  const selectedConnectionCanReconnect = selectedConnection
    ? isReconnectable(selectedConnection.status)
    : false;

  const selectedConnectionCanDelete = selectedConnection
    ? selectedConnection.status !== 'connected'
    : false;

  if (loading) {
    return (
      <div className="min-h-[360px] flex flex-col items-center justify-center gap-3 text-neutral-500">
        <Loader2 className="w-7 h-7 text-brand-primary animate-spin" />

        <p className="text-sm font-medium">
          Cargando integraciones...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-neutral-500 font-normal leading-relaxed">
          Vincula cuentas externas para usar sus permisos de
          forma segura en BeeApp. Nunca guardamos tu contraseña.
        </p>

        <button
          type="button"
          onClick={() => {
            void loadIntegrations(true);
          }}
          disabled={refreshing}
          aria-label="Actualizar integraciones"
          className="w-9 h-9 shrink-0 rounded-xl border border-neutral-200 bg-white text-brand-primary flex items-center justify-center hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw
            className={[
              'w-4 h-4',
              refreshing ? 'animate-spin' : '',
            ].join(' ')}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setIsProviderModalOpen(true)}
        className="w-full min-h-[88px] rounded-2xl bg-brand-primary px-5 py-4 text-left text-white flex items-center gap-4 shadow-sm hover:bg-brand-dark transition-colors"
      >
        <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Plus className="w-5 h-5" />
        </span>

        <span className="flex-1">
          <span className="block text-sm font-bold">
            Vincular cuenta
          </span>

          <span className="block mt-1 text-xs text-white/85">
            Conecta Google, Microsoft y más proveedores.
          </span>
        </span>

        <ChevronRight className="w-5 h-5 shrink-0" />
      </button>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />

          <div>
            <p className="text-sm font-bold text-amber-800">
              No fue posible actualizar
            </p>

            <p className="mt-1 text-xs leading-relaxed text-amber-700">
              {error}
            </p>
          </div>
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
            Cuentas vinculadas
          </h2>

          <span className="min-w-6 h-5 px-1.5 rounded-full bg-purple-100 text-brand-primary text-[11px] font-bold flex items-center justify-center">
            {connectionItems.length}
          </span>
        </div>

        {connectionItems.length > 0 ? (
          <div className="space-y-3">
            {connectionItems.map((item) => {
              const isActing = actionId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedConnection(item)}
                  className="w-full text-left rounded-2xl border border-neutral-200 bg-white p-4 flex items-center gap-3 hover:border-brand-primary/40 hover:bg-neutral-50 transition-colors"
                >
                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{
                      backgroundColor: item.providerIconColor,
                    }}
                  >
                    {item.providerIconLetter}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-neutral-900">
                      {item.accountLabel}
                    </span>

                    <span className="mt-1 flex items-center gap-2 text-xs">
                      <span className="font-medium text-neutral-600">
                        {item.providerName}
                      </span>

                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: item.statusColor,
                        }}
                      />

                      <span
                        className="font-semibold"
                        style={{
                          color: item.statusColor,
                        }}
                      >
                        {isActing
                          ? 'Actualizando...'
                          : item.statusLabel}
                      </span>
                    </span>

                    <span className="mt-1 block truncate text-[11px] text-neutral-500">
                      {item.helperText}
                    </span>
                  </span>

                  <ChevronRight className="w-5 h-5 text-neutral-400 shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
            <span className="mx-auto w-12 h-12 rounded-2xl bg-purple-100 text-brand-primary flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </span>

            <h3 className="mt-4 text-sm font-bold text-neutral-900">
              Aún no tienes cuentas vinculadas
            </h3>

            <p className="mt-2 mx-auto max-w-md text-xs leading-relaxed text-neutral-500">
              Vincula una cuenta para permitir que BeeApp use
              sus permisos cuando los necesites.
            </p>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />

        <div>
          <p className="text-sm font-bold text-neutral-900">
            Autorizaciones protegidas
          </p>

          <p className="mt-1 text-xs leading-relaxed text-neutral-600">
            Las credenciales se guardan cifradas y puedes
            gestionar cada cuenta individualmente.
          </p>
        </div>
      </div>

      {isProviderModalOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="integration-provider-modal-title"
        >
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="integration-provider-modal-title"
                  className="text-lg font-bold text-neutral-900"
                >
                  Vincular una cuenta
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Elige el proveedor que deseas conectar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsProviderModalOpen(false)}
                aria-label="Cerrar"
                className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {PROVIDER_OPTIONS.map((provider) => {
                const isAvailable =
                  provider.availability === 'available';

                const isActing = (
                  actionId
                  === `provider:${provider.provider}`
                );

                return (
                  <button
                    key={provider.provider}
                    type="button"
                    onClick={() => {
                      void handleProviderPress(provider);
                    }}
                    disabled={!isAvailable || isActing}
                    className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left flex items-center gap-4 hover:border-brand-primary/40 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  >
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                      style={{
                        backgroundColor: provider.iconColor,
                      }}
                    >
                      {provider.iconLetter}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">
                          {provider.name}
                        </span>

                        {!isAvailable ? (
                          <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                            Próximamente
                          </span>
                        ) : null}
                      </span>

                      <span className="mt-1 block text-xs leading-relaxed text-neutral-500">
                        {provider.capabilitiesLabel}
                      </span>
                    </span>

                    {isActing ? (
                      <Loader2 className="w-5 h-5 text-brand-primary animate-spin shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-brand-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 flex gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />

              <p className="text-xs leading-relaxed font-medium text-emerald-800">
                Iniciarás sesión directamente con el proveedor.
                BeeApp nunca recibe tu contraseña.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {selectedConnection ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="integration-detail-modal-title"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="integration-detail-modal-title"
                  className="text-lg font-bold text-neutral-900"
                >
                  Cuenta vinculada
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Gestiona la autorización de esta cuenta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedConnection(null)}
                aria-label="Cerrar"
                className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex items-center gap-3">
              <span
                className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
                style={{
                  backgroundColor: (
                    selectedConnection.providerIconColor
                  ),
                }}
              >
                {selectedConnection.providerIconLetter}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-900">
                  {selectedConnection.accountLabel}
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  {selectedConnection.providerName}
                </p>

                <p
                  className="mt-2 text-xs font-bold flex items-center gap-2"
                  style={{
                    color: selectedConnection.statusColor,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: (
                        selectedConnection.statusColor
                      ),
                    }}
                  />

                  {selectedConnection.statusLabel}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Estado de la autorización
              </p>

              <p className="mt-2 text-sm leading-relaxed text-amber-700">
                {selectedConnection.helperText}
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {selectedConnectionCanReconnect ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleReauthorize(selectedConnection);
                  }}
                  disabled={actionId === selectedConnection.id}
                  className="min-h-11 rounded-xl bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-700 disabled:opacity-60"
                >
                  {actionId === selectedConnection.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}

                  Reconectar cuenta
                </button>
              ) : null}

              {selectedConnectionIsConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleDisconnect(selectedConnection);
                  }}
                  disabled={actionId === selectedConnection.id}
                  className="min-h-11 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-100 disabled:opacity-60"
                >
                  <Unlink className="w-4 h-4" />
                  Desconectar cuenta
                </button>
              ) : null}

              {selectedConnectionCanDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleDeleteRecord(selectedConnection);
                  }}
                  disabled={actionId === selectedConnection.id}
                  className="min-h-11 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar de la lista
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}