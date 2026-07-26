import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { SquarePen, Search, Plus } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import ChatListItem from '../../../src/components/chat/ChatListItem';
import { MOCK_CHATS, MOCK_STORIES } from '../../../src/mocks/chats';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChatListScreen() {
  const router = useModuleNav();
  const [searchText, setSearchText] = useState('');

  // Interactive Mock Chat List State
  const [chats, setChats] = useState(MOCK_CHATS);

  // Mock Stories (Status)
  const stories = MOCK_STORIES;

  // Actions handlers
  const handlePin = (id: string) => {
    setChats(
      chats.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleMute = (id: string) => {
    setChats(
      chats.map((c) => (c.id === id ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  const handleDelete = (id: string) => {
    setChats(chats.filter((c) => c.id !== id));
  };

  const handleChatPress = (chat: typeof chats[0]) => {
    // Reset unread count on press
    setChats(
      chats.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
    );
    
    // Navigate to conversation view passing metadata parameters
    router.push({
      pathname: '/(main)/chat/conversation',
      params: {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup ? 'true' : 'false',
        online: chat.online ? 'true' : 'false',
      },
    });
  };

  const handleNewChat = () => {
    router.push('/(main)/chat/new');
  };

  const handleStoryPress = (story: typeof stories[0]) => {
    if (story.isUser) {
      router.push({
        pathname: '/(main)/chat/story',
        params: {
          id: 'tu',
          name: 'Tu estado',
          initials: 'S',
          isSelf: 'true',
        },
      });
    } else {
      router.push({
        pathname: '/(main)/chat/story',
        params: {
          id: story.id,
          name: story.name,
          initials: story.initials,
          isSelf: 'false',
        },
      });
    }
  };

  const handleCreateStory = () => {
    router.push('/(main)/chat/create-story');
  };

  // Filtered chats based on search
  const filteredChats = chats
    .filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase()))
    // Order pinned chats first
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Chats</Text>
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={handleNewChat}
            activeOpacity={0.7}
          >
            <SquarePen size={20} color={colors.neutral.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.neutral.gray500} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversaciones..."
            placeholderTextColor={colors.neutral.gray500}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Status / Story Horizontal list */}
        <View style={styles.storiesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
            {stories.map((story) => (
              <View key={story.id} style={styles.storyWrap}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleStoryPress(story)}
                >
                  {story.isUser ? (
                    <View style={styles.userStoryCircle}>
                      <Text style={styles.userStoryText}>YO</Text>
                      <TouchableOpacity
                        style={styles.addStoryBadge}
                        onPress={handleCreateStory}
                        activeOpacity={0.7}
                      >
                        <Plus size={10} color={colors.neutral.white} strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.storyCircle,
                        story.hasActive && styles.storyCircleActive,
                      ]}
                    >
                      <View style={styles.storyInnerCircle}>
                        <Text style={styles.storyText}>{story.initials}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.storyName} numberOfLines={1}>
                  {story.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Conversation List Scroll Area */}
        <ScrollView style={styles.chatListScroll} showsVerticalScrollIndicator={false}>
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                id={chat.id}
                name={chat.name}
                lastMessage={chat.lastMessage}
                time={chat.time}
                unreadCount={chat.unreadCount}
                isGroup={chat.isGroup}
                status={chat.status}
                online={chat.online}
                isPinned={chat.isPinned}
                isMuted={chat.isMuted}
                onPress={() => handleChatPress(chat)}
                onPin={() => handlePin(chat.id)}
                onMute={() => handleMute(chat.id)}
                onDelete={() => handleDelete(chat.id)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron chats</Text>
            </View>
          )}
          {/* Bottom spacing for menu pill */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Menu Tab Bar */}
        {!router.embedded && <FloatingTabBar activeTab="chat" />}
      </View>
    </SafeAreaView>
  );
}

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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.neutral.white,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
    position: 'absolute',
    left: 32,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    paddingLeft: 38,
    paddingRight: 16,
    fontSize: 14,
    color: colors.neutral.text,
  },
  storiesContainer: {
    paddingVertical: 14,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  storiesScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  storyWrap: {
    alignItems: 'center',
    width: 60,
  },
  userStoryCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },
  userStoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  addStoryBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand.primary,
    borderWidth: 2,
    borderColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  storyCircleActive: {
    borderColor: colors.brand.primary,
  },
  storyInnerCircle: {
    flex: 1,
    width: '100%',
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  storyName: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  chatListScroll: {
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral.gray500,
    fontWeight: '600',
  },
});
