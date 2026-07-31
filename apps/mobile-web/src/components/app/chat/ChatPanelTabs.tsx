'use client';

import ChatCreateMenu from './ChatCreateMenu';
import { ChatSection } from './chatSections';

interface ChatPanelTabsProps {
  section: ChatSection;
  onSectionChange: (section: ChatSection) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewCommunity: () => void;
  onNewContact?: () => void;
}

/** Título del panel izquierdo según la opción activa del sidebar de Chat */
const PANEL_TITLE: Record<ChatSection, string> = {
  chats: 'Chats',
  communities: 'Comunidades',
  contacts: 'Contactos',
  discover: 'Descubrir red',
  calls: 'Llamadas',
  statuses: 'Estados',
  ai: 'Chats',
};

export default function ChatPanelTabs({
  section,
  onNewChat,
  onNewGroup,
  onNewCommunity,
}: ChatPanelTabsProps) {
  return (
    <div className="bg-white border-b border-neutral-100 sticky top-0 z-20">
      {/* Title & Create button header row */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-neutral-900">{PANEL_TITLE[section]}</h1>
        <ChatCreateMenu
          onNewChat={onNewChat}
          onNewGroup={onNewGroup}
          onNewCommunity={onNewCommunity}
        />
      </div>
    </div>
  );
}
