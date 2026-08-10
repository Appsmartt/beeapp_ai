'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeHeader from '@/components/app/HomeHeader';
import SideMenu, { MenuOption } from '@/components/app/SideMenu';
import {
  ModuleKey,
  REORDERABLE_MODULE_KEYS,
} from '@/components/app/modules';
import ModuleSidebar from '@/components/app/ModuleSidebar';
import AllModulesOverview from '@/components/app/AllModulesOverview';
import MailModule from '@/components/app/mail/MailModule';
import NotesModule from '@/components/app/notes/NotesModule';
import StorageModule from '@/components/app/storage/StorageModule';
import ChatModule from '@/components/app/chat/ChatModule';
import CalendarModule from '@/components/app/calendar/CalendarModule';
import { ChatSection } from '@/components/app/chat/chatSections';

type HomeMenuOption = MenuOption | 'beeservices';

export default function HomePage() {
  const router = useRouter();

  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [sideMenuOption, setSideMenuOption] = useState<MenuOption>(null);
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

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'overview':
        return (
          <AllModulesOverview
            onSelectModule={handleSelectModule}
            onOpenSideMenuOption={(option) =>
              handleOpenSideMenuWithOption(
                option as HomeMenuOption,
              )
            }
          />
        );

      case 'mail':
        return <MailModule />;

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
    <div className="min-h-full bg-white flex">
      <div className="flex-1 min-w-0 flex flex-col">
        <HomeHeader
          onOpenSideMenu={() => handleOpenSideMenuWithOption(null)}
        />

        <main className="flex-1 min-w-0">
          {renderModuleContent()}
        </main>
      </div>

      <ModuleSidebar
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        onOpenSideMenu={() => handleOpenSideMenuWithOption(null)}
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