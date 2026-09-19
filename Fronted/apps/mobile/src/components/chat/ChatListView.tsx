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
    paddingTop: 8,
  },
  archivedRow: {
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderColor: '#D7E1F4',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#9DAACD',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 1,
  },
  archivedIcon: {
    alignItems: 'center',
    backgroundColor: '#E4ECFF',
    borderColor: '#CBD9F3',
    borderRadius: 13,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  archivedTextContainer: {
    flex: 1,
  },
  archivedTitle: {
    color: '#3F527B',
    fontSize: 14,
    fontWeight: '700',
  },
  archivedSubtitle: {
    color: '#7080A0',
    fontSize: 12,
    marginTop: 2,
  },
  bottomGap: {
    height: 146,
  },
});
