'use client';

import { ModuleKey } from './modules';
import ChatsCard from './overview/ChatsCard';
import MailCard from './overview/MailCard';
import NotesCard from './overview/NotesCard';
import StorageCard from './overview/StorageCard';
import CalendarCard from './overview/CalendarCard';

interface AllModulesOverviewProps {
  onSelectModule: (moduleKey: ModuleKey) => void;
}

export default function AllModulesOverview({ onSelectModule }: AllModulesOverviewProps) {
  return (
    <div className="p-6 grid grid-cols-3 gap-x-8 gap-y-9 items-start pb-28">
      <ChatsCard onSeeMore={() => onSelectModule('chat')} />
      <MailCard onSeeMore={() => onSelectModule('mail')} />
      <NotesCard onSeeMore={() => onSelectModule('notes')} />
      <StorageCard onSeeMore={() => onSelectModule('storage')} />
      <CalendarCard onSeeMore={() => onSelectModule('calendar')} />
    </div>
  );
}
