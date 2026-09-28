import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  listProtectedChats,
  protectChatWithPin,
  removeChatPinProtection,
  verifyAccountSecurityPin,
} from '@beeapp/api-client';
import {
  getAuthSession,
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  writeCachedProtectedChatIds,
  writeChatInboxCache,
} from '../../../src/services/chatInboxCache';
import { getChatConversations } from '../../../src/stores/chatStore';

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
import type {
  ChatListItemModel,
} from '../../../src/services/chatService';

type ArchivedKind =
  | 'direct'
  | 'group';

function getArchivedKind(
  value: string | undefined,
): ArchivedKind {
  return value === 'group'
    ? 'group'
    : 'direct';
}

export default function ArchivedChatsScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const archivedKind = getArchivedKind(
    String(params.kind || ''),
  );

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

  const isGroupArchive = archivedKind === 'group';

  const {
    conversations,
    activeIdentityId,
    loading,
    refreshing,
    error,
    loadConversations,
    updateConversation,
    restoreConversation,
    deleteConversation,
  } = useChatConversations({
    identityId: requestedIdentityId,
  });

  const [menuChat, setMenuChat] = useState<
    ChatListItemModel | null
  >(null);
  const [protectedChatIds, setProtectedChatIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [protectionLoaded, setProtectionLoaded] = useState(false);
  const [protectionError, setProtectionError] = useState<string | null>(null);
  const [protectionRefresh, setProtectionRefresh] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setProtectionLoaded(false);
      setProtectionRefresh((value) => value + 1);
      return () => setProtectionLoaded(false);
    }, []),
  );
  const [removingProtectionChat, setRemovingProtectionChat] = useState<
    ChatListItemModel | null
  >(null);
  const [openingProtectedChat, setOpeningProtectedChat] = useState<
    ChatListItemModel | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    setProtectionLoaded(false);
    setProtectionError(null);

    const loadProtection = async () => {
      try {
        const auth = await getValidSessionCredentials();
        if (!auth) throw new Error('Inicia sesión para cargar los chats protegidos.');
        const result = await listProtectedChats(auth);
        if (cancelled) return;
        setProtectedChatIds(new Set(result.conversation_ids));
        setProtectionLoaded(true);
        const session = await getAuthSession();
        if (!cancelled && session) {
          await writeCachedProtectedChatIds(session.user.id, result.conversation_ids);
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
  }, [requestedIdentityId, protectionRefresh]);

  useEffect(() => {
    void loadConversations({
      refresh: true,
    }).catch(() => {
      // El hook conserva el error.
    });
  }, [
    loadConversations,
  ]);

  const muteAttempts = useRef(new Set<string>());

  const archivedChats = useMemo(
    () => conversations.filter((chat) => (
      chat.isArchived
      && !chat.isAI
      && (
        isGroupArchive
          ? chat.isGroup
          : !chat.isGroup
      )
    )).map((chat) => ({
      ...chat,
      isProtected: protectedChatIds.has(chat.id),
    })),
    [
      conversations,
      isGroupArchive,
      protectedChatIds,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    const attemptKey = (chatId: string) => `${activeIdentityId || ''}:${chatId}`;
    const chatsToMute = archivedChats.filter(
      (chat) => !chat.isMuted && !muteAttempts.current.has(attemptKey(chat.id)),
    );

    const mutePreviouslyArchivedChats = async () => {
      for (const chat of chatsToMute) {
        if (cancelled) break;
        muteAttempts.current.add(attemptKey(chat.id));
        try {
          await updateConversation(chat.id, { isMuted: true });
        } catch (failure) {
          if (!cancelled) {
            Alert.alert(
              'No fue posible silenciar el chat archivado',
              failure instanceof Error ? failure.message : 'Inténtalo nuevamente.',
            );
          }
        }
      }
    };

    void mutePreviouslyArchivedChats();
    return () => {
      cancelled = true;
    };
  }, [activeIdentityId, archivedChats, updateConversation]);

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
        ...(isCommercialContext
          ? {
              context: 'commercial',
              businessId,
              identityId: requestedIdentityId || '',
            }
          : {}),
      },
    });
  };

  const handleArchivedChatPress = (chat: ChatListItemModel) => {
    if (!protectedChatIds.has(chat.id)) {
      openChat(chat);
      return;
    }
    setOpeningProtectedChat(chat);
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

  const handleRestore = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await restoreConversation(chat.id);

      Alert.alert(
        'Chat restaurado',
        isGroupArchive
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
        chat.isGroup
          ? (
              `¿Eliminar "${chat.name}"? Si eres integrante, saldrás `
              + 'del grupo y desaparecerá de tu lista. Si eres el único '
              + 'integrante y owner, se desactivará el grupo.'
            )
          : `¿Seguro que quieres eliminar el chat "${chat.name}" de tu lista?`
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

  const handleRefresh = () => {
    muteAttempts.current.clear();
    void loadConversations({
      refresh: true,
    }).catch(() => {
      // El hook conserva el error.
    });
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft
              size={21}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.title}>
            {isGroupArchive
              ? 'Grupos archivados'
              : 'Chats archivados'}
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
              Cargando archivados...
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
              chats={archivedChats}
              onOpenChat={handleArchivedChatPress}
              onOpenMenu={setMenuChat}
              onPin={() => {
                // Se conserva la firma del componente de lista.
              }}
              onMute={() => {
                // Se conserva la firma del componente de lista.
              }}
              onDelete={() => {
                // Se conserva la firma del componente de lista.
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.brand.primary}
                />
              }
            />

            )}

            {archivedChats.length === 0 && !error && !protectionError ? (
              <View style={styles.emptyOverlay}>
                <Text style={styles.emptyTitle}>
                  {isGroupArchive
                    ? 'No tienes grupos archivados'
                    : 'No tienes chats archivados'}
                </Text>

                <Text style={styles.emptyDescription}>
                  {isGroupArchive
                    ? (
                        'Los grupos que archives aparecerán aquí.'
                      )
                    : (
                        'Los chats que archives aparecerán aquí.'
                      )}
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
        hideArchivedChatActions
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
          setMenuChat(null);
        }}
        onAssignCategory={() => {
          setMenuChat(null);
        }}
        onArchive={() => {
          setMenuChat(null);
        }}
        onRestore={() => {
          if (menuChat) {
            void handleRestore(menuChat);
          }

          setMenuChat(null);
        }}
        onDelete={() => {
          if (menuChat) {
            handleDelete(menuChat);
          }

          setMenuChat(null);
        }}
        onClose={() => {
          setMenuChat(null);
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
