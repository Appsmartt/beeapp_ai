'use client';

import { useRef, useEffect } from 'react';
import { X, Mail, Calendar, FolderOpen, FileText, Phone, MessageSquare, ChevronRight } from 'lucide-react';
import { TickerNotification } from '@/mocks/tabNotifications';

interface NotificationsPopoverProps {
  visible: boolean;
  align: 'left' | 'right';
  title: string;
  items: TickerNotification[];
  onClose: () => void;
  onSelectItem: (item: TickerNotification) => void;
}

export default function NotificationsPopover({
  visible,
  align,
  title,
  items,
  onClose,
  onSelectItem,
}: NotificationsPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  if (!visible) return null;

  const unreadCount = items.filter((i) => !i.read).length;

  const getNotificationIcon = (item: TickerNotification) => {
    if (align === 'right' || item.type === 'chat' || item.type === 'call') {
      if (item.type === 'call') {
        return (
          <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4" />
          </div>
        );
      }
      return (
        <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-xs flex items-center justify-center shrink-0">
          {item.initials || item.sender?.slice(0, 2).toUpperCase() || 'AI'}
        </div>
      );
    }

    switch (item.type) {
      case 'mail':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
        );
      case 'calendar':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case 'storage':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4" />
          </div>
        );
      case 'notes':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-16 z-50 w-[360px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-neutral-200/90 overflow-hidden flex flex-col max-h-[400px] animate-in fade-in slide-in-from-bottom-3 duration-200 select-none ${
        align === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-neutral-900">{title}</h3>
          {unreadCount > 0 && (
            <span className="bg-red-50 text-red-600 text-[10px] font-normal px-2 py-0.5 rounded-full border border-red-100">
              {unreadCount} sin leer
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 font-normal">
            No tienes notificaciones recientes
          </div>
        ) : (
          items.map((item) => {
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
                  !item.read ? 'bg-neutral-50/50' : ''
                }`}
              >
                {getNotificationIcon(item)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-normal text-xs text-neutral-900 truncate">
                      {item.sender || item.title || 'Notificación'}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-normal truncate mt-0.5">
                    {item.message}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!item.read && <span className="w-2 h-2 rounded-full bg-brand-primary" />}
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
