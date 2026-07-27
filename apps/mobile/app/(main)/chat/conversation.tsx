import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Phone, Video, MoreVertical, BellOff, Trash2, ShieldAlert, Bot, SlidersHorizontal } from 'lucide-react-native';
import MessageBubble from '../../../src/components/chat/MessageBubble';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import WriteBar from '../../../src/components/chat/WriteBar';


export default function ConversationScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const chatId = params.id as string;
  const chatName = params.name as string || 'Conversación';
  const isGroup = params.isGroup === 'true';
  const online = params.online === 'true';
  // Verified state comes from the chat mock, not from the navigation params
  const isVerified = !!MOCK_CHATS.find((c) => c.id === chatId)?.verified;
  // A conversation can be opened with an initial preset message (e.g. from the AI catalog)
  const initialMessage = params.initialMessage as string | undefined;
  // The pinned assistant chat: logo avatar, its own mock thread and settings
  const isAI = chatId === AI_CHAT_ID;

  const scrollRef = useRef<ScrollView | null>(null);

  // States
  const [menuOpen, setMenuOpen] = useState(false);
  const [longPressActive, setLongPressActive] = useState<number | null>(null);
  const [catalogVisible, setCatalogVisible] = useState(false);
  
  // Historical Messages Mock State.
  // An empty chat can start with an initial injected message.
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessage
      ? [
          {
            id: 1,
            isUser: true,
            type: 'text' as const,
            text: initialMessage,
            time: 'Ahora',
            status: 'sent' as const,
          },
        ]
      : isAI
      ? AI_CONVERSATION_MESSAGES
      : MOCK_CONVERSATION_MESSAGES
  );

  // Trigger catalog when the last message has showCatalog = true
  React.useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.showCatalog) {
      const timer = setTimeout(() => {
        setCatalogVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleContactSeller = (result: any) => {
    setCatalogVisible(false);
    
    // Check if chat already exists
    let existingChat = MOCK_CHATS.find((c) => c.name === result.sellerName);
    const initialText = `Hola, me interesa tu servicio de ${result.productName} que encontré en BeeApp.`;
    
    if (!existingChat) {
      // Create new chat
      const newChatId = 'seller_' + Date.now().toString(36);
      existingChat = {
        id: newChatId,
        name: result.sellerName,
        lastMessage: initialText,
        time: 'Ahora',
        unreadCount: 0,
        isGroup: false,
        status: 'sent',
        online: true,
        verified: result.sellerVerified,
      };
      MOCK_CHATS.push(existingChat);
    } else {
      existingChat.lastMessage = initialText;
    }

    // Now navigate to conversation screen with the new/existing chat
    router.replace({
      pathname: '/(main)/chat/conversation',
      params: {
        id: existingChat.id,
        name: existingChat.name,
        isGroup: 'false',
        online: 'true',
        initialMessage: initialText,
      },
    });
  };

  const handleSendMessage = (text: string) => {
    const newMsg = {
      id: Date.now(),
      isUser: true,
      type: 'text' as const,
      text,
      time: '14:35',
      status: 'sent' as const,
    };
    setMessages((prev) => [...prev, newMsg]);
    scrollToBottom();

    // The assistant does not answer on its own: everything here is mock
    if (isAI) return;

    // Mock bot reply
    setTimeout(() => {
      const replyMsg = {
        id: Date.now() + 1,
        senderName: isGroup ? 'Desarrollador 🐝' : chatName,
        isUser: false,
        type: 'text' as const,
        text: '¡Recibido! Esto es una simulación de conversación de BeeApp AI.',
        time: '14:36',
        status: 'read' as const,
      };
      setMessages((prev) => [...prev, replyMsg]);
      scrollToBottom();
    }, 1000);
  };

  const handleSendVoiceNote = (duration: string) => {
    const newMsg = {
      id: Date.now(),
      isUser: true,
      type: 'audio' as const,
      audioDuration: duration,
      time: '14:36',
      status: 'sent' as const,
    };
    setMessages((prev) => [...prev, newMsg]);
    scrollToBottom();
  };

  const handleSendAttachment = (type: 'photo' | 'camera' | 'file' | 'location' | 'contact') => {
    let mockMsg;
    const timeNow = '14:37';
    switch (type) {
      case 'photo':
      case 'camera':
        mockMsg = {
          id: Date.now(),
          isUser: true,
          type: 'image' as const,
          mediaUrl: 'https://picsum.photos/400/300',
          text: `Foto adjunta (${type === 'camera' ? 'Cámara' : 'Galería'})`,
          time: timeNow,
          status: 'sent' as const,
        };
        break;
      case 'file':
        mockMsg = {
          id: Date.now(),
          isUser: true,
          type: 'file' as const,
          fileName: 'Reporte_Avances.xlsx',
          fileSize: '340 KB',
          time: timeNow,
          status: 'sent' as const,
        };
        break;
      default:
        mockMsg = {
          id: Date.now(),
          isUser: true,
          type: 'text' as const,
          text: `📍 Ubicación o contacto compartido (Mock de ${type})`,
          time: timeNow,
          status: 'sent' as const,
        };
    }
    setMessages((prev) => [...prev, mockMsg]);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCall = (video: boolean) => {
    // Navigate to call screen passing info
    router.push({
      pathname: '/(main)/chat/call',
      params: {
        id: chatId,
        name: chatName,
        isVideo: video ? 'true' : 'false',
        isGroup: isGroup ? 'true' : 'false',
      },
    });
  };

  const handleLongPress = (id: number) => {
    setLongPressActive(id);
  };

  const handleMessageAction = (action: 'reply' | 'copy' | 'delete') => {
    if (action === 'delete' && longPressActive !== null) {
      setMessages(messages.filter((m) => m.id !== longPressActive));
    } else {
      Alert.alert('Acción simulada', `Has seleccionado la opción de ${action}`);
    }
    setLongPressActive(null);
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header bar */}
        <View style={styles.header}>
          <View style={styles.headerLeftCol}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={24} color={colors.neutral.text} />
            </TouchableOpacity>

            <View style={[styles.avatarCircle, isAI && styles.avatarCircleAI]}>
              {isAI ? (
                <Bot size={20} color={colors.neutral.white} />
              ) : (
                <Text style={styles.avatarText}>{chatName[0].toUpperCase()}</Text>
              )}
              {online && !isGroup && !isAI && <View style={styles.onlineBadge} />}
            </View>

            <View style={styles.nameMetaCol}>
              <View style={styles.chatNameRow}>
                <Text style={styles.chatName} numberOfLines={1}>
                  {chatName}
                </Text>
                {isVerified && <VerifiedBadge size={14} />}
              </View>
              <Text style={styles.chatMeta}>
                {isAI
                  ? 'Asistente de BeeApp · siempre disponible'
                  : isGroup
                  ? '5 participantes'
                  : online
                  ? 'En línea'
                  : 'Últ. vez hace 1 hora'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightCol}>
            {isAI ? (
              /* Only entry point to the assistant settings */
              <TouchableOpacity
                onPress={() => router.push('/(main)/chat/ai-settings')}
                style={styles.headerIconBtn}
                activeOpacity={0.7}
              >
                <SlidersHorizontal size={20} color={colors.brand.primary} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={() => handleCall(false)} style={styles.headerIconBtn} activeOpacity={0.7}>
                  <Phone size={20} color={colors.neutral.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCall(true)} style={styles.headerIconBtn} activeOpacity={0.7}>
                  <Video size={20} color={colors.neutral.text} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.headerIconBtn} activeOpacity={0.7}>
              <MoreVertical size={20} color={colors.neutral.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Options Menu overlay */}
        {menuOpen && (
          <View style={styles.menuOverlay}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); alert('Perfil/Info del grupo (Mock)'); }}>
              <Text style={styles.menuItemText}>Ver info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); alert('Conversación silenciada'); }}>
              <BellOff size={14} color={colors.neutral.text} style={{ marginRight: 8 }} />
              <Text style={styles.menuItemText}>Silenciar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); setMessages([]); }}>
              <Trash2 size={14} color={colors.semantic.error} style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: colors.semantic.error }]}>Vaciar chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => { setMenuOpen(false); router.back(); }}>
              <Text style={[styles.menuItemText, { color: colors.semantic.error }]}>Eliminar chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Message scroll area */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>HOY</Text>
          </View>

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              senderName={msg.senderName}
              senderVerified={msg.senderVerified}
              isUser={msg.isUser}
              isAI={isAI}
              type={msg.type}
              text={msg.text}
              mediaUrl={msg.mediaUrl}
              fileName={msg.fileName}
              fileSize={msg.fileSize}
              audioDuration={msg.audioDuration}
              status={msg.status}
              time={msg.time}
              replyTo={msg.replyTo}
              onLongPress={() => handleLongPress(msg.id)}
            />
          ))}
        </ScrollView>

        {/* Message actions popup overlay */}
        <Modal transparent visible={longPressActive !== null} animationType="fade" onRequestClose={() => setLongPressActive(null)}>
          <TouchableWithoutFeedback onPress={() => setLongPressActive(null)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.actionsMenu}>
                <TouchableOpacity style={styles.actionItem} onPress={() => handleMessageAction('reply')}>
                  <Text style={styles.actionText}>Responder</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionItem} onPress={() => handleMessageAction('copy')}>
                  <Text style={styles.actionText}>Copiar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={() => handleMessageAction('delete')}>
                  <Text style={[styles.actionText, { color: colors.semantic.error }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Custom Input Write Bar */}
        <WriteBar
          onSendMessage={handleSendMessage}
          onSendVoiceNote={handleSendVoiceNote}
          onSendAttachment={handleSendAttachment}
        />

        {/* Ai Catalog Search Results Overlay */}
        <AiCatalogModal
          visible={catalogVisible}
          onClose={() => setCatalogVisible(false)}
          onContact={handleContactSeller}
        />
      </View>
    </ScreenSafeArea>
  );
}

// Separate helper import for overlay backdrop
import { TouchableWithoutFeedback } from 'react-native';
import { AI_CHAT_ID, AI_CONVERSATION_MESSAGES, ChatMessage, MOCK_CONVERSATION_MESSAGES, MOCK_CHATS } from '../../../src/mocks/chats';
import AiCatalogModal from '../../../src/components/chat/AiCatalogModal';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    zIndex: 10,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  avatarCircleAI: {
    backgroundColor: colors.brand.primary,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.semantic.success,
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  nameMetaCol: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  chatMeta: {
    fontSize: 11,
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 6,
  },
  menuOverlay: {
    position: 'absolute',
    top: 56,
    right: 12,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    width: 140,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  chatScroll: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.gray600,
    backgroundColor: colors.neutral.gray200,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsMenu: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    width: 200,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  actionItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'center',
  },
});
