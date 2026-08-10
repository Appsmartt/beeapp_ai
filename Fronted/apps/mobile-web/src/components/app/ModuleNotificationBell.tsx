'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Bell, X, Mail, Calendar, Folder, FileText, MessageCircle, Phone } from 'lucide-react';
import { LEFT_TAB_NOTIFICATIONS, RIGHT_TAB_NOTIFICATIONS } from '@/mocks/tabNotifications';

interface ModuleNotificationBellProps {
  moduleId: 'chat' | 'mail' | 'notes' | 'storage' | 'calendar';
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  mail: Mail,
  calendar: Calendar,
  storage: Folder,
  notes: FileText,
  chat: MessageCircle,
  call: Phone,
};

export default function ModuleNotificationBell({ moduleId }: ModuleNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(() => {
    const all = [...LEFT_TAB_NOTIFICATIONS, ...RIGHT_TAB_NOTIFICATIONS];
    return all.filter((item) => {
      if (moduleId === 'chat') return item.type === 'chat' || item.type === 'call';
      return item.type === moduleId;
    });
  }, [moduleId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors relative cursor-pointer"
        title={`Notificaciones de ${moduleId}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-semibold px-1 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-12 bottom-0 w-80 bg-white rounded-2xl border border-neutral-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Bell className="w-4 h-4 text-brand-primary" />
              <span>Notificaciones</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">Sin notificaciones nuevas</p>
            ) : (
              notifications.map((item) => {
                const Icon = TYPE_ICONS[item.type] || Bell;
                return (
                  <div
                    key={item.id}
                    onClick={() => setOpen(false)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      item.read
                        ? 'bg-neutral-50 border-neutral-100 text-neutral-600'
                        : 'bg-brand-primary/5 border-brand-primary/20 text-neutral-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                      <span className="truncate text-xs font-medium">
                        {item.title || item.sender || 'Notificación'}
                      </span>
                      <span className="text-[10px] text-neutral-400 ml-auto shrink-0">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-normal line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
