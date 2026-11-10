'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import HomeHeader from '@/components/client/HomeHeader';
import {
  HomeSearchProvider,
  useHomeSearch,
} from '@/components/client/home/HomeSearchContext';
import { HOME_FILTER_TO_MODULE } from '@/components/client/home/homeSearchFilters';
import SideMenu from '@/components/client/SideMenu';
import { type ModuleKey } from '@/components/client/modules';
import MailModule from '@/components/client/mail/MailModule';
import NotesModule from '@/components/client/notes/NotesModule';
import StorageModule from '@/components/client/storage/StorageModule';
import ChatModule from '@/components/client/chat/ChatModule';
import CalendarModule from '@/components/client/calendar/CalendarModule';
import MainQuickDock from '@/components/client/MainQuickDock';
import { HideVoiceFabOnChats } from '@/components/client/VoiceAssistantFab';
import {
  type ChatSection,
} from '@/components/client/chat/chatSections';

type HomeMenuOption = 'beeservices' | null;

const MODULE_TITLES: Partial<Record<ModuleKey, string>> = {
  mail: 'Correos',
  notes: 'Notas',
  storage: 'Archivos',
  calendar: 'Agenda',
};

export default function HomePage() {
  return (
    <HomeSearchProvider>
      <HomePageBody />
    </HomeSearchProvider>
  );
}

function HomePageBody() {
  const router = useRouter();
  const { filter, query, clearSearch, openHit } = useHomeSearch();

  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>('chat');
  const [chatSection, setChatSection] = useState<ChatSection>('chats');
  const [chatConversationOpen, setChatConversationOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  const handleSelectModule = (key: ModuleKey) => {
    if (
      filter !== 'todos'
      && HOME_FILTER_TO_MODULE[filter] !== key
    ) {
      clearSearch();
    }

    if (key === 'chat') {
      setChatSection('chats');
    }
    setActiveModule(key);
  };

  const handleOpenSideMenuWithOption = (option: HomeMenuOption = null) => {
    if (option === 'beeservices') {
      router.push('/app/beeservices');
      return;
    }
    setSideMenuOpen(true);
  };

  const handleOpenIntegrations = () => {
    router.push('/app/profile/integrations');
  };

  const returnToChats = () => {
    setChatSection('chats');
    setActiveModule('chat');
  };

  const searching = filter !== 'todos' || query.trim().length > 0;

  const hideFloatingTools = searching
    || activeModule === 'calendar'
    || activeModule === 'notes'
    || activeModule === 'storage'
    || activeModule === 'mail'
    || (activeModule === 'chat' && (chatConversationOpen || chatModalOpen));

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'mail':
        return <MailModule onOpenIntegrations={handleOpenIntegrations} />;
      case 'notes':
        return <NotesModule />;
      case 'storage':
        return <StorageModule />;
      case 'chat':
        return (
          <ChatModule
            section={chatSection}
            onSectionChange={setChatSection}
            onOpenModule={handleSelectModule}
            onConversationOpenChange={setChatConversationOpen}
            onChatModalOpenChange={setChatModalOpen}
            onOpenSearchHit={(hit) => {
              openHit(hit);
              if (hit.kind === 'correo') setActiveModule('mail');
              if (hit.kind === 'nota') setActiveModule('notes');
              if (hit.kind === 'archivo') setActiveModule('storage');
              if (hit.kind === 'evento') setActiveModule('calendar');
            }}
          />
        );
      case 'calendar':
        return <CalendarModule />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F4FB]">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <div className="min-w-0">
          <HomeHeader
            onOpenSideMenu={() => handleOpenSideMenuWithOption(null)}
            onSelectModule={handleSelectModule}
            activeModule={activeModule}
          />

          {activeModule !== 'chat' ? (
            <div className="flex items-center gap-2 border-b border-[#E4D8F2] bg-[#F7F4FB] px-5 py-2.5">
              <button
                type="button"
                onClick={returnToChats}
                className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a chats
              </button>
              <span className="text-sm text-neutral-500">{MODULE_TITLES[activeModule]}</span>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 overflow-hidden">
          {activeModule === 'chat' || activeModule === 'mail' || activeModule === 'calendar' || activeModule === 'storage' ? (
            <div className="h-full min-h-0 overflow-hidden">
              {renderModuleContent()}
            </div>
          ) : (
            <div className={`h-full min-h-0 overflow-y-auto overscroll-contain ${activeModule === 'notes' ? '' : 'pb-28'}`}>
              {renderModuleContent()}
            </div>
          )}
        </div>
      </div>

      <HideVoiceFabOnChats active={hideFloatingTools} />
      <MainQuickDock hidden={hideFloatingTools} />

      <SideMenu
        isOpen={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
      />
    </div>
  );
}
