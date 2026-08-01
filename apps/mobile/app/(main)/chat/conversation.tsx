import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import MessageBubble from '../../../src/components/chat/MessageBubble';
import WriteBar from '../../../src/components/chat/WriteBar';
import AiAutoReplyBanner from '../../../src/components/chat/AiAutoReplyBanner';
import PinnedMessageBanner from '../../../src/components/chat/PinnedMessageBanner';
import ForwardMessageModal from '../../../src/components/chat/ForwardMessageModal';
import ChatMessageMenuModal, { ChatMessageAction } from '../../../src/components/chat/ChatMessageMenuModal';
import AiCatalogModal from '../../../src/components/chat/AiCatalogModal';
import ConversationHeader from '../../../src/components/chat/ConversationHeader';
import { ConversationOverlayMenu, ConversationPreviews } from '../../../src/components/chat/ConversationOverlayMenu';
import {
  AI_CHAT_ID,
  AI_CONVERSATION_MESSAGES,
  ChatMessage,
  MOCK_CONVERSATION_MESSAGES,
  SELLER_CONVERSATION_MESSAGES,
  MOCK_CHATS,
} from '../../../src/mocks/chats';

export default function ConversationScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const chatId = params.id as string;
  const chatName = (params.name as string) || 'Conversación';
  const isGroup = params.isGroup === 'true';
  const online = params.online === 'true';
  const initialMessage = params.initialMessage as string | undefined;

  const targetChat = MOCK_CHATS.find((c) => c.id === chatId);
  const isVerified = !!targetChat?.verified;
  const isAI = chatId === AI_CHAT_ID;
  const groupMemberCount = targetChat?.members?.length ?? 0;
  const isSellerChat = !!targetChat?.isSellerChat;

  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isAI) return AI_CONVERSATION_MESSAGES;
    if (isSellerChat) return SELLER_CONVERSATION_MESSAGES;
    return MOCK_CONVERSATION_MESSAGES;
  });

  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editingText, setEditingText] = useState('');
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const pinnedMessage = messages.find((m) => m.isPinned);

  const scrollToBottom = () => {
    setTimeout(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, 100);
  };

  const handleSendMessage = (text: string) => {
    if (editingMessage) {
      setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? { ...m, text, isEdited: true } : m)));
      setEditingMessage(null);
      setEditingText('');
      return;
    }
    const newMsg: ChatMessage = {
      id: Date.now(),
      isUser: true,
      type: 'text',
      text,
      time: '14:35',
      status: 'sent',
      replyTo: replyTarget ? { sender: replyTarget.isUser ? 'Tú' : replyTarget.senderName || chatName, text: replyTarget.text || 'Mensaje' } : undefined,
    };
    setMessages((prev) => [...prev, newMsg]);
    setReplyTarget(null);
    scrollToBottom();

    if (!isAI) {
      setTimeout(() => {
        const replyMsg: ChatMessage = {
          id: Date.now() + 1,
          senderName: isGroup ? 'Desarrollador 🐝' : chatName,
          isUser: false,
          type: 'text',
          text: '¡Recibido! Esto es una simulación de conversación de BeeApp AI.',
          time: '14:36',
          status: 'read',
        };
        setMessages((prev) => [...prev, replyMsg]);
        scrollToBottom();
      }, 1000);
    }
  };

  useEffect(() => {
    if (initialMessage) handleSendMessage(initialMessage);
  }, [initialMessage]);

  const handleSendVoiceNote = (duration: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), isUser: true, type: 'audio', audioDuration: duration, time: '14:36', status: 'sent' }]);
    scrollToBottom();
  };

  const handleSendAttachment = (type: 'photo' | 'camera' | 'file' | 'location' | 'contact') => {
    let mockMsg: ChatMessage;
    const timeNow = '14:37';
    if (type === 'photo' || type === 'camera') {
      mockMsg = { id: Date.now(), isUser: true, type: 'image', mediaUrl: 'https://picsum.photos/400/300', text: `Foto (${type})`, time: timeNow, status: 'sent' };
    } else if (type === 'file') {
      mockMsg = { id: Date.now(), isUser: true, type: 'file', fileName: 'Reporte_Avances.xlsx', fileSize: '340 KB', time: timeNow, status: 'sent' };
    } else {
      mockMsg = { id: Date.now(), isUser: true, type: 'text', text: `📍 Ubicación/Contacto (${type})`, time: timeNow, status: 'sent' };
    }
    setMessages((prev) => [...prev, mockMsg]);
    scrollToBottom();
  };

  const handleSelectMessageAction = (action: ChatMessageAction) => {
    if (!selectedMessage) return;
    const target = selectedMessage;
    setSelectedMessage(null);
    if (action === 'reply') { setEditingMessage(null); setReplyTarget(target); }
    else if (action === 'edit') { setReplyTarget(null); setEditingMessage(target); setEditingText(target.text || ''); }
    else if (action === 'forward') { setForwardModalOpen(true); }
    else if (action === 'pin') { setMessages((prev) => prev.map((m) => ({ ...m, isPinned: m.id === target.id ? !target.isPinned : false }))); }
    else if (action === 'copy') { setToastText('Texto copiado'); setTimeout(() => setToastText(null), 2000); }
    else if (action === 'delete') {
      Alert.alert('Eliminar mensaje', '¿Eliminar este mensaje para ti?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => setMessages((prev) => prev.filter((m) => m.id !== target.id)) },
      ]);
    } else if (action === 'destroy') {
      Alert.alert('Destruir mensaje', '¿Destruir este mensaje para todos?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Destruir', style: 'destructive', onPress: () => setMessages((prev) => prev.map((m) => m.id === target.id ? { ...m, isDestroyed: true, text: 'Este mensaje fue destruido' } : m)) },
      ]);
    }
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <ConversationHeader
          chatName={chatName} isAI={isAI} isGroup={isGroup} isVerified={isVerified} online={online} groupMemberCount={groupMemberCount} menuOpen={menuOpen}
          onBack={() => router.back()} onOpenProfile={() => router.push({ pathname: '/(main)/chat/chat-profile', params: { id: chatId } })}
          onOpenAiSettings={() => router.push('/(main)/chat/ai-settings')}
          onCall={(video) => router.push({ pathname: '/(main)/chat/call', params: { id: chatId, name: chatName, isVideo: video ? 'true' : 'false', isGroup: isGroup ? 'true' : 'false' } })}
          onToggleMenu={() => setMenuOpen(!menuOpen)}
        />

        {pinnedMessage && (
          <PinnedMessageBanner text={pinnedMessage.text || 'Mensaje fijado'} onUnpin={() => setMessages((prev) => prev.map((m) => ({ ...m, isPinned: false })))} />
        )}

        <ConversationOverlayMenu
          visible={menuOpen} onClose={() => setMenuOpen(false)}
          onViewInfo={() => alert('Perfil/Info del grupo (Mock)')} onMute={() => alert('Conversación silenciada')}
          onClear={() => setMessages([])} onDelete={() => router.back()}
        />

        {isSellerChat && <AiAutoReplyBanner enabled={aiAutoReply} onChange={setAiAutoReply} />}

        <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatScrollContent} onContentSizeChange={scrollToBottom} showsVerticalScrollIndicator={false}>
          <View style={styles.dateSeparator}><Text style={styles.dateSeparatorText}>HOY</Text></View>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id} senderName={msg.senderName} senderVerified={msg.senderVerified} isUser={msg.isUser} isAI={isAI} sentByAi={msg.sentByAi} type={msg.type} text={msg.text} mediaUrl={msg.mediaUrl} fileName={msg.fileName} fileSize={msg.fileSize} audioDuration={msg.audioDuration} status={msg.status} time={msg.time} replyTo={msg.replyTo} showCatalog={msg.showCatalog} isEdited={msg.isEdited} isDestroyed={msg.isDestroyed} isPinned={msg.isPinned}
              onLongPress={() => setSelectedMessage(msg)}
              onContactCatalogItem={(item) => handleSendMessage(`Hola ${item.sellerName}, estoy interesado en: ${item.productName}`)}
            />
          ))}
        </ScrollView>

        <ConversationPreviews
          replyTarget={replyTarget} chatName={chatName} onCancelReply={() => setReplyTarget(null)}
          editingMessage={editingMessage} onCancelEdit={() => { setEditingMessage(null); setEditingText(''); }} toastText={toastText}
        />

        <WriteBar
          onSendMessage={handleSendMessage} onSendVoiceNote={handleSendVoiceNote} onSendAttachment={handleSendAttachment}
          value={editingMessage ? editingText : undefined} onChangeText={editingMessage ? setEditingText : undefined}
        />

        <ChatMessageMenuModal
          visible={selectedMessage !== null} isUser={selectedMessage?.isUser ?? false} isPinned={selectedMessage?.isPinned} isDestroyed={selectedMessage?.isDestroyed}
          onClose={() => setSelectedMessage(null)} onSelectAction={handleSelectMessageAction}
        />

        <ForwardMessageModal
          visible={forwardModalOpen} onClose={() => setForwardModalOpen(false)}
          onSelectChat={(targetChatName) => { setToastText(`Mensaje reenviado a ${targetChatName}`); setTimeout(() => setToastText(null), 2000); }}
        />

        <AiCatalogModal
          visible={catalogVisible} onClose={() => setCatalogVisible(false)}
          onContact={(item) => { setCatalogVisible(false); handleSendMessage(`Hola ${item.sellerName}, estoy interesado en: ${item.productName}`); }}
        />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
  chatScroll: { flex: 1, backgroundColor: colors.neutral.gray50 },
  chatScrollContent: { paddingHorizontal: 16, paddingVertical: 20 },
  dateSeparator: { alignItems: 'center', marginVertical: 16 },
  dateSeparatorText: { fontSize: 10, fontWeight: '600', color: colors.neutral.gray600, backgroundColor: colors.neutral.gray200, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, letterSpacing: 0.5 },
});
