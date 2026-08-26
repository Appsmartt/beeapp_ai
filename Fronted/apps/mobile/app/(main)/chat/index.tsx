import {
  useEffect,
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
  ArrowLeft,
  SquarePen,
  UserPlus,
} from 'lucide-react-native';
import { useNavigation } from 'expo-router';
import { colors } from '@beeapp/design-system';

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
  const navigation = useNavigation();

  const {
    conversations,
    loading,
    refreshing,
    error,
    loadConversations,
    updateConversation,
    deleteConversation,
    setProtected,
    isProtected,
  } = useChatConversations();

  const [menuChat, setMenuChat] =
    useState<ChatListItemModel | null>(null);

  const [lockedChatId, setLockedChatId] =
    useState<string | null>(null);

  const [pinAction, setPinAction] =
    useState<PinAction | null>(null);

  const [activeTab, setActiveTab] =
    useState<ChatTab>('chats');

  const [viewMode, setViewMode] =
    useState<'all' | 'archived'>('all');

  const [createMenuOpen, setCreateMenuOpen] =
    useState(false);

  const [categories, setCategories] =
    useState<ChatCategory[]>([
      ...MOCK_CATEGORIES,
    ]);

  const [activeCategoryId, setActiveCategoryId] =
    useState<string | null>(null);

  const [creatingCategory, setCreatingCategory] =
    useState(false);

  const [assigningChat, setAssigningChat] =
    useState<ChatListItemModel | null>(null);

  const [chatCategoryIds, setChatCategoryIds] =
    useState<Record<string, string[]>>({});

  const [statuses, setStatuses] =
    useState([...MOCK_STATUSES]);

  const [viewerIndex, setViewerIndex] =
    useState<number | null>(null);

  const [creatingStatus, setCreatingStatus] =
    useState(false);

  const isStatusesTab = activeTab === 'statuses';

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'focus',
      () => {
        if (activeTab === 'chats') {
          void loadConversations({
            refresh: true,
            archived: viewMode === 'archived',
          }).catch(() => {
            // El hook conserva el error para mostrarlo debajo.
          });
        }
      },
    );

    return unsubscribe;
  }, [
    activeTab,
    loadConversations,
    navigation,
    viewMode,
  ]);

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

  const archivedCount = useMemo(
    () => conversations.filter(
      (chat) => (
        chat.isArchived
        && !chat.isGroup
        && !chat.isAI
      ),
    ).length,
    [conversations],
  );

  const visibleChats = useMemo(
    () => conversations
      .filter((chat) => {
        if (viewMode === 'archived') {
          return chat.isArchived;
        }

        return !chat.isArchived;
      })
      .filter((chat) => {
        if (!activeCategoryId) {
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
      chatCategoryIds,
      conversations,
      protectedChatIds,
      viewMode,
    ],
  );

  const aiChat = useMemo(
    () => (
      viewMode === 'all'
      && !activeCategoryId
        ? visibleChats.find((chat) => chat.isAI)
        : undefined
    ),
    [
      activeCategoryId,
      viewMode,
      visibleChats,
    ],
  );

  const regularChats = useMemo(
    () => visibleChats.filter(
      (chat) => !chat.isAI,
    ),
    [visibleChats],
  );

  const directChats = useMemo(
    () => regularChats.filter(
      (chat) => !chat.isGroup,
    ),
    [regularChats],
  );

  const groupChats = useMemo(
    () => regularChats.filter(
      (chat) => chat.isGroup,
    ),
    [regularChats],
  );

  const openChat = (
    chat: ChatListItemModel,
  ) => {
    router.push({
      pathname: '/(main)/chat/conversation',
      params: {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup ? 'true' : 'false',
        isAi: chat.isAI ? 'true' : 'false',
        online: chat.online ? 'true' : 'false',
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
      await updateConversation(
        chat.id,
        {
          isArchived: true,
        },
      );
    } catch (updateError) {
      Alert.alert(
        'No fue posible archivar el chat',
        updateError instanceof Error
          ? updateError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleDelete = (
    chat: ChatListItemModel,
  ) => {
    Alert.alert(
      'Eliminar chat',
      `¿Seguro que quieres eliminar el chat con ${chat.name}?`,
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
      archived: viewMode === 'archived',
    }).catch(() => {
      // El error ya se presenta en la UI.
    });
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {viewMode === 'archived' ? (
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => setViewMode('all')}
              activeOpacity={0.7}
            >
              <ArrowLeft
                size={20}
                color={colors.neutral.text}
              />

              <Text style={styles.title}>
                Chats archivados
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.title}>
              Chats
            </Text>
          )}

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

        {viewMode === 'all' && (
          <ChatTabs
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        )}

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
        ) : activeTab === 'communities' ? (
          <View style={styles.listWrap}>
            <ChatListView
              chats={groupChats}
              onOpenChat={handleChatPress}
              onOpenMenu={setMenuChat}
              onPin={() => {
                // La acción ahora se ejecuta desde ChatOptionsSheet.
              }}
              onMute={() => {
                // La acción ahora se ejecuta desde ChatOptionsSheet.
              }}
              onDelete={() => {
                // La acción ahora se ejecuta desde ChatOptionsSheet.
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.brand.primary}
                />
              }
            />
          </View>
        ) : (
          <>
            {viewMode === 'all' && (
              <ChatCategoryChips
                categories={categories}
                activeCategoryId={activeCategoryId}
                onChange={setActiveCategoryId}
                onCreate={() => {
                  setCreatingCategory(true);
                }}
              />
            )}

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
                  aiChat={aiChat}
                  chats={directChats}
                  archivedCount={
                    viewMode === 'all'
                      ? archivedCount
                      : 0
                  }
                  onPressArchived={
                    viewMode === 'all'
                      ? () => {
                          setViewMode('archived');
                          void loadConversations({
                            refresh: true,
                            archived: true,
                          }).catch(() => {
                            // El hook conserva el error.
                          });
                        }
                      : undefined
                  }
                  onOpenChat={handleChatPress}
                  onOpenMenu={setMenuChat}
                  onPin={() => {
                    // La acción ahora se ejecuta desde ChatOptionsSheet.
                  }}
                  onMute={() => {
                    // La acción ahora se ejecuta desde ChatOptionsSheet.
                  }}
                  onDelete={() => {
                    // La acción ahora se ejecuta desde ChatOptionsSheet.
                  }}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={colors.brand.primary}
                    />
                  }
                />
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
        onNewCommunity={() => {
          setCreateMenuOpen(false);
          router.push('/(main)/chat/new');
        }}
        onClose={() => {
          setCreateMenuOpen(false);
        }}
      />

      <ChatOptionsSheet
        chat={menuChat as any}
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
    flex: 1,
    backgroundColor: colors.neutral.gray50,
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
  backRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
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
});
