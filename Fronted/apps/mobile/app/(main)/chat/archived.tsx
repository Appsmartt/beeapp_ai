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
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import ChatListView from '../../../src/components/chat/ChatListView';
import ChatOptionsSheet from '../../../src/components/chat/ChatOptionsSheet';

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

  const isGroupArchive = archivedKind === 'group';

  const {
    conversations,
    loading,
    refreshing,
    error,
    loadConversations,
    restoreConversation,
    deleteConversation,
  } = useChatConversations();

  const [menuChat, setMenuChat] = useState<
    ChatListItemModel | null
  >(null);

  useEffect(() => {
    void loadConversations({
      refresh: true,
    }).catch(() => {
      // El hook conserva el error.
    });
  }, [
    loadConversations,
  ]);

  const archivedChats = useMemo(
    () => conversations.filter((chat) => (
      chat.isArchived
      && !chat.isAI
      && (
        isGroupArchive
          ? chat.isGroup
          : !chat.isGroup
      )
    )),
    [
      conversations,
      isGroupArchive,
    ],
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

  const handleRefresh = () => {
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

        {loading && conversations.length === 0 ? (
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

            <ChatListView
              chats={archivedChats}
              onOpenChat={openChat}
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

            {archivedChats.length === 0 && !error ? (
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

      <ChatOptionsSheet
        chat={menuChat}
        isProtected={false}
        onToggleProtection={() => {
          setMenuChat(null);
        }}
        onTogglePin={() => {
          setMenuChat(null);
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
