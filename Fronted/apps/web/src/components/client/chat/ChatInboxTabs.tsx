'use client';

export type InboxTab = 'chats' | 'groups';

interface ChatInboxTabsProps {
  activeTab: InboxTab;
  onChange: (tab: InboxTab) => void;
}

const TABS: { id: InboxTab; label: string }[] = [
  { id: 'chats', label: 'Chats' },
  { id: 'groups', label: 'Grupos' },
];

export default function ChatInboxTabs({ activeTab, onChange }: ChatInboxTabsProps) {
  return (
    <div className="mx-4 my-2 flex rounded-2xl bg-[#E7DEF4] p-1">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-white text-brand-primary shadow-sm'
                : 'text-[#6B5B8A] hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
