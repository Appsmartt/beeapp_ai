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
  onDeleteCategory?: (id: string) => void;
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
  onDeleteCategory,
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
  const pinnedAiChat = activeCategoryId ? undefined : chats.find((c) => c.isAI && c.isPinned);

  const filteredChats = chats
    .filter((c) => !(c.isAI && c.isPinned))
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
        onDelete={onDeleteCategory}
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
            className="mx-2.5 mb-1.5 flex w-[calc(100%-1.25rem)] items-center gap-2.5 rounded-xl border border-[#E7DFF3] bg-white px-3 py-2 text-left hover:bg-[#FCFAFF]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
              <Archive className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium text-neutral-900">Chats archivados</span>
              <span className="block text-[11px] text-neutral-500">
                {archivedCount === 1 ? '1 chat archivado' : `${archivedCount} chats archivados`}
              </span>
            </span>
          </button>
        ) : null}

        {!loading && pinnedAiChat && (
          <AiChatListItem
            chat={pinnedAiChat}
            isSelected={selectedChatId === pinnedAiChat.id}
            onClick={() => onSelectChat(pinnedAiChat)}
            onPin={onPinChat}
            onMute={onMuteChat}
          />
        )}

        {!loading && searchEmpty ? (
          <div className="mx-4 mt-4 rounded-2xl border border-[#E7DFF3] bg-white px-5 py-8 text-center">
            <p className="text-sm font-semibold text-[#432064]">{searchEmpty.title}</p>
            <p className="mt-1 text-xs text-[#786593]">{searchEmpty.description}</p>
          </div>
        ) : null}

        {!loading && filteredChats.map((chat) => (
          chat.isAI ? (
            <AiChatListItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat)}
              onPin={onPinChat}
              onMute={onMuteChat}
            />
          ) : (
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
          )
        ))}
      </div>
    </div>
  );
}
