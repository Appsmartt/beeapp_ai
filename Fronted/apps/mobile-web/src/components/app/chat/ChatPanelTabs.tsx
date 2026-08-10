'use client';

import { UserPlus } from 'lucide-react';
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
  restricted: 'Chats restringidos',
  archived: 'Chats archivados',
};

export default function ChatPanelTabs({
  section,
  onNewChat,
  onNewGroup,
  onNewCommunity,
  onNewContact,
}: ChatPanelTabsProps) {
  return (
    <div className="bg-white border-b border-neutral-100 sticky top-0 z-20">
      {/* Title & Create button header row */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{PANEL_TITLE[section]}</h1>
        {section === 'discover' ? (
          <button
            type="button"
            onClick={onNewContact}
            className="p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="Crear contacto"
          >
            <UserPlus className="w-5 h-5 text-brand-primary" />
          </button>
        ) : (
          <ChatCreateMenu
            onNewChat={onNewChat}
            onNewGroup={onNewGroup}
            onNewCommunity={onNewCommunity}
          />
        )}
      </div>
    </div>
  );
}
