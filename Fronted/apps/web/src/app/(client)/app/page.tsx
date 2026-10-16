'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import HomeHeader from '@/components/client/HomeHeader';
import SideMenu, {
  type MenuOption,
} from '@/components/client/SideMenu';
import {
  type ModuleKey,
  REORDERABLE_MODULE_KEYS,
} from '@/components/client/modules';
import ModuleSidebar from '@/components/client/ModuleSidebar';
import AllModulesOverview from '@/components/client/AllModulesOverview';
import MailModule from '@/components/client/mail/MailModule';
import NotesModule from '@/components/client/notes/NotesModule';
import StorageModule from '@/components/client/storage/StorageModule';
import ChatModule from '@/components/client/chat/ChatModule';
import CalendarModule from '@/components/client/calendar/CalendarModule';
import {
  type ChatSection,
} from '@/components/client/chat/chatSections';

type HomeMenuOption = MenuOption | 'beeservices';

export default function HomePage() {
  const router = useRouter();

  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const [sideMenuOption, setSideMenuOption] =
    useState<MenuOption>(null);

  const [activeModule, setActiveModule] =
    useState<ModuleKey>('overview');

  const [chatSection, setChatSection] =
    useState<ChatSection>('chats');

  const [moduleOrder, setModuleOrder] = useState<ModuleKey[]>(
    REORDERABLE_MODULE_KEYS,
  );

  const handleSelectModule = (key: ModuleKey) => {
    if (key === 'chat' && activeModule !== 'chat') {
      setChatSection('chats');
    }

    setActiveModule(key);
  };

  const handleOpenSideMenuWithOption = (
    option: HomeMenuOption = null,
  ) => {
    if (option === 'beeservices') {
      router.push('/app/beeservices');
      return;
    }

    setSideMenuOption(option);
    setSideMenuOpen(true);
  };

  const handleOpenIntegrations = () => {
    handleOpenSideMenuWithOption('integrations');
  };

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'overview':
        return (
          <AllModulesOverview
            onSelectModule={handleSelectModule}
            onOpenSideMenuOption={(option) => (
              handleOpenSideMenuWithOption(
                option as HomeMenuOption,
              )
            )}
          />
        );

      case 'mail':
        return (
          <MailModule
            onOpenIntegrations={handleOpenIntegrations}
          />
        );

      case 'notes':
        return <NotesModule />;

      case 'storage':
        return <StorageModule />;

      case 'chat':
        return (
          <ChatModule
            section={chatSection}
            onSectionChange={setChatSection}
          />
        );

      case 'calendar':
        return <CalendarModule />;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 bg-white">
      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        <HomeHeader
          onOpenSideMenu={() => {
            handleOpenSideMenuWithOption(null);
          }}
        />

        <main
          className={`min-w-0 flex-1 min-h-0 ${
            activeModule === 'chat' ? 'overflow-hidden' : 'overflow-auto'
          }`}
        >
          <div
            key={activeModule}
            className={`motion-content-enter min-h-0 ${
              activeModule === 'chat' ? 'flex h-full flex-col' : 'min-h-full'
            }`}
          >
            {renderModuleContent()}
          </div>
        </main>
      </div>

      <ModuleSidebar
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        onOpenSideMenu={() => {
          handleOpenSideMenuWithOption(null);
        }}
        moduleOrder={moduleOrder}
        onReorderModules={setModuleOrder}
      />

      <SideMenu
        isOpen={sideMenuOpen}
        initialOption={sideMenuOption}
        onClose={() => {
          setSideMenuOpen(false);
          setSideMenuOption(null);
        }}
      />
    </div>
  );
}