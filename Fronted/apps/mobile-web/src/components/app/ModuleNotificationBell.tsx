'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bell,
  FileText,
  Folder,
  Info,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import {
  getCurrentWebNotifications,
  markAllCurrentWebNotificationsAsRead,
} from '@beeapp/api-client';
import type { AppNotification } from '@beeapp/shared-types';

type NotificationBellPlacement = 'sidebar' | 'header';

interface ModuleNotificationBellProps {
  moduleId: 'chat' | 'mail' | 'notes' | 'storage' | 'calendar';
  placement?: NotificationBellPlacement;
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isToday) {
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  });
}

function NotificationIcon({
  notification,
}: {
  notification: AppNotification;
}) {
  if (
    notification.type === 'file_shared' ||
    notification.type === 'file_share_revoked'
  ) {
    return <Share2 className="h-3.5 w-3.5 text-brand-primary" />;
  }

  if (
    notification.type === 'file_trashed' ||
    notification.type === 'file_deleted'
  ) {
    return <Trash2 className="h-3.5 w-3.5 text-brand-primary" />;
  }

  if (
    notification.type === 'upload_success' ||
    notification.type === 'upload_failed' ||
    notification.type === 'file_restored'
  ) {
    return <Folder className="h-3.5 w-3.5 text-brand-primary" />;
  }

  if (notification.module === 'storage') {
    return <FileText className="h-3.5 w-3.5 text-brand-primary" />;
  }

  return <Info className="h-3.5 w-3.5 text-brand-primary" />;
}

export default function ModuleNotificationBell({
  moduleId,
  placement = 'sidebar',
}: ModuleNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const popoverRef = useRef<HTMLDivElement>(null);

  const backendModule = useMemo(() => moduleId, [moduleId]);

  const loadUnreadNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getCurrentWebNotifications({
        module: backendModule,
        unread_only: true,
        limit: 20,
        offset: 0,
      });

      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);

      return response.notifications;
    } catch {
      setNotifications([]);
      setUnreadCount(0);

      return [];
    } finally {
      setLoading(false);
    }
  }, [backendModule]);

  useEffect(() => {
    void loadUnreadNotifications();
  }, [loadUnreadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleOpen = async () => {
    setOpen(true);

    try {
      setLoading(true);

      const response = await getCurrentWebNotifications({
        module: backendModule,
        unread_only: true,
        limit: 20,
        offset: 0,
      });

      setNotifications(response.notifications);

      if (response.unread_count > 0) {
        await markAllCurrentWebNotificationsAsRead(backendModule);
      }

      setUnreadCount(0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const popoverClassName =
    placement === 'header'
      ? 'absolute right-0 top-12 z-50 w-80 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150'
      : 'absolute bottom-0 left-12 z-50 w-80 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-left-2 duration-150';

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }

          void handleOpen();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        title={`Notificaciones de ${moduleId}`}
        aria-label={`Notificaciones de ${moduleId}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={popoverClassName}>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Bell className="h-4 w-4 text-brand-primary" />
              <span>Notificaciones</span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Cerrar notificaciones"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {loading ? (
              <div className="py-6 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-400">
                Sin notificaciones nuevas
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-2.5 text-xs text-neutral-900"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <NotificationIcon notification={notification} />

                    <span className="truncate text-xs font-medium">
                      {notification.title}
                    </span>

                    <span className="ml-auto shrink-0 text-[10px] text-neutral-400">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-[11px] font-normal text-neutral-500">
                    {notification.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}