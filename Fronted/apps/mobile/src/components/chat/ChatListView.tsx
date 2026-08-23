import type {
  ReactElement,
} from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Archive,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ChatListItem from './ChatListItem';
import AiChatListItem from './AiChatListItem';
import type {
  ChatListItemModel,
} from '../../services/chatService';
import {
  isProtected,
} from '../../stores/pinStore';

interface ChatListViewProps {
  aiChat?: ChatListItemModel;
  chats: ChatListItemModel[];
  archivedCount?: number;
  onPressArchived?: () => void;
  onOpenChat: (chat: ChatListItemModel) => void;
  onOpenMenu: (chat: ChatListItemModel) => void;
  onPin: (id: string) => void;
  onMute: (id: string) => void;
  onDelete: (id: string) => void;
  refreshControl?: ReactElement;
}

export default function ChatListView({
  aiChat,
  chats,
  archivedCount = 0,
  onPressArchived,
  onOpenChat,
  onOpenMenu,
  refreshControl,
}: ChatListViewProps) {
  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {onPressArchived ? (
        <TouchableOpacity
          key="archived-chats"
          style={styles.archivedRow}
          onPress={onPressArchived}
          activeOpacity={0.7}
        >
          <View style={styles.archivedIcon}>
            <Archive
              size={19}
              color={colors.neutral.gray600}
            />
          </View>

          <View style={styles.archivedTextContainer}>
            <Text style={styles.archivedTitle}>
              Chats archivados
            </Text>

            <Text style={styles.archivedSubtitle}>
              {archivedCount === 1
                ? '1 chat archivado'
                : `${archivedCount} chats archivados`}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {aiChat ? (
        <AiChatListItem
          key={`ai-${aiChat.id}`}
          name={aiChat.name}
          lastMessage={aiChat.lastMessage}
          time={aiChat.time}
          isProtected={isProtected(aiChat.id)}
          onPress={() => onOpenChat(aiChat)}
          onMorePress={() => onOpenMenu(aiChat)}
        />
      ) : null}

      {chats
        .filter((chat) => Boolean(chat.id?.trim()))
        .map((chat) => (
          <ChatListItem
            key={`conversation-${chat.id}`}
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

      <View
        key="chat-list-bottom-gap"
        style={styles.bottomGap}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  archivedRow: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray200,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  archivedIcon: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginRight: 12,
    width: 38,
  },
  archivedTextContainer: {
    flex: 1,
  },
  archivedTitle: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '600',
  },
  archivedSubtitle: {
    color: colors.neutral.gray500,
    fontSize: 12,
    marginTop: 2,
  },
  bottomGap: {
    height: 100,
  },
});