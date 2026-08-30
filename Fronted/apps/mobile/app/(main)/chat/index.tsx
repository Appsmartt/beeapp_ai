import {
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SquarePen,
  UserPlus,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
} from '../../../src/components/embedded/EmbeddedNavContext';
import ModuleNotificationBell from '../../../src/components/ModuleNotificationBell';

import ChatListView from '../../../src/components/chat/ChatListView';
import StatusCirclesRow from '../../../src/components/chat/StatusCirclesRow';
import StatusViewer from '../../../src/components/chat/StatusViewer';
import CreateStatusModal from '../../../src/components/chat/CreateStatusModal';
import ChatTabs, {
  type ChatTab,
} from '../../../src/components/chat/ChatTabs';
import ChatCategoryChips from '../../../src/components/chat/ChatCategoryChips';
import ChatCategoryModals from '../../../src/components/chat/ChatCategoryModals';
import ChatOptionsSheet from '../../../src/components/chat/ChatOptionsSheet';
import ChatCreateMenu from '../../../src/components/chat/ChatCreateMenu';
import PinLockModal from '../../../src/components/security/PinLockModal';

import {
  useChatConversations,
} from '../../../src/hooks/useChat';
import type {
  ChatListItemModel,
} from '../../../src/services/chatService';

import {
  MOCK_CATEGORIES,
  type ChatCategory,
  addCategory,
} from '../../../src/mocks/chats';

import {
  MOCK_STATUSES,
  addStatus,
  markStatusViewed,
} from '../../../src/mocks/statuses';

import {
  hasPin,
  isProtected as isLegacyProtected,
} from '../../../src/stores/pinStore';

type PinAction = {
  type: 'open' | 'add' | 'remove';
  chat?: ChatListItemModel;
};

export default function ChatListScreen() {
  const router = useModuleNav();
  const {
    conversations,
    loading,
    refreshing,
    error,
    loadConversations,
    updateConversation,
    deleteConversation,
    archiveConversation,
    restoreConversation,
    setProtected,
    isProtected,
  } = useChatConversations();

  const [menuChat, setMenuChat] = useState<
    ChatListItemModel | null
  >(null);

  const [lockedChatId, setLockedChatId] = useState<
    string | null
  >(null);

  const [pinAction, setPinAction] = useState<
    PinAction | null
  >(null);

  const [activeTab, setActiveTab] = useState<ChatTab>('chats');

  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const [categories, setCategories] = useState<
    ChatCategory[]
  >([
    ...MOCK_CATEGORIES,
  ]);

  const [activeCategoryId, setActiveCategoryId] = useState<
    string | null
  >(null);

  const [creatingCategory, setCreatingCategory] = useState(false);

  const [assigningChat, setAssigningChat] = useState<
    ChatListItemModel | null
  >(null);

  const [chatCategoryIds, setChatCategoryIds] = useState<
    Record<string, string[]>
  >({});

  const [statuses, setStatuses] = useState([
    ...MOCK_STATUSES,
  ]);

  const [viewerIndex, setViewerIndex] = useState<
    number | null
  >(null);

  const [creatingStatus, setCreatingStatus] = useState(false);

  const isStatusesTab = activeTab === 'statuses';
  const isGroupsTab = activeTab === 'groups';

  const protectedChatIds = useMemo(
    () => new Set(
      conversations
        .filter((chat) => (
          isProtected(chat.id)
          || isLegacyProtected(chat.id)
        ))
        .map((chat) => chat.id),
    ),
    [
      conversations,
      isProtected,
    ],
  );

  const categorizedChats = useMemo(
    () => conversations
      .filter((chat) => {
        if (!activeCategoryId || activeTab !== 'chats') {
          return true;
        }

        return (
          chatCategoryIds[chat.id] || []
        ).includes(activeCategoryId);
      })
      .map((chat) => ({
        ...chat,
        isProtected: protectedChatIds.has(chat.id),
      })),
    [
      activeCategoryId,
      activeTab,
      chatCategoryIds,
      conversations,
      protectedChatIds,
    ],
  );

  const activeChats = useMemo(
    () => categorizedChats.filter(
      (chat) => !chat.isArchived,
    ),
    [categorizedChats],
  );

  const archivedChats = useMemo(
    () => categorizedChats.filter(
      (chat) => (
        chat.isArchived
        && !chat.isAI
      ),
    ),
    [categorizedChats],
  );

  const aiChat = useMemo(
    () => activeTab === 'chats'
      ? activeChats.find((chat) => chat.isAI)
      : undefined,
    [
      activeChats,
      activeTab,
    ],
  );

  const directChats = useMemo(
    () => activeChats.filter(
      (chat) => (
        !chat.isAI
        && !chat.isGroup
      ),
    ),
    [activeChats],
  );

  const groupChats = useMemo(
    () => activeChats.filter(
      (chat) => (
        !chat.isAI
        && chat.isGroup
      ),
    ),
    [activeChats],
  );

  const archivedDirectCount = useMemo(
    () => archivedChats.filter(
      (chat) => !chat.isGroup,
    ).length,
    [archivedChats],
  );

  const archivedGroupCount = useMemo(
    () => archivedChats.filter(
      (chat) => chat.isGroup,
    ).length,
    [archivedChats],
  );

  const openChat = (
    chat: ChatListItemModel,
  ) => {
    router.push({
      pathname: '/(main)/chat/conversation',
      params: {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup
          ? 'true'
          : 'false',
        isAi: chat.isAI
          ? 'true'
          : 'false',
        online: chat.online
          ? 'true'
          : 'false',
      },
    });
  };

  const handleChatPress = (
    chat: ChatListItemModel,
  ) => {
    const protectedChat = (
      isProtected(chat.id)
      || isLegacyProtected(chat.id)
    );

    if (protectedChat) {
      setPinAction({
        type: 'open',
        chat,
      });

      setLockedChatId(chat.id);
      return;
    }

    openChat(chat);
  };

  const handlePinSuccess = () => {
    const action = pinAction;

    setLockedChatId(null);
    setPinAction(null);

    if (!action?.chat) {
      return;
    }

    if (action.type === 'open') {
      openChat(action.chat);
      return;
    }

    if (action.type === 'add') {
      setProtected(action.chat.id, true);

      Alert.alert(
        'Chat protegido',
        'El chat quedó protegido con tu PIN.',
      );
      return;
    }

    setProtected(action.chat.id, false);

    Alert.alert(
      'Protección removida',
      'El chat ya no requiere PIN para abrirse.',
    );
  };

  const handleToggleProtection = (
    chat: ChatListItemModel,
  ) => {
    setMenuChat(null);

    if (
      isProtected(chat.id)
      || isLegacyProtected(chat.id)
    ) {
      setPinAction({
        type: 'remove',
        chat,
      });

      setLockedChatId(chat.id);
      return;
    }

    if (!hasPin()) {
      Alert.alert(
        'PIN requerido',
        'Debes crear un PIN primero desde Seguridad.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Ir a Seguridad',
            onPress: () => {
              router.push(
                '/(main)/profile/security',
              );
            },
          },
        ],
      );

      return;
    }

    setPinAction({
      type: 'add',
      chat,
    });

    setLockedChatId(chat.id);
  };

  const handleTogglePin = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await updateConversation(
        chat.id,
        {
          isPinned: !chat.isPinned,
        },
      );
    } catch (updateError) {
      Alert.alert(
        'No fue posible actualizar el chat',
        updateError instanceof Error
          ? updateError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleToggleMute = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await updateConversation(
        chat.id,
        {
          isMuted: !chat.isMuted,
        },
      );
    } catch (updateError) {
      Alert.alert(
        'No fue posible actualizar el chat',
        updateError instanceof Error
          ? updateError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleArchive = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await archiveConversation(chat.id);

      Alert.alert(
        'Chat archivado',
        chat.isGroup
          ? 'El grupo ahora está en Grupos archivados.'
          : 'El chat ahora está en Chats archivados.',
      );
    } catch (archiveError) {
      Alert.alert(
        'No fue posible archivar el chat',
        archiveError instanceof Error
          ? archiveError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleRestore = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await restoreConversation(chat.id);

      Alert.alert(
        'Chat restaurado',
        chat.isGroup
          ? 'El grupo volvió a la pestaña Grupos.'
          : 'El chat volvió a la pestaña Chats.',
      );
    } catch (restoreError) {
      Alert.alert(
        'No fue posible restaurar el chat',
        restoreError instanceof Error
          ? restoreError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleDelete = (
    chat: ChatListItemModel,
  ) => {
    Alert.alert(
      'Eliminar chat',
      (
        `¿Seguro que quieres eliminar `
        + `${chat.isGroup ? 'el grupo' : 'el chat'} `
        + `"${chat.name}" de tu lista?`
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteConversation(chat.id)
              .catch((deleteError) => {
                Alert.alert(
                  'No fue posible eliminar el chat',
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Inténtalo nuevamente.',
                );
              });
          },
        },
      ],
    );
  };

  const handleSaveCategories = (
    categoryIds: string[],
  ) => {
    if (assigningChat) {
      setChatCategoryIds((current) => ({
        ...current,
        [assigningChat.id]: categoryIds,
      }));
    }

    setAssigningChat(null);
  };

  const handleRefresh = () => {
    void loadConversations({
      refresh: true,
    }).catch(() => {
      // El error ya se presenta en la UI.
    });
  };

  const visibleListChats = isGroupsTab
    ? groupChats
    : directChats;

  const archivedCount = isGroupsTab
    ? archivedGroupCount
    : archivedDirectCount;

  const archivedLabel = isGroupsTab
    ? 'Grupos archivados'
    : 'Chats archivados';

  const archivedSubtitle = isGroupsTab
    ? (
        archivedCount === 1
          ? '1 grupo archivado'
          : `${archivedCount} grupos archivados`
      )
    : (
      archivedCount === 1
        ? '1 chat archivado'
        : `${archivedCount} chats archivados`
    );

  const emptyTitle = isGroupsTab
    ? 'Aún no tienes grupos'
    : 'Aún no tienes chats';

  const emptyDescription = isGroupsTab
    ? (
        'Crea un grupo para conversar con varias '
        + 'cuentas de BeeApp.'
      )
    : (
      'Inicia un chat o crea un grupo para comenzar.'
    );

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Chats
          </Text>

          <View style={styles.headerActions}>
            <ModuleNotificationBell moduleId="chat" />

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => {
                router.push(
                  '/(main)/chat/group-invites',
                );
              }}
              activeOpacity={0.7}
              accessibilityLabel="Invitaciones a grupos"
            >
              <UserPlus
                size={20}
                color={colors.neutral.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => setCreateMenuOpen(true)}
              activeOpacity={0.7}
              accessibilityLabel="Crear chat o grupo"
            >
              <SquarePen
                size={20}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ChatTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {isStatusesTab ? (
          <StatusCirclesRow
            statuses={statuses}
            onCreate={() => {
              setCreatingStatus(true);
            }}
            onOpen={(index) => {
              markStatusViewed(
                statuses[index].id,
              );

              setStatuses([
                ...MOCK_STATUSES,
              ]);

              setViewerIndex(index);
            }}
          />
        ) : (
          <>
            {!isGroupsTab ? (
              <ChatCategoryChips
                categories={categories}
                activeCategoryId={activeCategoryId}
                onChange={setActiveCategoryId}
                onCreate={() => {
                  setCreatingCategory(true);
                }}
              />
            ) : null}

            {loading && conversations.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator
                  size="large"
                  color={colors.brand.primary}
                />

                <Text style={styles.loadingText}>
                  Cargando chats...
                </Text>
              </View>
            ) : (
              <View style={styles.listWrap}>
                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>
                      {error}
                    </Text>

                    <TouchableOpacity
                      onPress={handleRefresh}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.retryText}>
                        Reintentar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <ChatListView
                  aiChat={
                    isGroupsTab
                      ? undefined
                      : aiChat
                  }
                  chats={visibleListChats}
                  archivedCount={archivedCount}
                  archivedLabel={archivedLabel}
                  archivedSubtitle={archivedSubtitle}
                  onPressArchived={() => {
                    router.push({
                      pathname: '/(main)/chat/archived',
                      params: {
                        kind: isGroupsTab
                          ? 'group'
                          : 'direct',
                      },
                    });
                  }}
                  onOpenChat={handleChatPress}
                  onOpenMenu={setMenuChat}
                  onPin={() => {
                    // La acción se ejecuta desde ChatOptionsSheet.
                  }}
                  onMute={() => {
                    // La acción se ejecuta desde ChatOptionsSheet.
                  }}
                  onDelete={() => {
                    // La acción se ejecuta desde ChatOptionsSheet.
                  }}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={colors.brand.primary}
                    />
                  }
                />

                {visibleListChats.length === 0 && !error ? (
                  <View style={styles.emptyOverlay}>
                    <Text style={styles.emptyTitle}>
                      {emptyTitle}
                    </Text>

                    <Text style={styles.emptyDescription}>
                      {emptyDescription}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </>
        )}
      </View>

      <StatusViewer
        visible={viewerIndex !== null}
        statuses={statuses}
        index={viewerIndex ?? 0}
        onChangeIndex={setViewerIndex}
        onClose={() => {
          setViewerIndex(null);
        }}
      />

      <CreateStatusModal
        visible={creatingStatus}
        onPublish={(status) => {
          addStatus(status);
          setStatuses([
            ...MOCK_STATUSES,
          ]);
          setCreatingStatus(false);
        }}
        onClose={() => {
          setCreatingStatus(false);
        }}
      />

      <PinLockModal
        visible={Boolean(lockedChatId)}
        itemName={
          pinAction?.chat?.name
          || 'Chat protegido'
        }
        onClose={() => {
          setLockedChatId(null);
          setPinAction(null);
        }}
        onSuccess={handlePinSuccess}
      />

      <ChatCreateMenu
        visible={createMenuOpen}
        onNewChat={() => {
          setCreateMenuOpen(false);
          router.push('/(main)/chat/new');
        }}
        onNewGroup={() => {
          setCreateMenuOpen(false);
          router.push('/(main)/chat/new-group');
        }}
        onClose={() => {
          setCreateMenuOpen(false);
        }}
      />

      <ChatOptionsSheet
        chat={menuChat}
        isProtected={
          Boolean(menuChat)
          && (
            isProtected(menuChat?.id || '')
            || isLegacyProtected(menuChat?.id || '')
          )
        }
        onToggleProtection={() => {
          if (menuChat) {
            handleToggleProtection(menuChat);
          }
        }}
        onTogglePin={() => {
          if (menuChat) {
            void handleTogglePin(menuChat);
          }

          setMenuChat(null);
        }}
        onToggleMute={() => {
          if (menuChat) {
            void handleToggleMute(menuChat);
          }

          setMenuChat(null);
        }}
        onAssignCategory={() => {
          setAssigningChat(menuChat);
          setMenuChat(null);
        }}
        onDelete={() => {
          if (menuChat) {
            handleDelete(menuChat);
          }

          setMenuChat(null);
        }}
        onArchive={() => {
          if (menuChat) {
            void handleArchive(menuChat);
          }

          setMenuChat(null);
        }}
        onRestore={() => {
          if (menuChat) {
            void handleRestore(menuChat);
          }

          setMenuChat(null);
        }}
        onClose={() => {
          setMenuChat(null);
        }}
      />

      <ChatCategoryModals
        categories={categories}
        creating={creatingCategory}
        onCreate={(category) => {
          const created = addCategory(category);

          setCategories([
            ...MOCK_CATEGORIES,
          ]);

          setActiveCategoryId(created.id);
          setCreatingCategory(false);
        }}
        onCloseCreate={() => {
          setCreatingCategory(false);
        }}
        assigningChat={
          assigningChat
            ? {
                name: assigningChat.name,
                categoryIds: (
                  chatCategoryIds[
                    assigningChat.id
                  ] || []
                ),
              }
            : null
        }
        onSaveAssign={handleSaveCategories}
        onCloseAssign={() => {
          setAssigningChat(null);
        }}
      />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 24,
    fontWeight: '800',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  newChatBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '600',
  },
  listWrap: {
    flex: 1,
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FECACA',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    textAlign: 'center',
  },
  retryText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyOverlay: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 48,
  },
  emptyTitle: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.neutral.gray600,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
});
