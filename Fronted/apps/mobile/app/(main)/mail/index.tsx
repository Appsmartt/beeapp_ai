import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useFocusEffect,
} from 'expo-router';
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  RefreshCw,
  Settings2,
  SquarePen,
  X,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
} from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import MailHeader, {
  type MailAccountFilter,
  type MailAccountOption,
} from '../../../src/components/mail/MailHeader';
import MailFolderChips, {
  type MailFolder,
} from '../../../src/components/mail/MailFolderChips';
import MailListItem from '../../../src/components/mail/MailListItem';
import {
  useMail,
} from '../../../src/hooks/useMail';
import {
  getMailIntegrationLabel,
} from '../../../src/services/mailService';

const FAB_BOTTOM_OFFSET = 105;
const SYNC_FEEDBACK_DURATION_MS = 4_800;

const MAIL_FOCUSED_REFRESH_INTERVAL_MS = 60_000;
const MAIL_UNFOCUSED_SYNC_INTERVAL_MS = 5 * 60_000;

type SyncFeedbackKind = 'success' | 'warning' | 'error';

interface SyncFeedback {
  kind: SyncFeedbackKind;
  title: string;
  description: string;
}

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'Inténtalo nuevamente.';
}

function getSyncFeedback(
  createdCount: number,
  updatedCount: number,
  failedCount: number,
): SyncFeedback {
  if (failedCount > 0) {
    if (createdCount === 0 && updatedCount === 0) {
      return {
        kind: 'error',
        title: 'No fue posible sincronizar',
        description: (
          `${failedCount} cuenta(s) requieren atención. `
          + 'Revisa Correo externo e inténtalo nuevamente.'
        ),
      };
    }

    return {
      kind: 'warning',
      title: 'Sincronización parcial',
      description: (
        `${createdCount} nuevo(s) · ${updatedCount} actualizado(s). `
        + `${failedCount} cuenta(s) requieren atención.`
      ),
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
      description: (
        `${createdCount} correo(s) nuevo(s) `
        + 'ya están disponibles.'
      ),
    };
  }

  if (updatedCount > 0) {
    return {
      kind: 'success',
      title: 'Correos actualizados',
      description: (
        `${updatedCount} correo(s) actualizado(s).`
      ),
    };
  }

  return {
    kind: 'success',
    title: 'Bandeja al día',
    description: 'No se encontraron correos nuevos.',
  };
}

function getEmptyStateCopy(
  activeFolder: MailFolder,
  activeAccount: MailAccountFilter,
): {
  title: string;
  description: string;
} {
  if (activeAccount !== 'all') {
    return {
      title: 'Sin correos en esta cuenta',
      description: (
        'No hay correos que coincidan con los filtros '
        + 'seleccionados para esta cuenta.'
      ),
    };
  }

  switch (activeFolder) {
    case 'unread':
      return {
        title: 'No tienes correos sin leer',
        description: (
          'Cuando recibas un correo nuevo aparecerá '
          + 'en esta sección.'
        ),
      };

    case 'starred':
      return {
        title: 'No tienes correos importantes',
        description: (
          'Marca correos como importantes para '
          + 'encontrarlos rápidamente aquí.'
        ),
      };

    case 'sent':
      return {
        title: 'No tienes correos enviados',
        description: (
          'Los correos enviados desde tus cuentas '
          + 'conectadas aparecerán aquí.'
        ),
      };

    case 'drafts':
      return {
        title: 'No tienes borradores',
        description: (
          'Los correos que guardes como borrador '
          + 'aparecerán aquí.'
        ),
      };

    case 'archived':
      return {
        title: 'No tienes correos archivados',
        description: (
          'Los correos que archives aparecerán '
          + 'en esta carpeta.'
        ),
      };

    case 'spam':
      return {
        title: 'No tienes correos en spam',
        description: (
          'Los mensajes marcados como spam aparecerán '
          + 'en esta carpeta.'
        ),
      };

    case 'trash':
      return {
        title: 'La papelera está vacía',
        description: (
          'Los correos que elimines aparecerán '
          + 'temporalmente aquí.'
        ),
      };

    default:
      return {
        title: 'Bandeja vacía',
        description: (
          'No hay correos en esta carpeta que coincidan '
          + 'con los filtros activos.'
        ),
      };
  }
}

export default function MailInboxScreen() {
  const router = useModuleNav();

  const [
    activeAccount,
    setActiveAccount,
  ] = useState<MailAccountFilter>('all');

  const [
    accountMenuVisible,
    setAccountMenuVisible,
  ] = useState(false);

  const [
    activeFolder,
    setActiveFolder,
  ] = useState<MailFolder>('inbox');

  const [
    swipeActiveId,
    setSwipeActiveId,
  ] = useState<string | null>(null);

  const [
    syncFeedback,
    setSyncFeedback,
  ] = useState<SyncFeedback | null>(null);

  const isScreenFocusedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const feedbackTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const feedbackAnimation = useRef(
    new Animated.Value(0),
  ).current;

  const {
    integrations,
    messages,
    pagination,
    loading,
    loadingMore,
    syncing,
    updatingMessageId,
    error,
    hasActiveIntegrations,
    refreshMailIfStale,
    syncInbox,
    syncInboxIfStale,
    loadMore,
    toggleMessageRead,
    toggleMessageStar,
    archiveMessage,
    trashMessage,
  } = useMail({
    accountFilter: activeAccount,
    folder: activeFolder,
  });

  const accountOptions = useMemo<MailAccountOption[]>(
    () => integrations.map((integration) => ({
      id: integration.id,
      label: getMailIntegrationLabel(integration),
      provider: integration.provider,
      isActive: (
        integration.status === 'active'
        && integration.can_sync
      ),
    })),
    [integrations],
  );

  const selectedIntegration = useMemo(
    () => (
      activeAccount === 'all'
        ? null
        : (
          integrations.find(
            (integration) => integration.id === activeAccount,
          )
          || null
        )
    ),
    [
      activeAccount,
      integrations,
    ],
  );

  const selectedIntegrationNeedsAttention = Boolean(
    selectedIntegration
    && (
      selectedIntegration.requires_reauthorization
      || selectedIntegration.status !== 'active'
      || !selectedIntegration.can_sync
    )
  );

  const hideSyncFeedback = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    Animated.timing(
      feedbackAnimation,
      {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      },
    ).start(() => {
      setSyncFeedback(null);
    });
  }, [feedbackAnimation]);

  const showSyncFeedback = useCallback((
    feedback: SyncFeedback,
  ) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setSyncFeedback(feedback);

    Animated.timing(
      feedbackAnimation,
      {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      },
    ).start();

    feedbackTimerRef.current = setTimeout(() => {
      hideSyncFeedback();
    }, SYNC_FEEDBACK_DURATION_MS);
  }, [
    feedbackAnimation,
    hideSyncFeedback,
  ]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const runFocusedRefresh = useCallback(() => {
    if (
      !isScreenFocusedRef.current
      || appStateRef.current !== 'active'
    ) {
      return;
    }

    void refreshMailIfStale(
      MAIL_FOCUSED_REFRESH_INTERVAL_MS,
    ).catch(() => {
      // El caché sigue disponible si la revalidación falla.
    });

    void syncInboxIfStale(
      MAIL_FOCUSED_REFRESH_INTERVAL_MS,
    ).catch(() => {
      // La sincronización automática nunca debe interrumpir al usuario.
    });
  }, [
    refreshMailIfStale,
    syncInboxIfStale,
  ]);

  const runUnfocusedSync = useCallback(() => {
    if (
      isScreenFocusedRef.current
      || appStateRef.current !== 'active'
    ) {
      return;
    }

    void syncInboxIfStale(
      MAIL_UNFOCUSED_SYNC_INTERVAL_MS,
    ).catch(() => {
      // El sync silencioso se reintentará en el próximo ciclo.
    });
  }, [syncInboxIfStale]);

  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      runFocusedRefresh();

      return () => {
        isScreenFocusedRef.current = false;
      };
    }, [runFocusedRefresh]),
  );

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        appStateRef.current = nextAppState;

        if (nextAppState === 'active') {
          if (isScreenFocusedRef.current) {
            runFocusedRefresh();
          } else {
            runUnfocusedSync();
          }
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [
    runFocusedRefresh,
    runUnfocusedSync,
  ]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isScreenFocusedRef.current) {
        runFocusedRefresh();
      } else {
        runUnfocusedSync();
      }
    }, MAIL_FOCUSED_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    runFocusedRefresh,
    runUnfocusedSync,
  ]);

  const getUnreadCount = useCallback((
    folder: string,
  ) => {
    if (folder === 'unread') {
      return messages.filter(
        (message) => !message.isRead,
      ).length;
    }

    if (folder === 'starred') {
      return messages.filter(
        (message) => message.isStarred,
      ).length;
    }

    return 0;
  }, [messages]);

  const handleSelectAccount = useCallback((
    account: MailAccountFilter,
  ) => {
    setActiveAccount(account);
    setAccountMenuVisible(false);
    setSwipeActiveId(null);
  }, []);

  const handleFolderChange = useCallback((
    folder: MailFolder,
  ) => {
    setActiveFolder(folder);
    setSwipeActiveId(null);
  }, []);

  const handleOpenExternalMail = useCallback(() => {
    setAccountMenuVisible(false);

    router.push(
      '/(main)/mail/external-mail',
    );
  }, [router]);

  const handleSync = useCallback(() => {
    if (syncing) {
      return;
    }

    if (!hasActiveIntegrations) {
      Alert.alert(
        'Revisa tus cuentas de correo',
        (
          'No hay cuentas listas para sincronizar. '
          + 'Revisa Correo externo para conectar una cuenta '
          + 'o reconectar una autorización vencida.'
        ),
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Correo externo',
            onPress: handleOpenExternalMail,
          },
        ],
      );

      return;
    }

    void (async () => {
      try {
        const result = await syncInbox();

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

        showSyncFeedback(
          getSyncFeedback(
            createdCount,
            updatedCount,
            result.failed_integration_count,
          ),
        );
      } catch (syncError) {
        showSyncFeedback({
          kind: 'error',
          title: 'No fue posible sincronizar',
          description: getErrorMessage(syncError),
        });
      }
    })();
  }, [
    handleOpenExternalMail,
    hasActiveIntegrations,
    showSyncFeedback,
    syncInbox,
    syncing,
  ]);

  const handleToggleStar = useCallback((
    messageId: string,
  ) => {
    void (async () => {
      try {
        await toggleMessageStar(messageId);
        setSwipeActiveId(null);
      } catch (updateError) {
        Alert.alert(
          'No fue posible actualizar',
          getErrorMessage(updateError),
        );
      }
    })();
  }, [
    toggleMessageStar,
  ]);

  const handleToggleRead = useCallback((
    messageId: string,
  ) => {
    void (async () => {
      try {
        await toggleMessageRead(messageId);
        setSwipeActiveId(null);
      } catch (updateError) {
        Alert.alert(
          'No fue posible actualizar',
          getErrorMessage(updateError),
        );
      }
    })();
  }, [
    toggleMessageRead,
  ]);

  const handleArchive = useCallback((
    messageId: string,
  ) => {
    void (async () => {
      try {
        await archiveMessage(messageId);
        setSwipeActiveId(null);
      } catch (archiveError) {
        Alert.alert(
          'No fue posible archivar',
          getErrorMessage(archiveError),
        );
      }
    })();
  }, [
    archiveMessage,
  ]);

  const handleTrash = useCallback((
    messageId: string,
  ) => {
    Alert.alert(
      'Mover a la papelera',
      (
        'El correo se moverá a la papelera de tu cuenta '
        + 'conectada.'
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await trashMessage(messageId);
                setSwipeActiveId(null);
              } catch (trashError) {
                Alert.alert(
                  'No fue posible mover el correo',
                  getErrorMessage(trashError),
                );
              }
            })();
          },
        },
      ],
    );
  }, [
    trashMessage,
  ]);

  const emptyState = getEmptyStateCopy(
    activeFolder,
    activeAccount,
  );

  const showNoConnectionState = (
    !loading
    && integrations.length === 0
  );

  const showNoActiveIntegrationState = (
    !loading
    && integrations.length > 0
    && !hasActiveIntegrations
  );

  const showSelectedIntegrationAttentionState = (
    !loading
    && !showNoActiveIntegrationState
    && selectedIntegrationNeedsAttention
  );

  const showEmptyMessagesState = (
    !loading
    && !showNoConnectionState
    && !showNoActiveIntegrationState
    && !showSelectedIntegrationAttentionState
    && messages.length === 0
  );

  const feedbackColor = syncFeedback?.kind === 'success'
    ? '#15803D'
    : syncFeedback?.kind === 'warning'
      ? '#B45309'
      : colors.semantic.error;

  const feedbackBackground = syncFeedback?.kind === 'success'
    ? '#F0FDF4'
    : syncFeedback?.kind === 'warning'
      ? '#FFFBEB'
      : '#FEF2F2';

  const feedbackBorder = syncFeedback?.kind === 'success'
    ? '#BBF7D0'
    : syncFeedback?.kind === 'warning'
      ? '#FDE68A'
      : '#FECACA';

  const feedbackTranslateY = feedbackAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MailHeader
          activeAccount={activeAccount}
          accounts={accountOptions}
          menuVisible={accountMenuVisible}
          syncing={syncing}
          onToggleMenu={() => {
            setAccountMenuVisible((visible) => !visible);
          }}
          onSelectAccount={handleSelectAccount}
          onRefresh={handleSync}
          onBack={
            router.canGoBack
              ? () => router.back()
              : undefined
          }
          onCompose={
            router.embedded
              ? () => {
                router.push(
                  '/(main)/mail/compose',
                );
              }
              : undefined
          }
          onConnectAccount={() => {
            setAccountMenuVisible(false);

            router.push(
              '/(main)/profile/integrations',
            );
          }}
          onManageExternalMail={handleOpenExternalMail}
        />

        <MailFolderChips
          activeFolder={activeFolder}
          onFolderChange={handleFolderChange}
          getUnreadCount={getUnreadCount}
        />

        {syncFeedback ? (
          <Animated.View
            style={[
              styles.syncFeedbackCard,
              {
                opacity: feedbackAnimation,
                transform: [
                  {
                    translateY: feedbackTranslateY,
                  },
                ],
                backgroundColor: feedbackBackground,
                borderColor: feedbackBorder,
              },
            ]}
          >
            <View style={styles.syncFeedbackIconBox}>
              {syncFeedback.kind === 'success' ? (
                <CheckCircle2
                  size={20}
                  color={feedbackColor}
                />
              ) : (
                <AlertTriangle
                  size={20}
                  color={feedbackColor}
                />
              )}
            </View>

            <View style={styles.syncFeedbackContent}>
              <Text
                style={[
                  styles.syncFeedbackTitle,
                  {
                    color: feedbackColor,
                  },
                ]}
              >
                {syncFeedback.title}
              </Text>

              <Text style={styles.syncFeedbackDescription}>
                {syncFeedback.description}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.syncFeedbackCloseButton}
              onPress={hideSyncFeedback}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cerrar resultado de sincronización"
            >
              <X
                size={16}
                color={feedbackColor}
              />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />

            <Text style={styles.loadingText}>
              Cargando tus correos...
            </Text>
          </View>
        ) : showNoConnectionState ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Mail
                size={40}
                color={colors.neutral.gray500}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Configura tu correo
            </Text>

            <Text style={styles.emptyDesc}>
              Conecta una cuenta de Gmail u Outlook para
              ver y sincronizar tus correos en BeeApp.
            </Text>

            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleOpenExternalMail}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Abrir Correo externo"
            >
              <Settings2
                size={17}
                color={colors.neutral.white}
              />

              <Text style={styles.connectButtonText}>
                Abrir Correo externo
              </Text>
            </TouchableOpacity>
          </View>
        ) : showNoActiveIntegrationState ? (
          <View style={styles.emptyContainer}>
            <View style={styles.warningIconBg}>
              <AlertTriangle
                size={38}
                color="#B45309"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Revisa tus cuentas de correo
            </Text>

            <Text style={styles.emptyDesc}>
              Tus cuentas conectadas no están disponibles
              para sincronizar. Reconecta una cuenta o revisa
              sus permisos desde Correo externo.
            </Text>

            <TouchableOpacity
              style={styles.warningActionButton}
              onPress={handleOpenExternalMail}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Revisar Correo externo"
            >
              <Settings2
                size={17}
                color={colors.neutral.white}
              />

              <Text style={styles.connectButtonText}>
                Revisar Correo externo
              </Text>
            </TouchableOpacity>
          </View>
        ) : showSelectedIntegrationAttentionState ? (
          <View style={styles.emptyContainer}>
            <View style={styles.warningIconBg}>
              <AlertTriangle
                size={38}
                color="#B45309"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Esta cuenta requiere atención
            </Text>

            <Text style={styles.emptyDesc}>
              {(
                selectedIntegration?.status_reason
                || (
                  'Reconecta esta cuenta o revisa sus permisos '
                  + 'para volver a consultar sus correos.'
                )
              )}
            </Text>

            <TouchableOpacity
              style={styles.warningActionButton}
              onPress={handleOpenExternalMail}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Revisar Correo externo"
            >
              <Settings2
                size={17}
                color={colors.neutral.white}
              />

              <Text style={styles.connectButtonText}>
                Revisar Correo externo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.showAllAccountsButton}
              onPress={() => {
                handleSelectAccount('all');
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Mostrar todas las cuentas"
            >
              <Text style={styles.showAllAccountsText}>
                Ver todas las cuentas
              </Text>
            </TouchableOpacity>
          </View>
        ) : showEmptyMessagesState ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Mail
                size={40}
                color={colors.neutral.gray500}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {emptyState.title}
            </Text>

            <Text style={styles.emptyDesc}>
              {emptyState.description}
            </Text>

            {hasActiveIntegrations ? (
              <TouchableOpacity
                style={styles.refreshEmptyButton}
                onPress={handleSync}
                disabled={syncing}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Sincronizar correos externos"
              >
                {syncing ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                  />
                ) : (
                  <RefreshCw
                    size={16}
                    color={colors.brand.primary}
                    style={styles.refreshIcon}
                  />
                )}

                <Text style={styles.refreshEmptyText}>
                  {syncing
                    ? 'Sincronizando correos...'
                    : 'Actualizar correos'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <ScrollView
            style={styles.mailListScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={(
              <RefreshControl
                refreshing={syncing}
                onRefresh={handleSync}
                tintColor={colors.brand.primary}
                colors={[colors.brand.primary]}
              />
            )}
            onScroll={({ nativeEvent }) => {
              const {
                contentOffset,
                contentSize,
                layoutMeasurement,
              } = nativeEvent;

              const distanceToBottom = (
                contentSize.height
                - (
                  contentOffset.y
                  + layoutMeasurement.height
                )
              );

              if (distanceToBottom < 180) {
                void loadMore();
              }
            }}
            scrollEventThrottle={200}
          >
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  No fue posible actualizar algunos datos
                </Text>

                <Text style={styles.errorText}>
                  {error}
                </Text>

                <TouchableOpacity
                  onPress={handleSync}
                  style={styles.retryButton}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Reintentar sincronización de correos"
                >
                  <Text style={styles.retryButtonText}>
                    Reintentar sincronización
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {messages.map((item) => {
              const isSwipeActive = (
                swipeActiveId === item.id
              );

              return (
                <MailListItem
                  key={item.id}
                  item={item}
                  isSwipeActive={isSwipeActive}
                  isUpdating={
                    updatingMessageId === item.id
                  }
                  onPress={() => {
                    router.push({
                      pathname: '/(main)/mail/detail',
                      params: {
                        id: item.id,
                      },
                    });
                  }}
                  onLongPress={() => {
                    setSwipeActiveId(
                      isSwipeActive
                        ? null
                        : item.id,
                    );
                  }}
                  onToggleStar={() => {
                    handleToggleStar(item.id);
                  }}
                  onToggleRead={() => {
                    handleToggleRead(item.id);
                  }}
                  onArchive={() => {
                    handleArchive(item.id);
                  }}
                  onDelete={() => {
                    handleTrash(item.id);
                  }}
                />
              );
            })}

            {loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator
                  size="small"
                  color={colors.brand.primary}
                />

                <Text style={styles.loadingMoreText}>
                  Cargando más correos...
                </Text>
              </View>
            ) : null}

            {!pagination.has_more
              && messages.length > 0 ? (
              <Text style={styles.endOfListText}>
                No hay más correos para mostrar.
              </Text>
            ) : null}

            <View style={styles.listBottomSpacing} />
          </ScrollView>
        )}

        {!router.embedded ? (
          <TouchableOpacity
            style={styles.composeFab}
            onPress={() => {
              router.push(
                '/(main)/mail/compose',
              );
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Redactar correo"
          >
            <SquarePen
              size={20}
              color={colors.neutral.white}
              style={styles.composeFabIcon}
            />

            <Text style={styles.composeFabText}>
              Redactar
            </Text>
          </TouchableOpacity>
        ) : null}

        {!router.embedded ? (
          <FloatingTabBar activeTab="home" />
        ) : null}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  mailListScroll: {
    flex: 1,
  },
  syncFeedbackCard: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  syncFeedbackIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    marginRight: 10,
  },
  syncFeedbackContent: {
    flex: 1,
    minWidth: 0,
  },
  syncFeedbackTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  syncFeedbackDescription: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.neutral.gray600,
  },
  syncFeedbackCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  warningIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
  connectButton: {
    marginTop: 20,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  warningActionButton: {
    marginTop: 20,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#B45309',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  connectButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  showAllAccountsButton: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  showAllAccountsText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  refreshEmptyButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    backgroundColor: `${colors.brand.primary}10`,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  refreshIcon: {
    marginRight: 7,
  },
  refreshEmptyText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  errorBox: {
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 2,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    padding: 12,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 3,
  },
  errorText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: '#B45309',
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
  },
  retryButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  loadingMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  endOfListText: {
    textAlign: 'center',
    paddingTop: 18,
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.gray500,
  },
  listBottomSpacing: {
    height: 120,
  },
  composeFab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
    right: 20,
    backgroundColor: colors.brand.primary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  composeFabIcon: {
    marginRight: 6,
  },
  composeFabText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
});