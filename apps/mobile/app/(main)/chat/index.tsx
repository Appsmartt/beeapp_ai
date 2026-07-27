import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { useNavigation } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { SquarePen, Plus, Lock, Unlock, Pin, BellOff, Trash2 } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import ChatListItem from '../../../src/components/chat/ChatListItem';
import AiChatListItem from '../../../src/components/chat/AiChatListItem';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import { MOCK_CHATS, MOCK_STORIES } from '../../../src/mocks/chats';
import { isProtected, hasPin, setProtected } from '../../../src/stores/pinStore';
import PinLockModal from '../../../src/components/security/PinLockModal';

export default function ChatListScreen() {
  const router = useModuleNav();
  const navigation = useNavigation();

  const [chats, setChats] = useState(MOCK_CHATS);
  const [menuChat, setMenuChat] = useState<typeof MOCK_CHATS[0] | null>(null);
  const [lockedChatId, setLockedChatId] = useState<string | null>(null);
  const [pinAction, setPinAction] = useState<{ type: 'open' | 'add' | 'remove'; chat: typeof MOCK_CHATS[0] } | null>(null);
  const [, setTick] = useState(0);

  // Sync state on focus to update lock statuses and load new chats
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setChats([...MOCK_CHATS]);
    });
    return unsubscribe;
  }, [navigation]);

  const handlePin = (id: string) => {
    setChats(chats.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c)));
  };

  const handleMute = (id: string) => {
    setChats(chats.map((c) => (c.id === id ? { ...c, isMuted: !c.isMuted } : c)));
  };

  const handleDelete = (id: string) => {
    setChats(chats.filter((c) => c.id !== id));
  };

  const handleChatPress = (chat: typeof chats[0]) => {
    if (isProtected(chat.id)) {
      setPinAction({ type: 'open', chat });
      setLockedChatId(chat.id);
      return;
    }
    openChat(chat);
  };

  const openChat = (chat: typeof chats[0]) => {
    setChats(chats.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)));
    router.push({
      pathname: '/(main)/chat/conversation',
      params: { id: chat.id, name: chat.name, isGroup: chat.isGroup ? 'true' : 'false', online: chat.online ? 'true' : 'false' },
    });
  };

  const handleToggleProtection = (chat: typeof chats[0]) => {
    setMenuChat(null);
    if (isProtected(chat.id)) {
      setPinAction({ type: 'remove', chat });
      setLockedChatId(chat.id);
    } else {
      if (!hasPin()) {
        alert('Debes crear un PIN primero en los ajustes de Seguridad.');
        router.push('/(main)/profile/security');
      } else {
        setPinAction({ type: 'add', chat });
        setLockedChatId(chat.id);
      }
    }
  };

  const handlePinSuccess = () => {
    const action = pinAction;
    setLockedChatId(null);
    setPinAction(null);
    if (!action) return;

    if (action.type === 'open') {
      openChat(action.chat);
    } else if (action.type === 'add') {
      setProtected(action.chat.id, true);
      setTick((t) => t + 1);
      alert('Chat protegido con éxito.');
    } else if (action.type === 'remove') {
      setProtected(action.chat.id, false);
      setTick((t) => t + 1);
      alert('Protección del chat removida.');
    }
  };

  const aiChat = chats.find((c) => c.isAI);
  const filteredChats = chats
    .filter((c) => !c.isAI)
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Chats</Text>
          <TouchableOpacity style={styles.newChatBtn} onPress={() => router.push('/(main)/chat/new')} activeOpacity={0.7}>
            <SquarePen size={20} color={colors.neutral.text} />
          </TouchableOpacity>
        </View>

        {/* Stories list */}
        <View style={styles.storiesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
            {MOCK_STORIES.map((story) => (
              <View key={story.id} style={styles.storyWrap}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(story.isUser ? '/(main)/chat/story?id=tu' : `/(main)/chat/story?id=${story.id}`)}>
                  {story.isUser ? (
                    <View style={styles.userStoryCircle}>
                      <Text style={styles.userStoryText}>YO</Text>
                      <TouchableOpacity style={styles.addStoryBadge} onPress={() => router.push('/(main)/chat/create-story')} activeOpacity={0.7}>
                        <Plus size={10} color={colors.neutral.white} strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.storyCircle, story.hasActive && styles.storyCircleActive]}>
                      <View style={styles.storyInnerCircle}><Text style={styles.storyText}>{story.initials}</Text></View>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.storyNameRow}>
                  <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
                  {story.verified && <VerifiedBadge size={11} />}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.chatListScroll} showsVerticalScrollIndicator={false}>
          {aiChat && (
            <AiChatListItem
              name={aiChat.name}
              lastMessage={aiChat.lastMessage}
              time={aiChat.time}
              isProtected={isProtected(aiChat.id)}
              onPress={() => handleChatPress(aiChat)}
              onLongPress={() => setMenuChat(aiChat)}
            />
          )}

          {filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              id={chat.id}
              name={chat.name}
              lastMessage={chat.lastMessage}
              time={chat.time}
              unreadCount={chat.unreadCount}
              isGroup={chat.isGroup}
              verified={chat.verified}
              status={chat.status}
              online={chat.online}
              isPinned={chat.isPinned}
              isMuted={chat.isMuted}
              isProtected={isProtected(chat.id)}
              onPress={() => handleChatPress(chat)}
              onPin={() => handlePin(chat.id)}
              onMute={() => handleMute(chat.id)}
              onDelete={() => handleDelete(chat.id)}
              onLongPress={() => setMenuChat(chat)}
            />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>

        {!router.embedded && <FloatingTabBar activeTab="chat" />}
      </View>

      {/* PinLockModal */}
      <PinLockModal
        visible={!!lockedChatId}
        itemName={pinAction?.chat.name}
        onClose={() => { setLockedChatId(null); setPinAction(null); }}
        onSuccess={handlePinSuccess}
      />

      {/* Custom Bottom Sheet Context Menu */}
      <Modal visible={!!menuChat} transparent animationType="fade" onRequestClose={() => setMenuChat(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setMenuChat(null)}>
          <View style={styles.modalSheet}>
            <Text style={styles.sheetTitle}>{menuChat?.name}</Text>
            {menuChat && (
              <>
                <TouchableOpacity style={styles.sheetBtn} onPress={() => handleToggleProtection(menuChat)}>
                  {isProtected(menuChat.id) ? (
                    <><Unlock size={18} color={colors.brand.primary} style={{ marginRight: 12 }} /><Text style={styles.sheetBtnText}>Quitar protección con PIN</Text></>
                  ) : (
                    <><Lock size={18} color={colors.brand.primary} style={{ marginRight: 12 }} /><Text style={styles.sheetBtnText}>Proteger con PIN</Text></>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetBtn} onPress={() => { handlePin(menuChat.id); setMenuChat(null); }}>
                  <Pin size={18} color={colors.neutral.text} style={{ marginRight: 12 }} />
                  <Text style={styles.sheetBtnText}>{menuChat.isPinned ? 'Desfijar' : 'Fijar'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetBtn} onPress={() => { handleMute(menuChat.id); setMenuChat(null); }}>
                  <BellOff size={18} color={colors.neutral.text} style={{ marginRight: 12 }} />
                  <Text style={styles.sheetBtnText}>{menuChat.isMuted ? 'Desactivar silencio' : 'Silenciar'}</Text>
                </TouchableOpacity>

                {!menuChat.isAI && (
                  <TouchableOpacity style={styles.sheetBtn} onPress={() => { handleDelete(menuChat.id); setMenuChat(null); }}>
                    <Trash2 size={18} color={colors.semantic.error} style={{ marginRight: 12 }} />
                    <Text style={[styles.sheetBtnText, { color: colors.semantic.error }]}>Eliminar chat</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMenuChat(null)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: colors.neutral.white },
  title: { fontSize: 24, fontWeight: '800', color: colors.neutral.text },
  newChatBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.neutral.gray100, alignItems: 'center', justifyContent: 'center' },
  storiesContainer: { paddingVertical: 14, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderColor: colors.neutral.gray100 },
  storiesScroll: { paddingHorizontal: 20, gap: 16 },
  storyWrap: { alignItems: 'center', width: 60 },
  userStoryCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.neutral.gray200, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: colors.neutral.gray300 },
  userStoryText: { fontSize: 12, fontWeight: '700', color: colors.neutral.gray700 },
  addStoryBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand.primary, borderWidth: 2, borderColor: colors.neutral.white, alignItems: 'center', justifyContent: 'center' },
  storyCircle: { width: 50, height: 50, borderRadius: 25, padding: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  storyCircleActive: { borderColor: colors.brand.primary },
  storyInnerCircle: { flex: 1, width: '100%', borderRadius: 22, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  storyText: { fontSize: 16, fontWeight: '700', color: colors.brand.primary },
  storyNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 6 },
  storyName: { flexShrink: 1, fontSize: 11, color: colors.neutral.gray600, fontWeight: '600', textAlign: 'center' },
  chatListScroll: { flex: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.neutral.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.neutral.text, marginBottom: 18, textAlign: 'center' },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F1F3F5' },
  sheetBtnText: { fontSize: 14, fontWeight: '600', color: colors.neutral.text },
  cancelBtn: { justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderColor: colors.neutral.gray100, marginTop: 12, paddingVertical: 14 },
  cancelBtnText: { fontWeight: '700', color: colors.neutral.gray600, fontSize: 14 },
});
