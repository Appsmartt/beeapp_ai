'use client';

import { useState } from 'react';
import HomeHeader from '@/components/app/HomeHeader';
import SideMenu from '@/components/app/SideMenu';
import ModuleChipRow, { ModuleKey } from '@/components/app/ModuleChipRow';
import AllModulesOverview from '@/components/app/AllModulesOverview';
import MailModule from '@/components/app/mail/MailModule';
import NotesModule from '@/components/app/notes/NotesModule';
import StorageModule from '@/components/app/storage/StorageModule';
import ChatModule from '@/components/app/chat/ChatModule';
import ContactsModule from '@/components/app/contacts/ContactsModule';
import CalendarModule from '@/components/app/calendar/CalendarModule';
import AppLockScreen from '@/components/app/AppLockScreen';
import CustomizeModal from '@/components/app/CustomizeModal';

export default function HomePage() {
  const [locked, setLocked] = useState(true);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>('overview');

  if (locked) {
    return <AppLockScreen onUnlock={() => setLocked(false)} />;
  }

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'overview':
        return <AllModulesOverview onSelectModule={setActiveModule} />;
      case 'mail':
        return <MailModule />;
      case 'notes':
        return <NotesModule />;
      case 'storage':
        return <StorageModule />;
      case 'chat':
        return <ChatModule />;
      case 'contacts':
        return <ContactsModule />;
      case 'calendar':
        return <CalendarModule />;
      default:
        return (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary font-semibold flex items-center justify-center mx-auto text-xl">
              {(activeModule as string).slice(0, 2).toUpperCase()}
            </div>
            <h2 className="font-semibold text-lg text-neutral-900 capitalize">
              Módulo: {String(activeModule)}
            </h2>
            <p className="text-xs text-neutral-500 font-normal max-w-xs mx-auto">
              Módulo en construcción. Se implementará en las siguientes fases.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Header */}
      <HomeHeader onOpenSideMenu={() => setSideMenuOpen(true)} />

      {/* Module Chips Row */}
      <ModuleChipRow
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenCustomize={() => setCustomizeOpen(true)}
      />

      {/* Side Menu Drawer */}
      <SideMenu
        isOpen={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
      />

      {/* Customize Modal */}
      <CustomizeModal
        isOpen={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
      />

      {/* Content Area */}
      <main className="flex-1">
        {renderModuleContent()}
      </main>
    </div>
  );
}
