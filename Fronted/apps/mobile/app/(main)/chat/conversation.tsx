import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  LockKeyhole,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import {
  getActiveConversationCall,
  getChatContactProfile,
  getStorageFileAccess,
  startCall,
} from '@beeapp/api-client';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';

import MessageBubble from '../../../src/components/chat/MessageBubble';
import WriteBar from '../../../src/components/chat/WriteBar';
import AiAutoReplyBanner from '../../../src/components/chat/AiAutoReplyBanner';
import PinnedMessageBanner from '../../../src/components/chat/PinnedMessageBanner';
import ForwardMessageModal from '../../../src/components/chat/ForwardMessageModal';
import ChatMessageMenuModal, {
  type ChatMessageAction,
} from '../../../src/components/chat/ChatMessageMenuModal';
import AiCatalogModal from '../../../src/components/chat/AiCatalogModal';
import ConversationHeader from '../../../src/components/chat/ConversationHeader';
import {
  ConversationOverlayMenu,
  ConversationPreviews,
} from '../../../src/components/chat/ConversationOverlayMenu';

import {
  useChatMessages,
} from '../../../src/hooks/useChat';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  setActiveCallCredentials,
} from '../../../src/stores/activeCallStore';

import type {
  ChatMessageModel,
} from '../../../src/services/chatService';

export default function ConversationScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const chatId = String(params.id || '').trim();
  const fallbackChatName = (
    String(params.name || '').trim()
    || 'Conversación'
  );

  const isGroupFromRoute = params.isGroup === 'true';
  const isAiFromRoute = params.isAi === 'true';
  const onlineFromRoute = params.online === 'true';

  const {
    messages,
    participants,
    conversation,
    loading,
    refreshing,
    sending,
    loadingMore,
    hasMore,
    privateIdentityId,
    error,
    loadMessages,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePinnedMessage,
  } = useChatMessages({
    conversationId: chatId || null,
    conversationIsAi: isAiFromRoute,
  });

  const [aiAutoReply, setAiAutoReply] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [catalogVisible, setCatalogVisible] =
    useState(false);

  const [selectedMessage, setSelectedMessage] =
    useState<ChatMessageModel | null>(null);

  const [replyTarget, setReplyTarget] =
    useState<ChatMessageModel | null>(null);

  const [editingMessage, setEditingMessage] =
    useState<ChatMessageModel | null>(null);

  const [editingText, setEditingText] =
    useState('');

  const [forwardModalOpen, setForwardModalOpen] =
    useState(false);

  const [toastText, setToastText] =
    useState<string | null>(null);

  const [resolvedContactAvatarUrl, setResolvedContactAvatarUrl] =
    useState<string | null>(null);

  const [isStartingCall, setIsStartingCall] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const loadingMoreRef = useRef(false);
  const startCallInFlightRef = useRef(false);

  const chatName = (
    conversation?.name?.trim()
    || fallbackChatName
  );

  const isGroup = (
    conversation?.conversation_type === 'group'
    || isGroupFromRoute
  );

  const isAI = (
    conversation?.conversation_type === 'ai'
    || Boolean(conversation?.is_ai)
    || isAiFromRoute
  );

  const online = (
    conversation?.direct_profile?.is_online
    ?? onlineFromRoute
  );

  const isVerified = Boolean(
    conversation?.direct_profile?.is_verified,
  );

  const isAnnouncementsGroup = (
    isGroup
    && conversation?.posting_policy === 'admins_only'
  );

  const currentIdentityId = (
    privateIdentityId
    || null
  );

  const directParticipants = (
    conversation?.participants?.filter(
      (participant) => Boolean(participant.identity_id),
    )
    || []
  );

  const contactParticipant = (
    !isGroup && currentIdentityId
      ? (
          directParticipants.find(
            (participant) => (
              participant.identity_id !== currentIdentityId
            ),
          )
          || null
        )
      : null
  );

  const contactIdentityId = (
    contactParticipant?.identity_id
    || null
  );

  const contactDisplayName = (
    [
      contactParticipant?.user?.first_name,
      contactParticipant?.user?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
    || [
      conversation?.direct_profile?.first_name,
      conversation?.direct_profile?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
    || ''
  );

  const contactAvatarUrl = (
    contactParticipant?.user?.avatar_url
    || conversation?.direct_profile?.avatar_url
    || conversation?.avatar_url
    || ''
  );

  useEffect(() => {
    let cancelled = false;

    if (
      isGroup
      || isAI
      || !contactIdentityId
      || contactAvatarUrl
    ) {
      setResolvedContactAvatarUrl(null);
      return () => {
        cancelled = true;
      };
    }

    const loadContactAvatar = async () => {
      try {
        const auth = await getValidSessionCredentials();

        if (!auth) {
          return;
        }

        const contact = await getChatContactProfile(
          auth,
          contactIdentityId,
        );

        if (
          cancelled
          || !contact.avatar_file_id
        ) {
          return;
        }

        const access = await getStorageFileAccess(
          auth,
          contact.avatar_file_id,
        );

        if (!cancelled) {
          setResolvedContactAvatarUrl(access.url);
        }
      } catch {
        if (!cancelled) {
          setResolvedContactAvatarUrl(null);
        }
      }
    };

    void loadContactAvatar();

    return () => {
      cancelled = true;
    };
  }, [
    contactAvatarUrl,
    contactIdentityId,
    isAI,
    isGroup,
  ]);

  const headerAvatarUrl = (
    contactAvatarUrl
    || resolvedContactAvatarUrl
    || null
  );

  const canPostInGroup = (
    !isGroup
    || Boolean(conversation?.permissions?.can_send_messages)
  );

  const isResolvingGroupPermission = (
    isGroup
    && conversation !== null
    && conversation.permissions === null
  );

  /*
   * El contrato actual del backend no expone metadata de conversación.
   * Por eso el banner de respuesta automática queda oculto hasta que
   * exista una señal explícita para los chats de vendedor.
   */
  const isSellerChat = false;

  const pinnedMessage = messages.find(
    (message) => message.isPinned,
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  };

  const handleChatScroll = (
    offsetY: number,
  ) => {
    if (
      offsetY > 80
      || loadingMoreRef.current
      || loadingMore
      || !hasMore
    ) {
      return;
    }

    loadingMoreRef.current = true;

    void loadMore()
      .catch(() => {
        // El hook conserva el error para mostrarlo en pantalla.
      })
      .finally(() => {
        loadingMoreRef.current = false;
      });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  useEffect(() => {
    const initialMessage = String(
      params.initialMessage || '',
    ).trim();

    if (!initialMessage || !chatId) {
      return;
    }

    void sendMessage({
      content: initialMessage,
    })
      .then(() => {
        scrollToBottom();
      })
      .catch(() => {
        // El hook expone el error para renderizarlo en pantalla.
      });
  }, [
    chatId,
    params.initialMessage,
    sendMessage,
  ]);

  const showToast = (
    text: string,
  ) => {
    setToastText(text);

    setTimeout(() => {
      setToastText(null);
    }, 2200);
  };

  const handleSendMessage = async (
    text: string,
  ) => {
    try {
      if (editingMessage) {
        await editMessage(
          editingMessage.id,
          text,
        );

        setEditingMessage(null);
        setEditingText('');
        showToast('Mensaje editado');
        return;
      }

      await sendMessage({
        content: text,
        replyToId: replyTarget?.id || null,
      });

      setReplyTarget(null);
      scrollToBottom();
    } catch (sendError) {
      Alert.alert(
        'No fue posible enviar el mensaje',
        sendError instanceof Error
          ? sendError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleSendVoiceNote = (
    duration: string,
  ) => {
    Alert.alert(
      'Nota de voz',
      (
        `Grabaste una nota de voz de ${duration}. `
        + 'La carga de audio se conectará cuando el backend '
        + 'exponga el endpoint de adjuntos de Chat.'
      ),
    );
  };

  const handleSendAttachment = (
    type: 'photo' | 'camera' | 'file' | 'location' | 'contact',
  ) => {
    const labels = {
      photo: 'Foto',
      camera: 'Cámara',
      file: 'Archivo',
      location: 'Ubicación',
      contact: 'Contacto',
    };

    Alert.alert(
      labels[type],
      (
        'Esta acción necesita el endpoint de adjuntos o '
        + 'compartidos de Chat en el backend.'
      ),
    );
  };

  const handleSelectMessageAction = (
    action: ChatMessageAction,
  ) => {
    if (!selectedMessage) {
      return;
    }

    const target = selectedMessage;
    setSelectedMessage(null);

    if (action === 'reply') {
      setEditingMessage(null);
      setEditingText('');
      setReplyTarget(target);
      return;
    }

    if (action === 'edit') {
      if (!target.isUser) {
        return;
      }

      setReplyTarget(null);
      setEditingMessage(target);
      setEditingText(target.text || '');
      return;
    }

    if (action === 'forward') {
      setForwardModalOpen(true);
      return;
    }

    if (action === 'copy') {
      showToast(
        'Copia de texto disponible próximamente.',
      );
      return;
    }

    if (action === 'pin') {
      void togglePinnedMessage(
        target.id,
        target.isPinned,
      )
        .then(() => {
          showToast(
            target.isPinned
              ? 'Mensaje desfijado'
              : 'Mensaje fijado',
          );
        })
        .catch((pinError) => {
          Alert.alert(
            'No fue posible actualizar el mensaje',
            pinError instanceof Error
              ? pinError.message
              : 'Inténtalo nuevamente.',
          );
        });

      return;
    }

    if (action === 'delete') {
      Alert.alert(
        'Eliminar mensaje',
        '¿Eliminar este mensaje para ti?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void deleteMessage(target.id)
                .then(() => {
                  showToast('Mensaje eliminado');
                })
                .catch((deleteError) => {
                  Alert.alert(
                    'No fue posible eliminar el mensaje',
                    deleteError instanceof Error
                      ? deleteError.message
                      : 'Inténtalo nuevamente.',
                  );
                });
            },
          },
        ],
      );

      return;
    }

    if (action === 'destroy') {
      Alert.alert(
        'Destruir mensaje',
        (
          'Tu backend actual no expone una acción separada '
          + 'para destruir mensajes para todos.'
        ),
      );
    }
  };

  const handleUnpinBanner = () => {
    if (!pinnedMessage) {
      return;
    }

    void togglePinnedMessage(
      pinnedMessage.id,
      true,
    )
      .catch((pinError) => {
        Alert.alert(
          'No fue posible desfijar el mensaje',
          pinError instanceof Error
            ? pinError.message
            : 'Inténtalo nuevamente.',
        );
      });
  };

  const handleStartDirectCall = async (
    video: boolean,
  ) => {
    if (startCallInFlightRef.current) {
      return;
    }

    if (isGroup) {
      Alert.alert(
        'Llamadas grupales',
        'La prueba RTC actual está habilitada solo para chats individuales.',
      );
      return;
    }

    if (!privateIdentityId) {
      Alert.alert(
        'Preparando llamada',
        'Tu identidad de Chat aún se está cargando. Inténtalo nuevamente.',
      );
      return;
    }

    startCallInFlightRef.current = true;
    setIsStartingCall(true);

    try {
      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const activeCall = await getActiveConversationCall(
        auth,
        chatId,
        privateIdentityId,
      );

      if (
        activeCall?.call
        && (
          activeCall.call.status === 'ringing'
          || activeCall.call.status === 'active'
        )
      ) {
        throw new Error(
          'Ya existe una llamada en curso en esta conversación. '
          + 'Espera a que termine o contesta la llamada entrante.',
        );
      }

      const response = await startCall(
        auth,
        chatId,
        {
          actor_identity_id: privateIdentityId,
          call_type: video ? 'video' : 'voice',
        },
      );

      setActiveCallCredentials(response);

      router.push({
        pathname: '/(main)/chat/call',
        params: {
          callId: response.call.id,
          conversationId: chatId,
          actorIdentityId: privateIdentityId,
          callType: response.call.call_type,
        },
      });
    } catch (callError) {
      Alert.alert(
        'No fue posible iniciar la llamada',
        callError instanceof Error
          ? callError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      startCallInFlightRef.current = false;
      setIsStartingCall(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Vaciar chat',
      (
        'Tu backend actual no expone una acción para '
        + 'vaciar todos los mensajes de una conversación.'
      ),
    );
  };

  const handleDeleteChat = () => {
    Alert.alert(
      'Eliminar chat',
      (
        'Puedes eliminar el chat desde el menú de la lista '
        + 'principal de Chats.'
      ),
      [
        {
          text: 'Aceptar',
          onPress: () => router.back(),
        },
      ],
    );
  };

  if (!chatId) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            No fue posible identificar la conversación.
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <Modal
          transparent
          animationType="fade"
          visible={isStartingCall}
          onRequestClose={() => undefined}
        >
          <View style={styles.callStartingOverlay}>
            <View style={styles.callStartingCard}>
              <ActivityIndicator
                size="large"
                color={colors.brand.primary}
              />

              <Text style={styles.callStartingTitle}>
                Creando llamada…
              </Text>

              <Text style={styles.callStartingText}>
                Preparando una conexión segura.
              </Text>
            </View>
          </View>
        </Modal>
        <ConversationHeader
          chatName={chatName}
          avatarUrl={headerAvatarUrl}
          isAI={isAI}
          isGroup={isGroup}
          isVerified={isVerified}
          online={online}
          groupMemberCount={
            participants.length
            || conversation?.participants?.length
            || 0
          }
          menuOpen={menuOpen}
          onBack={() => router.back()}
          onOpenProfile={() => {
            if (!isGroup) {
              if (!contactIdentityId) {
                Alert.alert(
                  'Cargando contacto',
                  'Espera un momento e inténtalo otra vez.',
                );
                return;
              }

              router.push({
                pathname: '/(main)/contacts/detail',
                params: {
                  id: contactIdentityId,
                  displayName: contactDisplayName,
                  avatarUrl: contactAvatarUrl,
                },
              });
              return;
            }

            router.push({
              pathname: '/(main)/chat/chat-profile',
              params: {
                id: chatId,
              },
            });
          }}
          onOpenAiSettings={() => {
            router.push(
              '/(main)/chat/ai-settings',
            );
          }}
          onCall={(video) => {
            void handleStartDirectCall(video);
          }}
          onToggleMenu={() => {
            setMenuOpen((current) => !current);
          }}
        />

        {pinnedMessage ? (
          <PinnedMessageBanner
            text={pinnedMessage.text || 'Mensaje fijado'}
            onUnpin={handleUnpinBanner}
          />
        ) : null}

        {isAnnouncementsGroup ? (
          <View style={styles.announcementBanner}>
            <Text style={styles.announcementBannerText}>
              Grupo de anuncios
            </Text>

            <Text style={styles.announcementBannerDescription}>
              Solo owner y administradores pueden enviar mensajes.
            </Text>
          </View>
        ) : null}

        <ConversationOverlayMenu
          visible={menuOpen}
          onClose={() => {
            setMenuOpen(false);
          }}
          onViewInfo={() => {
            if (isAI) {
              return;
            }

            if (!isGroup) {
              if (!contactIdentityId) {
                Alert.alert(
                  'Cargando contacto',
                  'Espera un momento e inténtalo otra vez.',
                );
                return;
              }

              router.push({
                pathname: '/(main)/contacts/detail',
                params: {
                  id: contactIdentityId,
                  displayName: contactDisplayName,
                  avatarUrl: contactAvatarUrl,
                },
              });
              return;
            }

            router.push({
              pathname: '/(main)/chat/chat-profile',
              params: {
                id: chatId,
              },
            });
          }}
          onMute={() => {
            showToast(
              'La opción de silenciar está disponible desde la lista de chats.',
            );
          }}
          onClear={handleClearChat}
          onDelete={handleDeleteChat}
        />

        {isSellerChat ? (
          <AiAutoReplyBanner
            enabled={aiAutoReply}
            onChange={setAiAutoReply}
          />
        ) : null}

        {loading && messages.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />

            <Text style={styles.loadingText}>
              Cargando mensajes...
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={
              styles.chatScrollContent
            }
            onContentSizeChange={scrollToBottom}
            onScroll={(event) => {
              handleChatScroll(
                event.nativeEvent.contentOffset.y,
              );
            }}
            scrollEventThrottle={120}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void loadMessages({
                    refresh: true,
                  }).catch(() => {
                    // El hook conserva el error.
                  });
                }}
                tintColor={colors.brand.primary}
              />
            }
          >
            {loadingMore ? (
              <View style={styles.loadingMoreState}>
                <ActivityIndicator
                  size="small"
                  color={colors.brand.primary}
                />

                <Text style={styles.loadingMoreText}>
                  Cargando mensajes anteriores...
                </Text>
              </View>
            ) : hasMore ? (
              <Text style={styles.loadMoreHint}>
                Desliza hacia arriba para ver mensajes anteriores
              </Text>
            ) : null}

            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                HOY
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {error}
                </Text>

                <Text
                  style={styles.retryText}
                  onPress={() => {
                    void loadMessages({
                      refresh: true,
                    }).catch(() => {
                      // El hook actualiza error.
                    });
                  }}
                >
                  Reintentar
                </Text>
              </View>
            ) : null}

            {refreshing ? (
              <ActivityIndicator
                size="small"
                color={colors.brand.primary}
                style={styles.refreshingIndicator}
              />
            ) : null}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                senderName={message.senderName}
                senderVerified={message.senderVerified}
                isUser={message.isUser}
                isAI={message.isAI}
                sentByAi={message.sentByAi}
                type={message.type}
                text={message.text}
                mediaUrl={message.mediaUrl}
                fileName={message.fileName}
                fileSize={message.fileSize}
                audioDuration={message.audioDuration}
                status={message.status}
                time={message.time}
                replyTo={
                  message.replyTo
                    ? {
                        sender: message.replyTo.sender,
                        text: message.replyTo.text,
                      }
                    : undefined
                }
                isEdited={message.isEdited}
                isDestroyed={message.isDestroyed}
                isPinned={message.isPinned}
                onLongPress={() => {
                  setSelectedMessage(message);
                }}
                onContactCatalogItem={(item) => {
                  void handleSendMessage(
                    (
                      `Hola ${item.sellerName}, `
                      + `estoy interesado en: ${item.productName}`
                    ),
                  );
                }}
              />
            ))}

            {messages.length === 0 && !error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Aún no hay mensajes. Escribe el primero.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        <ConversationPreviews
          replyTarget={
            replyTarget
              ? {
                  isUser: replyTarget.isUser,
                  senderName: replyTarget.senderName,
                  text: replyTarget.text,
                }
              : null
          }
          chatName={chatName}
          onCancelReply={() => {
            setReplyTarget(null);
          }}
          editingMessage={
            editingMessage
              ? {
                  text: editingMessage.text,
                }
              : null
          }
          onCancelEdit={() => {
            setEditingMessage(null);
            setEditingText('');
          }}
          toastText={toastText}
        />

        {isResolvingGroupPermission ? (
          <View style={styles.readOnlyComposer}>
            <ActivityIndicator
              size="small"
              color={colors.brand.primary}
            />

            <View style={styles.readOnlyComposerTextWrap}>
              <Text style={styles.readOnlyComposerTitle}>
                Verificando permisos del grupo...
              </Text>

              <Text style={styles.readOnlyComposerDescription}>
                Espera un momento mientras confirmamos si puedes enviar mensajes.
              </Text>
            </View>
          </View>
        ) : canPostInGroup ? (
          <WriteBar
            onSendMessage={(text) => {
              void handleSendMessage(text);
            }}
            onSendVoiceNote={handleSendVoiceNote}
            onSendAttachment={handleSendAttachment}
            value={
              editingMessage
                ? editingText
                : undefined
            }
            onChangeText={
              editingMessage
                ? setEditingText
                : undefined
            }
            disabled={sending}
          />
        ) : (
          <View style={styles.readOnlyComposer}>
            <View style={styles.readOnlyComposerIcon}>
              <LockKeyhole
                size={17}
                color={colors.neutral.gray600}
              />
            </View>

            <View style={styles.readOnlyComposerTextWrap}>
              <Text style={styles.readOnlyComposerTitle}>
                {isAnnouncementsGroup
                  ? 'Solo administradores pueden escribir'
                  : 'No puedes enviar mensajes'}
              </Text>

              <Text style={styles.readOnlyComposerDescription}>
                {isAnnouncementsGroup
                  ? (
                      'Puedes leer los mensajes de este grupo, '
                      + 'pero no tienes permiso para enviar mensajes.'
                    )
                  : (
                      'Tu participación en esta conversación no '
                      + 'permite enviar mensajes.'
                    )}
              </Text>
            </View>
          </View>
        )}

        <ChatMessageMenuModal
          visible={selectedMessage !== null}
          isUser={selectedMessage?.isUser ?? false}
          isPinned={selectedMessage?.isPinned}
          isDestroyed={selectedMessage?.isDestroyed}
          onClose={() => {
            setSelectedMessage(null);
          }}
          onSelectAction={handleSelectMessageAction}
        />

        <ForwardMessageModal
          visible={forwardModalOpen}
          onClose={() => {
            setForwardModalOpen(false);
          }}
          onSelectChat={(targetChatName) => {
            showToast(
              (
                `Reenvío a ${targetChatName} pendiente: `
                + 'el backend aún requiere endpoint de reenviar.'
              ),
            );
          }}
        />

        <AiCatalogModal
          visible={catalogVisible}
          onClose={() => {
            setCatalogVisible(false);
          }}
          onContact={(item) => {
            setCatalogVisible(false);

            void handleSendMessage(
              (
                `Hola ${item.sellerName}, `
                + `estoy interesado en: ${item.productName}`
              ),
            );
          }}
        />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  callStartingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 16, 30, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  callStartingCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    elevation: 12,
    maxWidth: 320,
    paddingHorizontal: 28,
    paddingVertical: 26,
    shadowColor: '#000',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    width: '100%',
  },
  callStartingTitle: {
    color: colors.neutral.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  callStartingText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  safeArea: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '600',
  },
  chatScroll: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  announcementBanner: {
    backgroundColor: '#FFF7ED',
    borderBottomColor: '#FED7AA',
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  announcementBannerText: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '800',
  },
  announcementBannerDescription: {
    color: '#9A3412',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    backgroundColor: colors.neutral.gray200,
    borderRadius: 6,
    color: colors.neutral.gray600,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  retryText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 7,
  },
  refreshingIndicator: {
    marginBottom: 12,
  },
  loadingMoreState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
    paddingVertical: 6,
  },
  loadingMoreText: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '600',
  },
  loadMoreHint: {
    color: colors.neutral.gray500,
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  readOnlyComposer: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  readOnlyComposerIcon: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 11,
    width: 36,
  },
  readOnlyComposerTextWrap: {
    flex: 1,
  },
  readOnlyComposerTitle: {
    color: colors.neutral.gray700,
    fontSize: 13,
    fontWeight: '700',
  },
  readOnlyComposerDescription: {
    color: colors.neutral.gray500,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    textAlign: 'center',
  },
});
