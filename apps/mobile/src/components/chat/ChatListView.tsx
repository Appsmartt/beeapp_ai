import { View, StyleSheet, ScrollView } from 'react-native';
import ChatListItem from './ChatListItem';
import AiChatListItem from './AiChatListItem';
import { ChatItem } from '../../mocks/chats';
import { isProtected } from '../../stores/pinStore';

interface ChatListViewProps {
  aiChat?: ChatItem;
  chats: ChatItem[];
  onOpenChat: (chat: ChatItem) => void;
  onOpenMenu: (chat: ChatItem) => void;
  onPin: (id: string) => void;
  onMute: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ChatListView({
  aiChat,
  chats,
  onOpenChat,
  onOpenMenu,
}: ChatListViewProps) {
  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {aiChat && (
        <AiChatListItem
          name={aiChat.name}
          lastMessage={aiChat.lastMessage}
          time={aiChat.time}
          isProtected={isProtected(aiChat.id)}
          onPress={() => onOpenChat(aiChat)}
          onMorePress={() => onOpenMenu(aiChat)}
        />
      )}

      {chats.map((chat) => (
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
          onPress={() => onOpenChat(chat)}
          onMorePress={() => onOpenMenu(chat)}
        />
      ))}

      <View style={styles.bottomGap} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  bottomGap: { height: 100 },
});
