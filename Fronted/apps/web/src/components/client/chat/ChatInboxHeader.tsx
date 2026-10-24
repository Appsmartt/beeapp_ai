'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Home, Phone, UserPlus, Users, Globe } from 'lucide-react';
import ModuleNotificationBell from '../ModuleNotificationBell';
import ChatCreateMenu from './ChatCreateMenu';
import type { ChatSection } from './chatSections';

interface ChatInboxHeaderProps {
  title: string;
  onOpenOverview: () => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewCommunity: () => void;
  onOpenSection: (section: ChatSection) => void;
  onBack?: () => void;
}

const SOCIAL_ITEMS: { section: ChatSection; label: string; icon: typeof Users }[] = [
  { section: 'contacts', label: 'Contactos', icon: Users },
  { section: 'discover', label: 'Descubrir red', icon: Globe },
  { section: 'calls', label: 'Llamadas', icon: Phone },
  { section: 'communities', label: 'Comunidades', icon: Users },
];

export default function ChatInboxHeader({
  title,
  onOpenOverview,
  onNewChat,
  onNewGroup,
  onNewCommunity,
  onOpenSection,
  onBack,
}: ChatInboxHeaderProps) {
  const [socialOpen, setSocialOpen] = useState(false);
  const socialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (socialRef.current && !socialRef.current.contains(event.target as Node)) {
        setSocialOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#E6DCF4] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl p-2 text-neutral-700 hover:bg-neutral-100"
            aria-label="Volver a chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenOverview}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary text-white"
            aria-label="Abrir módulos"
          >
            <Home className="h-5 w-5" />
          </button>
        )}
        <h1 className="truncate text-xl font-semibold text-neutral-900">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <ModuleNotificationBell moduleId="chat" placement="header" />
        <div className="relative" ref={socialRef}>
          <button
            type="button"
            onClick={() => setSocialOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 hover:bg-white/70"
            aria-label="Contactos y actividad"
          >
            <UserPlus className="h-5 w-5" />
          </button>
          {socialOpen ? (
            <div className="absolute right-0 top-12 z-40 w-52 rounded-2xl border border-neutral-200 bg-white py-1.5 text-xs shadow-xl">
              {SOCIAL_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.section}
                    type="button"
                    onClick={() => {
                      setSocialOpen(false);
                      onOpenSection(item.section);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-neutral-800 hover:bg-neutral-50"
                  >
                    <Icon className="h-4 w-4 text-brand-primary" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <ChatCreateMenu
          onNewChat={onNewChat}
          onNewGroup={onNewGroup}
          onNewCommunity={onNewCommunity}
        />
      </div>
    </div>
  );
}
