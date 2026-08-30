import type {
  ReactElement,
} from 'react';
import {
  FlatList,
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

interface ChatListViewProps {
  aiChat?: ChatListItemModel;
  chats: ChatListItemModel[];
  archivedCount?: number;
  archivedLabel?: string;
  archivedSubtitle?: string;
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
  archivedLabel = 'Chats archivados',
  archivedSubtitle,
  onPressArchived,
  onOpenChat,
  onOpenMenu,
  refreshControl,
}: ChatListViewProps) {
  const validChats = chats.filter(
    (chat) => Boolean(chat.id?.trim()),
  );

  const resolvedArchivedSubtitle = (
    archivedSubtitle
    || (
      archivedCount === 1
        ? `1 ${archivedLabel.toLowerCase().replace(
            ' archivados',
            '',
          )} archivado`
        : `${archivedCount} archivados`
    )
  );

  return (
    <FlatList
      data={validChats}
      keyExtractor={(chat) => `conversation-${chat.id}`}
      style={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      renderItem={({ item: chat }) => (
        <ChatListItem
          id={chat.id}
          name={chat.name}
          lastMessage={chat.lastMessage}
          time={chat.time}
          unreadCount={chat.unreadCount}
          isGroup={chat.isGroup}
          avatarUrl={chat.avatarUrl}
          verified={chat.verified}
          status={chat.status}
          online={chat.online}
          isPinned={chat.isPinned}
          isMuted={chat.isMuted}
          isProtected={chat.isProtected}
          onPress={() => onOpenChat(chat)}
          onMorePress={() => onOpenMenu(chat)}
        />
      )}
      ListHeaderComponent={
        <>
          {onPressArchived ? (
            <TouchableOpacity
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
                  {archivedLabel}
                </Text>

                <Text style={styles.archivedSubtitle}>
                  {resolvedArchivedSubtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {aiChat ? (
            <AiChatListItem
              name={aiChat.name}
              lastMessage={aiChat.lastMessage}
              time={aiChat.time}
              isProtected={aiChat.isProtected}
              onPress={() => onOpenChat(aiChat)}
              onMorePress={() => onOpenMenu(aiChat)}
            />
          ) : null}
        </>
      }
      ListFooterComponent={
        <View style={styles.bottomGap} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
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
