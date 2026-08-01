'use client';

import IconRailButton from '../IconRailButton';
import ModuleNotificationBell from '../ModuleNotificationBell';
import { CHAT_SECTIONS, ChatSection } from './chatSections';

interface ChatOptionsBarProps {
  section: ChatSection;
  onSelectSection: (section: ChatSection) => void;
}

export default function ChatOptionsBar({ section, onSelectSection }: ChatOptionsBarProps) {
  return (
    <nav className="hidden lg:flex w-14 shrink-0 bg-white border-r border-neutral-200 flex-col items-center py-3 gap-1 justify-between">
      <div className="flex flex-col items-center gap-1 w-full">
        {CHAT_SECTIONS.map((option) => (
          <IconRailButton
            key={option.key}
            label={option.label}
            icon={option.icon}
            tooltipSide="right"
            isActive={section === option.key}
            onClick={() => onSelectSection(option.key)}
          />
        ))}
      </div>

      <div className="mt-auto pt-2">
        <ModuleNotificationBell moduleId="chat" />
      </div>
    </nav>
  );
}
