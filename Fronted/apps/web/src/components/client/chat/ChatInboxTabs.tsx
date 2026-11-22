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
    <div className="flex min-w-[136px] max-w-[190px] flex-1 rounded-xl bg-[#E7DEF4] p-0.5 md:mx-4 md:my-2 md:max-w-none md:rounded-2xl md:p-1">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors md:rounded-xl md:py-2.5 md:text-sm ${
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
