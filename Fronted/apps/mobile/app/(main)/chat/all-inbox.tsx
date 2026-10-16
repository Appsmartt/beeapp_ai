import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useFocusEffect } from 'expo-router';
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
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';
import {
  getAccountSecurityPinStatus,
  getAssistantSettings,
  listProtectedChats,
  protectChatWithPin,
  removeChatPinProtection,
  verifyAccountSecurityPin,
} from '@beeapp/api-client';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import ChatListView from '../../../src/components/chat/ChatListView';
import GroupAwareChatOptionsSheet from '../../../src/components/chat/GroupAwareChatOptionsSheet';
import PinLockModal from '../../../src/components/security/PinLockModal';

import {
  useChatConversations,
} from '../../../src/hooks/useChat';
import { useChatListPresence } from '../../../src/hooks/useChatListPresence';
import type {
  ChatListItemModel,
} from '../../../src/services/chatService';
import {
  getAuthSession,
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  writeCachedProtectedChatIds,
  writeChatInboxCache,
} from '../../../src/services/chatInboxCache';
import { getChatConversations } from '../../../src/stores/chatStore';

function conversationSortTimestamp(
  chat: ChatListItemModel,
): number {
  const at = (
    chat.raw.last_message_at
    || chat.raw.last_message?.created_at
    || chat.raw.updated_at
  );
  return at ? Date.parse(at) : 0;
}

function isVisibleInInbox(
  chat: ChatListItemModel,
): boolean {
  return (
    chat.isGroup
    || Boolean(
      chat.raw.last_message?.id
      || chat.raw.last_message_at,
    )
  );
}

export default function AllInboxScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const context = String(params.context || '').trim();
  const businessId = String(params.businessId || '').trim();
  const requestedIdentityId = String(
    params.identityId || '',
  ).trim() || null;

  const isCommercialContext = (
    context === 'commercial'
    && Boolean(businessId)
    && Boolean(requestedIdentityId)
  );

  const {
    conversations,
    activeIdentityId,
    loading,
    refreshing,
    error,
    loadingMore,
    hasMoreConversations,
    loadMoreConversations,
    loadConversations,
    updateConversation,
    deleteConversation,
    archiveConversation,
  } = useChatConversations({
    identityId: requestedIdentityId,
    paginateInbox: true,
    retryInboxLoads: true,
  });

  const [assistantName, setAssistantName] = useState('Buddy AI');
  const [assistantInboxPinned, setAssistantInboxPinned] = useState(true);
  const [assistantInboxMuted, setAssistantInboxMuted] = useState(false);
  const [menuChat, setMenuChat] = useState<
    ChatListItemModel | null
  >(null);
  const [protectedChatIds, setProtectedChatIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [protectionLoaded, setProtectionLoaded] = useState(false);
  const [protectionError, setProtectionError] = useState<string | null>(null);
  const [protectionRefresh, setProtectionRefresh] = useState(0);
  const [openingProtectedChat, setOpeningProtectedChat] = useState<
    ChatListItemModel | null
  >(null);
  const [removingProtectionChat, setRemovingProtectionChat] = useState<
    ChatListItemModel | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      setProtectionLoaded(false);
      setProtectionRefresh((value) => value + 1);
      return () => setProtectionLoaded(false);
    }, []),
  );

  useEffect(() => {
    if (isCommercialContext) {
      return;
    }

    let cancelled = false;

    const loadAssistantName = async () => {
      const auth = await getValidSessionCredentials();
      if (!auth || auth.scheme !== 'Bearer') return;
      try {
        const response = await getAssistantSettings(auth);
        if (!cancelled) {
          setAssistantName(response.settings.name || 'Buddy AI');
          setAssistantInboxPinned(
            response.settings.inbox_pinned !== false,
          );
          setAssistantInboxMuted(
            response.settings.inbox_muted === true,
          );
        }
      } catch {
        // Conserva el nombre por defecto.
      }
    };

    void loadAssistantName();
    return () => {
      cancelled = true;
    };
  }, [isCommercialContext]);

  useEffect(() => {
    let cancelled = false;
    setProtectionLoaded(false);
    setProtectionError(null);

    const loadProtection = async () => {
      try {
        const auth = await getValidSessionCredentials();
        if (!auth) {
          throw new Error('Inicia sesión para cargar los chats protegidos.');
        }
        const result = await listProtectedChats(auth);
        if (cancelled) return;
        setProtectedChatIds(new Set(result.conversation_ids));
        setProtectionLoaded(true);
        const session = await getAuthSession();
        if (!cancelled && session) {
          await writeCachedProtectedChatIds(
            session.user.id,
            result.conversation_ids,
          );
          if (activeIdentityId) {
            writeChatInboxCache(
              session.user.id,
              activeIdentityId,
              getChatConversations(),
            );
          }
        }
      } catch (failure) {
        if (cancelled) return;
        setProtectionError(
          failure instanceof Error
            ? failure.message
            : 'No fue posible cargar la protección de chats.',
        );
      }
    };

    void loadProtection();
    return () => {
      cancelled = true;
    };
  }, [activeIdentityId, protectionRefresh]);

  useEffect(() => {
    void loadConversations({ refresh: true }).catch(() => {
      // El hook conserva el error.
    });
  }, [loadConversations]);

  const unifiedChats = useMemo(
    () => conversations
      .filter((chat) => (
        !chat.isAI
        && !chat.isArchived
        && isVisibleInInbox(chat)
      ))
      .map((chat) => ({
        ...chat,
        isProtected: protectedChatIds.has(chat.id),
      }))
      .sort((left, right) => {
        const pinDelta = Number(right.isPinned) - Number(left.isPinned);
        if (pinDelta !== 0) return pinDelta;
        return (
          conversationSortTimestamp(right)
          - conversationSortTimestamp(left)
        );
      }),
    [conversations, protectedChatIds],
  );

  const archivedCount = useMemo(
    () => conversations.filter(
      (chat) => chat.isArchived && !chat.isAI,
    ).length,
    [conversations],
  );

  const aiChat = useMemo(
    () => (
      isCommercialContext
      || !assistantInboxPinned
        ? undefined
        : {
            id: 'assistant',
            name: assistantName,
            lastMessage: 'Pregúntame o pídeme que haga algo en la app.',
            isCallNotice: false,
            time: '',
            unreadCount: 0,
            isGroup: false,
            status: 'read' as const,
            isOwnLastMessage: false,
            online: false,
            isPinned: assistantInboxPinned,
            isMuted: assistantInboxMuted,
            isArchived: false,
            isProtected: false,
            isAI: true,
            verified: false,
            avatarUrl: null,
            participantCount: 0,
            participants: [],
            raw: { id: 'assistant' } as ChatListItemModel['raw'],
          }
    ),
    [
      assistantInboxMuted,
      assistantInboxPinned,
      assistantName,
      isCommercialContext,
    ],
  );

  const onlineByIdentity = useChatListPresence(
    activeIdentityId,
    unifiedChats,
  );

  const chatsWithLivePresence = unifiedChats.map((chat) => ({
    ...chat,
    lastMessage: chat.isProtected
      ? 'Chat protegido'
      : chat.lastMessage,
    unreadCount: chat.isProtected ? 0 : chat.unreadCount,
    online: Boolean(
      protectionLoaded
      && !chat.isGroup
      && chat.raw.other_identity_id
      && onlineByIdentity[chat.raw.other_identity_id],
    ),
  }));

  const commercialParams = isCommercialContext
    ? {
        context: 'commercial',
        businessId,
        identityId: requestedIdentityId || '',
      }
    : {};

  const openChat = (chat: ChatListItemModel) => {
    if (chat.isAI) {
      router.push('/(main)/chat/assistant');
      return;
    }

    router.push({
      pathname: '/(main)/chat/conversation',
      params: {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup ? 'true' : 'false',
        isAi: chat.isAI ? 'true' : 'false',
        online: chat.online ? 'true' : 'false',
        ...commercialParams,
      },
    });
  };

  const handleChatPress = (chat: ChatListItemModel) => {
    if (chat.isAI) {
      openChat(chat);
      return;
    }
    if (protectedChatIds.has(chat.id)) {
      setOpeningProtectedChat(chat);
      return;
    }
    openChat(chat);
  };

  const verifyOpeningPin = async (pin: string) => {
    if (!openingProtectedChat) throw new Error('Selecciona un chat.');
    const auth = await getValidSessionCredentials();
    if (!auth) throw new Error('Necesitas internet para abrir este chat protegido.');
    const result = await verifyAccountSecurityPin(auth, pin);
    if (!result.verified) throw new Error('PIN incorrecto. Inténtalo de nuevo.');
  };

  const finishProtectedOpening = () => {
    const chat = openingProtectedChat;
    setOpeningProtectedChat(null);
    if (chat) openChat(chat);
  };

  const handleToggleProtection = async (chat: ChatListItemModel) => {
    setMenuChat(null);
    if (protectedChatIds.has(chat.id)) {
      setRemovingProtectionChat(chat);
      return;
    }

    try {
      const auth = await getValidSessionCredentials();
      if (!auth) throw new Error('Inicia sesión para proteger el chat.');
      const status = await getAccountSecurityPinStatus(auth);
      if (!status.configured) {
        Alert.alert(
          'PIN requerido',
          'Debes crear un PIN primero desde Seguridad.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ir a Seguridad',
              onPress: () => router.push('/(main)/profile/security'),
            },
          ],
        );
        return;
      }
      await protectChatWithPin(auth, chat.id);
      const nextProtectedIds = new Set(protectedChatIds).add(chat.id);
      setProtectedChatIds(nextProtectedIds);
      const session = await getAuthSession();
      if (session) {
        await writeCachedProtectedChatIds(session.user.id, [...nextProtectedIds]);
        if (activeIdentityId) {
          writeChatInboxCache(
            session.user.id,
            activeIdentityId,
            getChatConversations(),
          );
        }
      }
      Alert.alert('Chat protegido', 'El chat quedó protegido con tu PIN.');
    } catch (failure) {
      Alert.alert(
        'No fue posible proteger el chat',
        failure instanceof Error ? failure.message : 'Inténtalo nuevamente.',
      );
    }
  };

  const verifyRemovalPin = async (pin: string) => {
    if (!removingProtectionChat) throw new Error('Selecciona un chat.');
    const auth = await getValidSessionCredentials();
    if (!auth) throw new Error('Inicia sesión para verificar tu PIN.');
    await removeChatPinProtection(auth, removingProtectionChat.id, pin);
  };

  const finishRemoval = () => {
    if (!removingProtectionChat) return;
    const chatId = removingProtectionChat.id;
    setRemovingProtectionChat(null);
    const nextProtectedIds = new Set(protectedChatIds);
    nextProtectedIds.delete(chatId);
    setProtectedChatIds(nextProtectedIds);
    void getAuthSession().then(async (session) => {
      if (!session) return;
      await writeCachedProtectedChatIds(session.user.id, [...nextProtectedIds]);
      if (activeIdentityId) {
        writeChatInboxCache(
          session.user.id,
          activeIdentityId,
          getChatConversations(),
        );
      }
    });
    Alert.alert('Protección removida', 'El chat ya no requiere PIN para abrirse.');
  };

  const handleLoadMore = () => {
    if (hasMoreConversations.direct) {
      void loadMoreConversations('direct');
      return;
    }
    if (hasMoreConversations.group) {
      void loadMoreConversations('group');
    }
  };

  const handleRefresh = () => {
    void loadConversations({ refresh: true }).catch(() => {
      // El hook conserva el error.
    });
  };

  const handleDelete = (chat: ChatListItemModel) => {
    Alert.alert(
      'Eliminar chat',
      (
        chat.isGroup
          ? (
              `¿Eliminar "${chat.name}"? Si eres integrante, saldrás `
              + 'del grupo y desaparecerá de tu lista.'
            )
          : `¿Seguro que quieres eliminar el chat "${chat.name}" de tu lista?`
      ),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteConversation(chat.id).catch((deleteError) => {
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

  const hasMore = (
    hasMoreConversations.direct
    || hasMoreConversations.group
  );

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Volver"
          >
            <ArrowLeft
              size={21}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.title}>
            Todos los chats
          </Text>
        </View>

        {(loading && conversations.length === 0)
          || (!protectionLoaded && !protectionError) ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />
            <Text style={styles.loadingText}>
              Cargando conversaciones...
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  onPress={handleRefresh}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {protectionError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{protectionError}</Text>
                <TouchableOpacity
                  onPress={() => setProtectionRefresh((value) => value + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ChatListView
                aiChat={aiChat}
                chats={chatsWithLivePresence}
                archivedCount={archivedCount}
                archivedLabel="Conversaciones archivadas"
                archivedSubtitle={
                  archivedCount === 1
                    ? '1 conversación archivada'
                    : `${archivedCount} conversaciones archivadas`
                }
                onPressArchived={() => {
                  router.push({
                    pathname: '/(main)/chat/archived',
                    params: {
                      kind: 'all',
                      ...commercialParams,
                    },
                  });
                }}
                onOpenChat={handleChatPress}
                onOpenMenu={setMenuChat}
                onPin={() => {}}
                onMute={() => {}}
                onDelete={() => {}}
                onEndReached={
                  protectionLoaded && hasMore
                    ? handleLoadMore
                    : undefined
                }
                loadingMore={loadingMore}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.brand.primary}
                  />
                }
              />
            )}

            {unifiedChats.length === 0 && !error && !protectionError ? (
              <View style={styles.emptyOverlay}>
                <Text style={styles.emptyTitle}>
                  Aún no tienes conversaciones
                </Text>
                <Text style={styles.emptyDescription}>
                  Cuando escribas a alguien o a un negocio, aparecerá aquí.
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <PinLockModal
        visible={Boolean(openingProtectedChat)}
        itemName={openingProtectedChat?.name || 'Chat protegido'}
        onClose={() => setOpeningProtectedChat(null)}
        verifyPin={verifyOpeningPin}
        onSuccess={finishProtectedOpening}
      />

      <PinLockModal
        visible={Boolean(removingProtectionChat)}
        itemName={removingProtectionChat?.name || 'Chat protegido'}
        onClose={() => setRemovingProtectionChat(null)}
        verifyPin={verifyRemovalPin}
        onSuccess={finishRemoval}
      />

      <GroupAwareChatOptionsSheet
        chat={menuChat}
        identityId={activeIdentityId}
        onDeleteGroupAfterTransfer={deleteConversation}
        isProtected={Boolean(menuChat && protectedChatIds.has(menuChat.id))}
        onToggleProtection={() => {
          if (menuChat) void handleToggleProtection(menuChat);
        }}
        onTogglePin={() => {
          const chat = menuChat;
          setMenuChat(null);
          if (!chat) return;
          void updateConversation(chat.id, {
            isPinned: !chat.isPinned,
          }).then((updated) => {
            if (chat.isAI) {
              setAssistantInboxPinned(updated.isPinned);
            }
          }).catch((failure) => {
            Alert.alert(
              'No fue posible cambiar el fijado',
              failure instanceof Error
                ? failure.message
                : 'Inténtalo nuevamente.',
            );
          });
        }}
        onToggleMute={() => {
          const chat = menuChat;
          setMenuChat(null);
          if (!chat) return;
          void updateConversation(chat.id, {
            isMuted: !chat.isMuted,
          }).then((updated) => {
            if (chat.isAI) {
              setAssistantInboxMuted(updated.isMuted);
            }
          }).catch((failure) => {
            Alert.alert(
              'No fue posible cambiar las notificaciones',
              failure instanceof Error
                ? failure.message
                : 'Inténtalo nuevamente.',
            );
          });
        }}
        onAssignCategory={() => setMenuChat(null)}
        onArchive={() => {
          const chat = menuChat;
          setMenuChat(null);
          if (!chat) return;
          void archiveConversation(chat.id).catch((failure) => {
            Alert.alert(
              'No fue posible archivar el chat',
              failure instanceof Error
                ? failure.message
                : 'Inténtalo nuevamente.',
            );
          });
        }}
        onDelete={() => {
          if (menuChat) handleDelete(menuChat);
          setMenuChat(null);
        }}
        onClose={() => setMenuChat(null)}
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
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 17,
    fontWeight: '800',
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.neutral.gray600,
    fontSize: 13,
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
