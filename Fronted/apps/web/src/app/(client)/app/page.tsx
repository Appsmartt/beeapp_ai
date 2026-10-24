'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import HomeHeader from '@/components/client/HomeHeader';
import SideMenu from '@/components/client/SideMenu';
import { type ModuleKey } from '@/components/client/modules';
import AllModulesOverview from '@/components/client/AllModulesOverview';
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
  overview: 'Módulos',
  mail: 'Correos',
  notes: 'Notas',
  storage: 'Archivos',
  calendar: 'Agenda',
};

export default function HomePage() {
  const router = useRouter();

  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>('chat');
  const [chatSection, setChatSection] = useState<ChatSection>('chats');
  const [chatConversationOpen, setChatConversationOpen] = useState(false);

  const handleSelectModule = (key: ModuleKey) => {
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

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'overview':
        return (
          <AllModulesOverview
            onSelectModule={handleSelectModule}
            onOpenSideMenuOption={(option) => (
              handleOpenSideMenuWithOption(option as HomeMenuOption)
            )}
          />
        );
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
            onOpenOverview={() => setActiveModule('overview')}
            onConversationOpenChange={setChatConversationOpen}
          />
        );
      case 'calendar':
        return <CalendarModule />;
      default:
        return null;
    }
  };

  return (
    <div className={`relative flex h-full min-h-0 flex-1 ${activeModule === 'chat' ? 'bg-[#F3EEF8]' : 'bg-white'}`}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <HomeHeader onOpenSideMenu={() => handleOpenSideMenuWithOption(null)} />

        {activeModule !== 'chat' ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2">
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

        <main
          className={`min-h-0 min-w-0 flex-1 ${
            activeModule === 'chat' ? 'overflow-hidden' : 'overflow-auto'
          }`}
        >
          <div
            key={activeModule}
            className={`motion-content-enter min-h-0 ${
              activeModule === 'chat' ? 'flex h-full flex-col' : 'min-h-full pb-28'
            }`}
          >
            {renderModuleContent()}
          </div>
        </main>
      </div>

      <HideVoiceFabOnChats active={activeModule === 'chat'} />
      <MainQuickDock hidden={activeModule === 'chat' && chatConversationOpen} />

      <SideMenu
        isOpen={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
      />
    </div>
  );
}
