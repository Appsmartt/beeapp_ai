'use client';

import { Archive } from 'lucide-react';
import { ChatItem, ChatCategory } from '@/lib/client/chats';
import ChatCategoryChips from './ChatCategoryChips';
import AiChatListItem from './AiChatListItem';
import ChatListSkeleton from './ChatListSkeleton';
import { ChatRow } from './ChatRow';

interface ChatListPanelProps {
  loading?: boolean;
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
  archivedCount?: number;
  onOpenArchived?: () => void;
  searchEmpty?: {
    title: string;
    description: string;
  } | null;
}

export default function ChatListPanel({
  loading = false,
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
  archivedCount = 0,
  onOpenArchived,
  searchEmpty = null,
}: ChatListPanelProps) {
  // Assistant AI chat is pinned on top and is not filtered out unless a category is explicitly active
  const aiChat = activeCategoryId ? undefined : chats.find((c) => c.isAI);

  const filteredChats = chats
    .filter((c) => !c.isAI)
    .filter((c) => !activeCategoryId || (c.categoryIds ?? []).includes(activeCategoryId))
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      {/* Category filter chips */}
      <ChatCategoryChips
        categories={categories}
        activeCategoryId={activeCategoryId}
        onChange={onSelectCategory}
        onCreate={onCreateCategory}
      />

      {/* Chat list */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-28 pt-2">
        {loading ? (
          <ChatListSkeleton />
        ) : null}

        {!loading && onOpenArchived && archivedCount > 0 ? (
          <button
            type="button"
            onClick={onOpenArchived}
            className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl border border-[#E7DFF3] bg-white px-4 py-3 text-left hover:bg-[#FCFAFF]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
              <Archive className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-neutral-900">Chats archivados</span>
              <span className="block text-xs text-neutral-500">
                {archivedCount === 1 ? '1 chat archivado' : `${archivedCount} chats archivados`}
              </span>
            </span>
          </button>
        ) : null}

        {!loading && aiChat && (
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

        {!loading && searchEmpty ? (
          <div className="mx-4 mt-4 rounded-2xl border border-[#E7DFF3] bg-white px-5 py-8 text-center">
            <p className="text-sm font-semibold text-[#432064]">{searchEmpty.title}</p>
            <p className="mt-1 text-xs text-[#786593]">{searchEmpty.description}</p>
          </div>
        ) : null}

        {!loading && filteredChats.map((chat) => (
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
