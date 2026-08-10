import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { useNavigation } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { SquarePen, UserPlus, ArrowLeft } from 'lucide-react-native';
import ModuleNotificationBell from '../../../src/components/ModuleNotificationBell';
import ChatListView from '../../../src/components/chat/ChatListView';
import StatusCirclesRow from '../../../src/components/chat/StatusCirclesRow';
import StatusViewer from '../../../src/components/chat/StatusViewer';
import CreateStatusModal from '../../../src/components/chat/CreateStatusModal';
import ChatTabs, { ChatTab } from '../../../src/components/chat/ChatTabs';
import ChatCategoryChips from '../../../src/components/chat/ChatCategoryChips';
import ChatCategoryModals from '../../../src/components/chat/ChatCategoryModals';
import ChatOptionsSheet from '../../../src/components/chat/ChatOptionsSheet';
import ContactsListView from '../../../src/components/contacts/ContactsListView';
import CommunitiesTabView from '../../../src/components/chat/CommunitiesTabView';
import CreateCommunityModal from '../../../src/components/chat/CreateCommunityModal';
import ChatCreateMenu from '../../../src/components/chat/ChatCreateMenu';
import { Community, MOCK_COMMUNITIES, addCommunity } from '../../../src/mocks/communities';
import {
  MOCK_CHATS,
  MOCK_CATEGORIES,
  ChatCategory,
  addCategory,
  setChatCategories,
} from '../../../src/mocks/chats';
import { MOCK_STATUSES, addStatus, markStatusViewed } from '../../../src/mocks/statuses';
import { isProtected, hasPin, setProtected } from '../../../src/stores/pinStore';
import PinLockModal from '../../../src/components/security/PinLockModal';

export default function ChatListScreen() {
  const router = useModuleNav();
  const navigation = useNavigation();

  const [chats, setChats] = useState(MOCK_CHATS);
  const [menuChat, setMenuChat] = useState<typeof MOCK_CHATS[0] | null>(null);
  const [lockedChatId, setLockedChatId] = useState<string | null>(null);
  const [pinAction, setPinAction] = useState<{
    type: 'open' | 'add' | 'remove';
    chat?: typeof MOCK_CHATS[0];
  } | null>(null);
  const [, setTick] = useState(0);

  const [activeTab, setActiveTab] = useState<ChatTab>('chats');
  const [viewMode, setViewMode] = useState<'all' | 'archived'>('all');
  const [creatingContact, setCreatingContact] = useState(false);
  const isContactsTab = activeTab === 'contacts';

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([...MOCK_COMMUNITIES]);

  const [categories, setCategories] = useState<ChatCategory[]>([...MOCK_CATEGORIES]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [assigningChat, setAssigningChat] = useState<typeof MOCK_CHATS[0] | null>(null);

  const [statuses, setStatuses] = useState([...MOCK_STATUSES]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [creatingStatus, setCreatingStatus] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setChats([...MOCK_CHATS]);
    });

    return unsubscribe;
  }, [navigation]);

  const handlePin = (id: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, isPinned: !chat.isPinned } : chat)),
    );
  };

  const handleMute = (id: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, isMuted: !chat.isMuted } : chat)),
    );
  };

  const handleDelete = (id: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== id));
  };

  const handleArchive = (id: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, isArchived: true } : chat)),
    );
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
    setChats((prev) =>
      prev.map((item) => (item.id === chat.id ? { ...item, unreadCount: 0 } : item)),
    );

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

  const handleToggleProtection = (chat: typeof chats[0]) => {
    setMenuChat(null);

    if (isProtected(chat.id)) {
      setPinAction({ type: 'remove', chat });
      setLockedChatId(chat.id);
      return;
    }

    if (!hasPin()) {
      alert('Debes crear un PIN primero en los ajustes de Seguridad.');
      router.push('/(main)/profile/security');
      return;
    }

    setPinAction({ type: 'add', chat });
    setLockedChatId(chat.id);
  };

  const handlePinSuccess = () => {
    const action = pinAction;

    setLockedChatId(null);
    setPinAction(null);

    if (!action) return;

    if (action.type === 'open' && action.chat) {
      openChat(action.chat);
      return;
    }

    if (action.type === 'add' && action.chat) {
      setProtected(action.chat.id, true);
      setTick((tick) => tick + 1);
      alert('Chat protegido con éxito.');
      return;
    }

    if (action.type === 'remove' && action.chat) {
      setProtected(action.chat.id, false);
      setTick((tick) => tick + 1);
      alert('Protección del chat removida.');
    }
  };

  const archivedCount = chats.filter((chat) => chat.isArchived).length;

  const aiChat =
    activeCategoryId || viewMode !== 'all'
      ? undefined
      : chats.find((chat) => chat.isAI);

  const filteredChats = chats
    .filter((chat) => {
      if (chat.isAI) return false;
      if (viewMode === 'archived') return !!chat.isArchived;

      return !chat.isArchived;
    })
    .filter((chat) => !activeCategoryId || (chat.categoryIds ?? []).includes(activeCategoryId))
    .sort((a, b) => {
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1;
    });

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {viewMode === 'archived' ? (
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => setViewMode('all')}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={colors.neutral.text} />
              <Text style={styles.title}>Chats archivados</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.title}>Chats</Text>
          )}

          <View style={styles.headerActions}>
            <ModuleNotificationBell moduleId="chat" />

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() =>
                isContactsTab ? setCreatingContact(true) : setCreateMenuOpen(true)
              }
              activeOpacity={0.7}
            >
              {isContactsTab ? (
                <UserPlus size={20} color={colors.neutral.text} />
              ) : (
                <SquarePen size={20} color={colors.neutral.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'all' && (
          <ChatTabs activeTab={activeTab} onChange={setActiveTab} />
        )}

        {isContactsTab ? (
          <ContactsListView
            creating={creatingContact}
            onCloseCreate={() => setCreatingContact(false)}
          />
        ) : activeTab === 'communities' ? (
          <CommunitiesTabView
            communities={communities}
            onOpenCommunity={(community) =>
              router.push({
                pathname: '/(main)/chat/community',
                params: { id: community.id },
              })
            }
          />
        ) : (
          <>
            {viewMode === 'all' && (
              <>
                <StatusCirclesRow
                  statuses={statuses}
                  onCreate={() => setCreatingStatus(true)}
                  onOpen={(index) => {
                    markStatusViewed(statuses[index].id);
                    setStatuses([...MOCK_STATUSES]);
                    setViewerIndex(index);
                  }}
                />

                <ChatCategoryChips
                  categories={categories}
                  activeCategoryId={activeCategoryId}
                  onChange={setActiveCategoryId}
                  onCreate={() => setCreatingCategory(true)}
                />
              </>
            )}

            <ChatListView
              aiChat={aiChat}
              chats={filteredChats}
              archivedCount={viewMode === 'all' ? archivedCount : 0}
              onPressArchived={
                viewMode === 'all' ? () => setViewMode('archived') : undefined
              }
              onOpenChat={handleChatPress}
              onOpenMenu={setMenuChat}
              onPin={handlePin}
              onMute={handleMute}
              onDelete={handleDelete}
            />
          </>
        )}
      </View>

      <StatusViewer
        visible={viewerIndex !== null}
        statuses={statuses}
        index={viewerIndex ?? 0}
        onChangeIndex={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />

      <CreateStatusModal
        visible={creatingStatus}
        onPublish={(status) => {
          addStatus(status);
          setStatuses([...MOCK_STATUSES]);
          setCreatingStatus(false);
        }}
        onClose={() => setCreatingStatus(false)}
      />

      <PinLockModal
        visible={!!lockedChatId}
        itemName={pinAction?.chat?.name || 'Chat protegido'}
        onClose={() => {
          setLockedChatId(null);
          setPinAction(null);
        }}
        onSuccess={handlePinSuccess}
      />

      <ChatCreateMenu
        visible={createMenuOpen}
        onNewChat={() => {
          setCreateMenuOpen(false);
          router.push('/(main)/chat/new');
        }}
        onNewGroup={() => {
          setCreateMenuOpen(false);
          router.push({
            pathname: '/(main)/chat/new',
            params: { mode: 'group' },
          });
        }}
        onNewCommunity={() => {
          setCreateMenuOpen(false);
          setCreatingCommunity(true);
        }}
        onClose={() => setCreateMenuOpen(false)}
      />

      <CreateCommunityModal
        visible={creatingCommunity}
        onCreate={(data) => {
          addCommunity(data);
          setCommunities([...MOCK_COMMUNITIES]);
          setCreatingCommunity(false);
          setActiveTab('communities');
        }}
        onClose={() => setCreatingCommunity(false)}
      />

      <ChatOptionsSheet
        chat={menuChat}
        isProtected={!!menuChat && isProtected(menuChat.id)}
        onToggleProtection={() => menuChat && handleToggleProtection(menuChat)}
        onTogglePin={() => {
          if (menuChat) handlePin(menuChat.id);
          setMenuChat(null);
        }}
        onToggleMute={() => {
          if (menuChat) handleMute(menuChat.id);
          setMenuChat(null);
        }}
        onAssignCategory={() => {
          setAssigningChat(menuChat);
          setMenuChat(null);
        }}
        onDelete={() => {
          if (menuChat) handleDelete(menuChat.id);
          setMenuChat(null);
        }}
        onArchive={() => {
          if (menuChat) handleArchive(menuChat.id);
          setMenuChat(null);
        }}
        onClose={() => setMenuChat(null)}
      />

      <ChatCategoryModals
        categories={categories}
        creating={creatingCategory}
        onCreate={(category) => {
          const created = addCategory(category);
          setCategories([...MOCK_CATEGORIES]);
          setActiveCategoryId(created.id);
          setCreatingCategory(false);
        }}
        onCloseCreate={() => setCreatingCategory(false)}
        assigningChat={assigningChat}
        onSaveAssign={(ids) => {
          if (assigningChat) {
            setChatCategories(assigningChat.id, ids);
          }

          setChats([...MOCK_CHATS]);
          setAssigningChat(null);
        }}
        onCloseAssign={() => setAssigningChat(null)}
      />
    </ScreenSafeArea>
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});