'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Mail,
  RefreshCw,
  Search,
  Settings,
  SquarePen,
  X,
} from 'lucide-react';

import type {
  MailIntegration,
  MailSyncResponse,
} from '@beeapp/shared-types';

import {
  useMail,
} from '@/hooks/useMail';

import MailCompose, {
  type ComposeDraft,
} from './MailCompose';
import MailDetail from './MailDetail';
import MailFolderRail from './MailFolderRail';
import MailListItem from './MailListItem';
import {
  getEmptyStateCopy,
  getMailFolderLabel,
  MAIL_FOLDERS,
} from './mailFolders';
import {
  getMailIntegrationLabel,
  getReplyAllRecipients,
  getReplyRecipient,
  type MailAccountFilter,
  type MailDetailModel,
  type MailViewFolder,
} from './mailTypes';
import { useHomeModuleSearch, useHomeSearch } from '@/components/client/home/HomeSearchContext';

type SyncFeedbackKind = 'success' | 'warning' | 'error';

interface SyncFeedback {
  kind: SyncFeedbackKind;
  title: string;
  description: string;
}

interface MailModuleProps {
  onOpenIntegrations?: () => void;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Inténtalo nuevamente.';
}

function getSyncFeedback(
  result: MailSyncResponse,
): SyncFeedback {
  const createdCount = result.results.reduce(
    (total, syncResult) => (
      total + syncResult.created_message_count
    ),
    0,
  );

  const updatedCount = result.results.reduce(
    (total, syncResult) => (
      total + syncResult.updated_message_count
    ),
    0,
  );

  if (result.failed_integration_count > 0) {
    const partial = result.synced_integration_count > 0;
    const failure = result.failures.find(item => item.error_code === 'RECONNECT_REQUIRED')
      ?? result.failures[0];
    return {
      kind: partial ? 'warning' : 'error',
      title: partial ? 'Sincronización parcial' : 'No fue posible sincronizar',
      description: failure?.detail || 'Buddy volverá a intentar la sincronización.',
    };
  }

  if (result.results.some(item => item.in_progress || item.has_more)) {
    return {
      kind: 'success',
      title: 'Sincronización en curso',
      description: 'Los correos aparecerán a medida que se importen.',
    };
  }
  if (!result.requested_integration_count) {
    return {
      kind: 'warning',
      title: 'Sin cuentas activas',
      description: 'Revisa la conexión de tu cuenta en Integraciones.',
    };
  }

  if (createdCount > 0 && updatedCount > 0) {
    return {
      kind: 'success',
      title: 'Correos actualizados',
      description: (
        `${createdCount} correo(s) nuevo(s) · `
        + `${updatedCount} actualizado(s).`
      ),
    };
  }

  if (createdCount > 0) {
    return {
      kind: 'success',
      title: 'Correos actualizados',
      description: `${createdCount} correo(s) nuevo(s) ya están disponibles.`,
    };
  }

  if (updatedCount > 0) {
    return {
      kind: 'success',
      title: 'Correos actualizados',
      description: `${updatedCount} correo(s) actualizado(s).`,
    };
  }

  return {
    kind: 'success',
    title: 'Bandeja al día',
    description: 'No se encontraron correos nuevos.',
  };
}

function getProviderColor(
  integration: MailIntegration,
): string {
  return integration.provider === 'google'
    ? '#4285F4'
    : '#0078D4';
}

export default function MailModule({
  onOpenIntegrations,
}: MailModuleProps) {
  const homeSearch = useHomeModuleSearch('correo');
  const { pendingHit, consumePendingHit } = useHomeSearch();
  const [folder, setFolder] = useState<MailViewFolder>('inbox');

  const [account, setAccount] = useState<MailAccountFilter>('all');

  const [search, setSearch] = useState('');

  const [searchInput, setSearchInput] = useState('');

  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(
    null,
  );

  const [selectedEmail, setSelectedEmail] =
    useState<MailDetailModel | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);

  const [draft, setDraft] = useState<ComposeDraft | null>(null);

  const [syncFeedback, setSyncFeedback] =
    useState<SyncFeedback | null>(null);

  const syncFeedbackTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const {
    integrations,
    messages,
    pagination,
    loading,
    loadingMore,
    refreshing,
    syncing,
    updatingMessageId,
    error,
    hasActiveIntegrations,
    loadMore,
    loadMail,
    refreshMail,
    syncInbox,
    getMessageById,
    updateMessageState,
    toggleMessageRead,
    toggleMessageStar,
    archiveMessage,
    trashMessage,
    restoreMessage,
  } = useMail({
    accountFilter: account,
    folder,
    search,
  });

  const readInbox = useRef(loadMail);
  const readingOrEditing = useRef(false);
  useEffect(() => {
    readInbox.current = loadMail;
    readingOrEditing.current = loading || loadingMore || refreshing || syncing || !!updatingMessageId;
  }, [loadMail, loading, loadingMore, refreshing, syncing, updatingMessageId]);

  const selectedIntegration = useMemo(
    () => (
      account === 'all'
        ? null
        : integrations.find(
          (integration) => integration.id === account,
        ) || null
    ),
    [
      account,
      integrations,
    ],
  );

  const selectedIntegrationNeedsAttention = Boolean(
    selectedIntegration
    && (
      selectedIntegration.requires_reauthorization
      || selectedIntegration.status !== 'active'
      || !selectedIntegration.can_sync
    ),
  );
  const reconnectAccounts = integrations.filter(integration =>
    (account === 'all' || account === integration.id)
    && (integration.status === 'error' || integration.status === 'reauth_required'),
  );

  const showNoConnectionState = (
    !loading
    && integrations.length === 0
    && messages.length === 0
  );

  const showNoActiveIntegrationState = (
    !loading
    && integrations.length > 0
    && !hasActiveIntegrations
    && messages.length === 0
  );

  const showSelectedIntegrationAttentionState = (
    !loading
    && !showNoActiveIntegrationState
    && selectedIntegrationNeedsAttention
    && messages.length === 0
  );

  const showEmptyMessagesState = (
    !loading
    && !showNoConnectionState
    && !showNoActiveIntegrationState
    && !showSelectedIntegrationAttentionState
    && messages.length === 0
  );

  const selectedListMessage = messages.find(
    (message) => message.id === selectedId,
  ) || null;

  const clearSyncFeedback = useCallback(() => {
    if (syncFeedbackTimerRef.current) {
      clearTimeout(syncFeedbackTimerRef.current);
      syncFeedbackTimerRef.current = null;
    }

    setSyncFeedback(null);
  }, []);

  const showSyncFeedback = useCallback((
    feedback: SyncFeedback,
  ) => {
    if (syncFeedbackTimerRef.current) {
      clearTimeout(syncFeedbackTimerRef.current);
    }

    setSyncFeedback(feedback);

    syncFeedbackTimerRef.current = setTimeout(
      clearSyncFeedback,
      4_800,
    );
  }, [clearSyncFeedback]);

  useEffect(() => () => {
    if (syncFeedbackTimerRef.current) {
      clearTimeout(syncFeedbackTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const prevHomeSearchActiveRef = useRef(homeSearch.active);
  useEffect(() => {
    if (homeSearch.active) {
      prevHomeSearchActiveRef.current = true;
      setSearchInput(homeSearch.query);
      setSearch(homeSearch.query.trim());
    } else if (prevHomeSearchActiveRef.current) {
      prevHomeSearchActiveRef.current = false;
      setSearchInput('');
      setSearch('');
    }
  }, [
    homeSearch.active,
    homeSearch.query,
  ]);

  useEffect(() => {
    // The server imports mail even when Buddy is closed. Only refresh the displayed view here.
    let pending = false;
    const refresh = () => {
      if (pending || readingOrEditing.current || !navigator.onLine || document.visibilityState !== 'visible') return;
      pending = true;
      void readInbox.current({ refresh: true, reloadIntegrations: true, background: true })
        .finally(() => { pending = false; });
    };
    const intervalId = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, []);

  useEffect(() => {
    setSelectedId(null);
    setSelectedEmail(null);
  }, [
    account,
    folder,
    search,
  ]);

  const openCompose = useCallback((
    nextDraft: ComposeDraft | null = null,
  ) => {
    setDraft(nextDraft);
    setComposeOpen(true);
  }, []);

  const openMessage = useCallback(async (
    messageId: string,
  ) => {
    setSelectedId(messageId);
    setDetailLoading(true);

    try {
      const detail = await getMessageById(messageId);

      setSelectedEmail(detail);

      if (!detail.isRead) {
        try {
          const updated = await updateMessageState(
            messageId,
            {
              is_read: true,
            },
          );

          setSelectedEmail((current) => (
            current
              ? {
                ...current,
                isRead: updated.is_read,
              }
              : current
          ));
        } catch {
          setSelectedEmail((current) => (
            current
              ? {
                ...current,
                isRead: true,
              }
              : current
          ));
        }
      }
    } catch (openError) {
      setSelectedEmail(null);

      showSyncFeedback({
        kind: 'error',
        title: 'No fue posible abrir el correo',
        description: getErrorMessage(openError),
      });
    } finally {
      setDetailLoading(false);
    }
  }, [
    getMessageById,
    showSyncFeedback,
    updateMessageState,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('external') === '1') {
      setAccountMenuOpen(true);
    }
  }, []);

  useEffect(() => {
    if (pendingHit?.kind !== 'correo') return;
    const messageId = pendingHit.id;
    consumePendingHit();
    void openMessage(messageId);
  }, [consumePendingHit, openMessage, pendingHit]);

  const handleSync = useCallback(() => {
    if (syncing) {
      return;
    }

    if (!hasActiveIntegrations || selectedIntegrationNeedsAttention) {
      showSyncFeedback({
        kind: 'warning',
        title: 'Revisa tus cuentas de correo',
        description: (
          'Conecta o reconecta tu cuenta de correo desde Integraciones.'
        ),
      });

      return;
    }

    void (async () => {
      try {
        const result = await syncInbox();

        showSyncFeedback(getSyncFeedback(result));
      } catch (syncError) {
        showSyncFeedback({
          kind: 'error',
          title: 'No fue posible sincronizar',
          description: getErrorMessage(syncError),
        });
      }
    })();
  }, [
    hasActiveIntegrations,
    selectedIntegrationNeedsAttention,
    showSyncFeedback,
    syncInbox,
    syncing,
  ]);

  const handleToggleStar = useCallback((
    messageId: string,
  ) => {
    void (async () => {
      try {
        const updated = await toggleMessageStar(messageId);

        setSelectedEmail((current) => (
          current?.id === messageId
            ? {
              ...current,
              isStarred: updated.is_starred,
            }
            : current
        ));
      } catch (actionError) {
        showSyncFeedback({
          kind: 'error',
          title: 'No fue posible actualizar',
          description: getErrorMessage(actionError),
        });
      }
    })();
  }, [
    showSyncFeedback,
    toggleMessageStar,
  ]);

  const handleToggleRead = useCallback((
    messageId: string,
  ) => {
    void (async () => {
      try {
        const updated = await toggleMessageRead(messageId);

        setSelectedEmail((current) => (
          current?.id === messageId
            ? {
              ...current,
              isRead: updated.is_read,
            }
            : current
        ));
      } catch (actionError) {
        showSyncFeedback({
          kind: 'error',
          title: 'No fue posible actualizar',
          description: getErrorMessage(actionError),
        });
      }
    })();
  }, [
    showSyncFeedback,
    toggleMessageRead,
  ]);

  const handleArchive = useCallback((
    messageId: string,
  ) => {
    void (async () => {
      try {
        await archiveMessage(messageId);

        if (selectedId === messageId) {
          setSelectedId(null);
          setSelectedEmail(null);
        }

        showSyncFeedback({
          kind: 'success',
          title: 'Correo archivado',
          description: 'El correo fue movido a Archivados.',
        });
      } catch (actionError) {
        showSyncFeedback({
          kind: 'error',
          title: 'No fue posible archivar',
          description: getErrorMessage(actionError),
        });
      }
    })();
  }, [
    archiveMessage,
    selectedId,
    showSyncFeedback,
  ]);

  const handleTrash = useCallback((
    messageId: string,
  ) => {
    const confirmed = window.confirm(
      '¿Mover este correo a la papelera?',
    );

    if (!confirmed) {
      return;
    }

    void (async () => {
      try {
        await trashMessage(messageId);

        if (selectedId === messageId) {
          setSelectedId(null);
          setSelectedEmail(null);
        }

        showSyncFeedback({
          kind: 'success',
          title: 'Correo movido a papelera',
          description: 'Podrás encontrarlo temporalmente en Papelera.',
        });
      } catch (actionError) {
        showSyncFeedback({
          kind: 'error',
          title: 'No fue posible mover el correo',
          description: getErrorMessage(actionError),
        });
      }
    })();
  }, [
    selectedId,
    showSyncFeedback,
    trashMessage,
  ]);

  const handleRestore = useCallback((
    messageId: string,
  ) => {
    void (async () => {
      try {
        await restoreMessage(messageId);

        if (selectedId === messageId) {
          setSelectedId(null);
          setSelectedEmail(null);
        }

        showSyncFeedback({
          kind: 'success',
          title: 'Correo restaurado',
          description: 'El correo volvió a tu bandeja de recibidos.',
        });
      } catch (actionError) {
        showSyncFeedback({
          kind: 'error',
          title: 'No fue posible restaurar',
          description: getErrorMessage(actionError),
        });
      }
    })();
  }, [
    restoreMessage,
    selectedId,
    showSyncFeedback,
  ]);

  const feedbackStyles = syncFeedback?.kind === 'success'
    ? {
      icon: (
        <CheckCircle2 className="h-5 w-5 text-emerald-700" />
      ),
      wrapper: 'border-emerald-200 bg-emerald-50',
      title: 'text-emerald-800',
      description: 'text-emerald-700',
    }
    : syncFeedback?.kind === 'warning'
      ? {
        icon: (
          <AlertTriangle className="h-5 w-5 text-amber-700" />
        ),
        wrapper: 'border-amber-200 bg-amber-50',
        title: 'text-amber-800',
        description: 'text-amber-700',
      }
      : {
        icon: (
          <AlertTriangle className="h-5 w-5 text-red-700" />
        ),
        wrapper: 'border-red-200 bg-red-50',
        title: 'text-red-800',
        description: 'text-red-700',
      };

  const emptyState = getEmptyStateCopy(
    folder,
    account !== 'all',
  );

  const readingOpen = selectedId !== null;

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-white">
      <MailFolderRail
        folder={folder}
        onSelectFolder={setFolder}
        messages={messages}
      />

      <section
        className={`h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-neutral-200 bg-white md:flex md:w-[min(40%,460px)] md:max-w-[460px] md:flex-none ${
          readingOpen ? 'hidden' : 'flex flex-1'
        }`}
      >
        <header className="shrink-0 space-y-3 border-b border-neutral-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => setAccountMenuOpen(
                  (current) => !current,
                )}
                className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-neutral-900 transition-colors hover:text-brand-primary"
              >
                <span className="truncate">
                  {account === 'all'
                    ? 'Todas las cuentas'
                    : (
                      integrations.find(
                        (integration) => integration.id === account,
                      )
                        ? getMailIntegrationLabel(
                          integrations.find(
                            (integration) => integration.id === account,
                          ) as MailIntegration,
                        )
                        : 'Cuenta seleccionada'
                    )}
                </span>

                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" />
              </button>

              {accountMenuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Cerrar menú de cuentas"
                    onClick={() => setAccountMenuOpen(false)}
                    className="fixed inset-0 z-20 cursor-default"
                  />

                  <div className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setAccount('all');
                        setAccountMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-50 ${
                        account === 'all'
                          ? 'font-semibold text-brand-primary'
                          : 'font-normal text-neutral-700'
                      }`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Todas las cuentas
                    </button>

                    {integrations.map((integration) => {
                      const isSelected = account === integration.id;

                      return (
                        <button
                          key={integration.id}
                          type="button"
                          onClick={() => {
                            setAccount(integration.id);
                            setAccountMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-50 ${
                            isSelected
                              ? 'font-semibold text-brand-primary'
                              : 'font-normal text-neutral-700'
                          }`}
                        >
                          <span
                            style={{
                              backgroundColor: getProviderColor(integration),
                              opacity: (
                                integration.status === 'active'
                                && integration.can_sync
                              )
                                ? 1
                                : 0.45,
                            }}
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                          />

                          <span className="min-w-0 flex-1 truncate">
                            {getMailIntegrationLabel(integration)}
                          </span>

                          {(
                            integration.status !== 'active'
                            || !integration.can_sync
                          ) ? (
                            <span className="text-[10px] text-amber-600">
                              Atención
                            </span>
                          ) : null}
                        </button>
                      );
                    })}

                    <div className="my-1 h-px bg-neutral-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenIntegrations?.();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-brand-primary transition-colors hover:bg-neutral-50"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Gestionar integraciones
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                title="Sincronizar correos"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-brand-primary disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    syncing ? 'animate-spin' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => openCompose()}
                className="flex h-9 items-center gap-1.5 rounded-full bg-brand-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                <SquarePen className="h-4 w-4" />
                Redactar
              </button>
            </div>
          </div>

          <label className="flex h-9 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 transition-colors focus-within:border-brand-primary focus-within:bg-white">
            <Search className="h-4 w-4 shrink-0 text-neutral-400" />

            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(
                event.target.value,
              )}
              placeholder="Buscar correos"
              className="min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400"
            />

            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Limpiar búsqueda"
                className="text-neutral-400 transition-colors hover:text-neutral-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500">
              {getMailFolderLabel(folder)}
            </span>

            <span className="text-[11px] text-neutral-400">
              {loading
                ? 'Cargando...'
                : `${pagination.total_count} correo(s)`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:hidden no-scrollbar">
            {MAIL_FOLDERS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFolder(opt.key)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  folder === opt.key
                    ? 'bg-brand-primary text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        {reconnectAccounts.length > 0 && messages.length > 0 && !loading ? (
          <div role="status" className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            Vuelve a conectar {reconnectAccounts.map(getMailIntegrationLabel).join(', ')} para recibir correos nuevos.
            {onOpenIntegrations && (
              <button type="button" onClick={onOpenIntegrations} className="ml-2 font-semibold text-brand-primary">
                Ir a Integraciones
              </button>
            )}
          </div>
        ) : null}

        {error && !loading ? (
          <div className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800">
              No fue posible actualizar algunos datos
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void refreshMail()}
              className="mt-2 text-[11px] font-semibold text-brand-primary"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6"
          onScroll={(event) => {
            const element = event.currentTarget;

            const distanceToBottom = (
              element.scrollHeight
              - element.scrollTop
              - element.clientHeight
            );

            if (distanceToBottom < 180) {
              void loadMore();
            }
          }}
        >
          {loading ? (
            <div className="space-y-px">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div
                  key={index}
                  className="flex gap-3 px-4 py-4"
                >
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-100" />

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-2/5 animate-pulse rounded bg-neutral-100" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-neutral-100" />
                    <div className="h-3 w-3/5 animate-pulse rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : showNoConnectionState ? (
            <EmptyState
              icon={<Mail className="h-9 w-9" />}
              title="Configura tu correo"
              description="Conecta una cuenta de Gmail u Outlook para ver y sincronizar tus correos en Buddy."
              actionLabel="Ir a integraciones"
              onAction={onOpenIntegrations}
            />
          ) : showNoActiveIntegrationState ? (
            <EmptyState
              warning
              icon={<AlertTriangle className="h-9 w-9" />}
              title="Revisa tus cuentas de correo"
              description="Tus cuentas conectadas no están disponibles para sincronizar. Reconecta una cuenta o revisa sus permisos."
              actionLabel="Revisar integraciones"
              onAction={onOpenIntegrations}
            />
          ) : showSelectedIntegrationAttentionState ? (
            <EmptyState
              warning
              icon={<AlertTriangle className="h-9 w-9" />}
              title="Esta cuenta requiere atención"
              description={
                selectedIntegration?.status_reason
                || (
                  'Reconecta esta cuenta o revisa sus permisos '
                  + 'para volver a consultar sus correos.'
                )
              }
              actionLabel="Revisar integraciones"
              onAction={onOpenIntegrations}
              secondaryActionLabel="Ver todas las cuentas"
              onSecondaryAction={() => setAccount('all')}
            />
          ) : showEmptyMessagesState ? (
            <EmptyState
              icon={<Mail className="h-9 w-9" />}
              title={emptyState.title}
              description={emptyState.description}
              actionLabel={
                hasActiveIntegrations
                  ? 'Actualizar correos'
                  : undefined
              }
              onAction={
                hasActiveIntegrations
                  ? handleSync
                  : undefined
              }
            />
          ) : (
            <>
              <div className="divide-y divide-neutral-100">
                {messages.map((message) => (
                  <MailListItem
                    key={message.id}
                    email={message}
                    isSelected={selectedId === message.id}
                    isUpdating={
                      updatingMessageId === message.id
                    }
                    onOpen={() => {
                      void openMessage(message.id);
                    }}
                    onToggleStar={() => {
                      handleToggleStar(message.id);
                    }}
                    onToggleRead={() => {
                      handleToggleRead(message.id);
                    }}
                    onArchive={() => {
                      handleArchive(message.id);
                    }}
                    onDelete={() => {
                      handleTrash(message.id);
                    }}
                  />
                ))}
              </div>

              {loadingMore ? (
                <div className="flex items-center justify-center gap-2 py-5 text-xs text-neutral-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                  Cargando más correos...
                </div>
              ) : null}

              {!pagination.has_more && messages.length > 0 ? (
                <p className="py-5 text-center text-[11px] text-neutral-400">
                  No hay más correos para mostrar.
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>

      <main
        className={`h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-neutral-50/50 ${
          readingOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        {detailLoading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setSelectedEmail(null);
              }}
              className="mb-6 text-sm font-medium text-neutral-600 md:hidden"
            >
              Volver a la lista
            </button>
            <div className="text-center">
              <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />

              <p className="mt-3 text-xs text-neutral-500">
                Cargando correo...
              </p>
            </div>
          </div>
        ) : selectedEmail ? (
          <MailDetail
            email={selectedEmail}
            actionLoading={
              updatingMessageId === selectedEmail.id
            }
            onBack={() => {
              setSelectedId(null);
              setSelectedEmail(null);
            }}
            onToggleStar={handleToggleStar}
            onArchive={handleArchive}
            onDelete={handleTrash}
            onRestore={handleRestore}
            onReply={(mail) => {
              const to = getReplyRecipient(mail);
              if (!to.trim()) {
                showSyncFeedback({
                  kind: 'warning',
                  title: 'Sin destinatario de respuesta',
                  description: 'Este correo no incluye una dirección válida para responder.',
                });
                return;
              }
              openCompose({
                to,
                subject: mail.subject.toLowerCase().startsWith('re:') ? mail.subject : `Re: ${mail.subject}`,
              });
            }}
            onReplyAll={(mail) => {
              const to = getReplyAllRecipients(mail);
              if (!to.trim()) {
                showSyncFeedback({
                  kind: 'warning',
                  title: 'Sin destinatarios',
                  description: 'Este correo no incluye destinatarios válidos para responder a todos.',
                });
                return;
              }
              openCompose({
                to,
                subject: mail.subject.toLowerCase().startsWith('re:') ? mail.subject : `Re: ${mail.subject}`,
              });
            }}
            onForward={(mail) => openCompose({
              subject: mail.subject.toLowerCase().startsWith('fwd:') ? mail.subject : `Fwd: ${mail.subject}`,
              body: `\n\n---------- Mensaje reenviado ----------\nDe: ${mail.senderName} <${mail.senderEmail}>\nAsunto: ${mail.subject}\n\n${mail.body || ''}`,
            })}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-12 text-center">
            <div className="max-w-xs space-y-3">
              {readingOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setSelectedEmail(null);
                  }}
                  className="text-sm font-medium text-neutral-600 md:hidden"
                >
                  Volver a la lista
                </button>
              ) : null}
              <Mail className="mx-auto h-12 w-12 text-neutral-300" />

              <h3 className="text-sm font-semibold text-neutral-700">
                Ningún correo seleccionado
              </h3>

              <p className="text-xs leading-relaxed text-neutral-500">
                Selecciona un correo de la lista para leer su contenido.
              </p>

              {selectedListMessage ? (
                <button
                  type="button"
                  onClick={() => {
                    void openMessage(selectedListMessage.id);
                  }}
                  className="text-xs font-semibold text-brand-primary"
                >
                  Reintentar abrir correo
                </button>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {syncFeedback ? (
        <div
          className={`fixed left-1/2 top-5 z-[70] flex w-[min(92vw,520px)] -translate-x-1/2 items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${feedbackStyles.wrapper}`}
          role="status"
        >
          <span className="mt-0.5 shrink-0">
            {feedbackStyles.icon}
          </span>

          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${feedbackStyles.title}`}>
              {syncFeedback.title}
            </p>

            <p className={`mt-0.5 text-xs leading-relaxed ${feedbackStyles.description}`}>
              {syncFeedback.description}
            </p>
          </div>

          <button
            type="button"
            onClick={clearSyncFeedback}
            aria-label="Cerrar mensaje"
            className="shrink-0 rounded-lg p-1 text-neutral-500 transition-colors hover:bg-white/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <MailCompose
        isOpen={composeOpen}
        integrations={integrations}
        draft={draft}
        onClose={() => setComposeOpen(false)}
        onSent={async () => {
          showSyncFeedback({
            kind: 'success',
            title: 'Correo enviado',
            description: 'Tu correo se envió correctamente.',
          });

          setFolder('sent');
          await refreshMail();
        }}
        onOpenIntegrations={() => {
          setComposeOpen(false);
          onOpenIntegrations?.();
        }}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  warning = false,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  warning?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <div className="flex h-full min-h-full flex-col items-center justify-center px-10 py-10 text-center">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full border ${
          warning
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-neutral-200 bg-neutral-100 text-neutral-400'
        }`}
      >
        {icon}
      </div>

      <h3 className="mt-5 text-base font-semibold text-neutral-900">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-relaxed text-neutral-500">
        {description}
      </p>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={`mt-5 rounded-full px-4 py-2.5 text-xs font-semibold text-white transition-colors ${
            warning
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-brand-primary hover:bg-brand-dark'
          }`}
        >
          {actionLabel}
        </button>
      ) : null}

      {secondaryActionLabel && onSecondaryAction ? (
        <button
          type="button"
          onClick={onSecondaryAction}
          className="mt-3 text-xs font-semibold text-brand-primary"
        >
          {secondaryActionLabel}
        </button>
      ) : null}
    </div>
  );
}
