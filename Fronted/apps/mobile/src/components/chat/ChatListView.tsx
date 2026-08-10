import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Archive } from 'lucide-react-native';
import ChatListItem from './ChatListItem';
import AiChatListItem from './AiChatListItem';
import { ChatItem } from '../../mocks/chats';
import { isProtected } from '../../stores/pinStore';
import { colors } from '@beeapp/design-system';

interface ChatListViewProps {
  aiChat?: ChatItem;
  chats: ChatItem[];
  archivedCount?: number;
  onPressArchived?: () => void;
  onOpenChat: (chat: ChatItem) => void;
  onOpenMenu: (chat: ChatItem) => void;
  onPin: (id: string) => void;
  onMute: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ChatListView({
  aiChat,
  chats,
  archivedCount = 0,
  onPressArchived,
  onOpenChat,
  onOpenMenu,
}: ChatListViewProps) {
  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {onPressArchived && (
        <TouchableOpacity
          style={styles.archivedRow}
          onPress={onPressArchived}
          activeOpacity={0.7}
        >
          <View style={styles.archivedIcon}>
            <Archive size={19} color={colors.neutral.gray600} />
          </View>

          <View style={styles.archivedTextContainer}>
            <Text style={styles.archivedTitle}>Chats archivados</Text>
            <Text style={styles.archivedSubtitle}>
              {archivedCount === 1 ? '1 chat archivado' : `${archivedCount} chats archivados`}
            </Text>
          </View>
        </TouchableOpacity>
      )}

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
  scroll: {
    flex: 1,
  },
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral.gray200,
  },
  archivedIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  archivedTextContainer: {
    flex: 1,
  },
  archivedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  archivedSubtitle: {
    fontSize: 12,
    color: colors.neutral.gray500,
    marginTop: 2,
  },
  bottomGap: {
    height: 100,
  },
});