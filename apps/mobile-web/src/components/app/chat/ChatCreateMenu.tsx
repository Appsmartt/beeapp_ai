'use client';

import { useState, useRef, useEffect } from 'react';
import { SquarePen, MessageCircle, Users, Megaphone } from 'lucide-react';

interface ChatCreateMenuProps {
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewCommunity: () => void;
}

export default function ChatCreateMenu({
  onNewChat,
  onNewGroup,
  onNewCommunity,
}: ChatCreateMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const OPTIONS = [
    { label: 'Nuevo chat', icon: MessageCircle, action: onNewChat },
    { label: 'Nuevo grupo', icon: Users, action: onNewGroup },
    { label: 'Nueva comunidad', icon: Megaphone, action: onNewCommunity },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Crear"
        className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center hover:bg-neutral-200 transition-colors"
      >
        <SquarePen className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-52 bg-white border border-neutral-200 rounded-2xl shadow-xl z-40 py-2 text-xs">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  option.action();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-neutral-50 text-neutral-800 font-normal"
              >
                <Icon className="w-4 h-4 text-brand-primary" />
                <span className="text-xs">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
