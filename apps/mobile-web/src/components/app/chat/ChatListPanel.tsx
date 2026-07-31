'use client';

import { ChatItem, ChatCategory } from '@/mocks/chats';
import ChatCategoryChips from './ChatCategoryChips';
import AiChatListItem from './AiChatListItem';
import { ChatRow } from './ChatRow';

interface ChatListPanelProps {
  chats: ChatItem[];
  categories: ChatCategory[];
  activeCategoryId: string | null;
  selectedChatId?: string;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory: () => void;
  onSelectChat: (chat: ChatItem) => void;
  onPinChat?: (id: string) => void;
  onMuteChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onAssignCategory?: (chat: ChatItem) => void;
  onToggleProtection?: (chat: ChatItem) => void;
  onArchiveChat?: (id: string) => void;
}

export default function ChatListPanel({
  chats,
  categories,
  activeCategoryId,
  selectedChatId,
  onSelectCategory,
  onCreateCategory,
  onSelectChat,
  onPinChat,
  onMuteChat,
  onDeleteChat,
  onAssignCategory,
  onToggleProtection,
  onArchiveChat,
}: ChatListPanelProps) {
  // Assistant AI chat is pinned on top and is not filtered out unless a category is explicitly active
  const aiChat = activeCategoryId ? undefined : chats.find((c) => c.isAI);

  const filteredChats = chats
    .filter((c) => !c.isAI)
    .filter((c) => !activeCategoryId || (c.categoryIds ?? []).includes(activeCategoryId))
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Category filter chips */}
      <ChatCategoryChips
        categories={categories}
        activeCategoryId={activeCategoryId}
        onChange={onSelectCategory}
        onCreate={onCreateCategory}
      />

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {aiChat && (
          <AiChatListItem
            chat={aiChat}
            isSelected={selectedChatId === aiChat.id}
            onClick={() => onSelectChat(aiChat)}
            onPin={onPinChat}
            onMute={onMuteChat}
            onAssignCategory={onAssignCategory}
            onToggleProtection={onToggleProtection}
          />
        )}

        {filteredChats.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            isSelected={selectedChatId === chat.id}
            onClick={() => onSelectChat(chat)}
            onPin={onPinChat}
            onMute={onMuteChat}
            onDelete={onDeleteChat}
            onAssignCategory={onAssignCategory}
            onToggleProtection={onToggleProtection}
            onArchive={onArchiveChat}
          />
        ))}
      </div>
    </div>
  );
}
