'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  getCurrentWebNotifications,
  markAllCurrentWebNotificationsAsRead,
  markCurrentWebNotificationAsRead,
} from '@beeapp/api-client';

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  module?: string | null;
};

function formatTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getCurrentWebNotifications({ limit: 50 });
      setItems(
        (response.notifications ?? []).map((notification) => ({
          id: notification.id,
          title: notification.title || 'Notificación',
          body: notification.body || '',
          time: formatTime(notification.created_at),
          unread: !notification.read_at,
          module: notification.module,
        })),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las notificaciones.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const groups = new Map<string, NotificationRow[]>();
    items.forEach((item) => {
      const key = item.unread ? 'Nuevas' : 'Anteriores';
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    });
    return groups;
  }, [items]);

  const markRead = async (id: string) => {
    try {
      await markCurrentWebNotificationAsRead(id);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, unread: false } : item)));
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await markAllCurrentWebNotificationsAsRead();
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bg-white min-h-full flex flex-col pb-24">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="flex items-center">
          <Link href="/app" className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-base text-neutral-900 ml-2">Centro de Notificaciones</h1>
        </div>
        <button type="button" onClick={() => void markAll()} className="text-[11px] font-semibold text-brand-primary">
          Marcar todas
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center gap-2 text-xs text-neutral-500 py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando…
          </div>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-neutral-500 text-center py-8">No tienes notificaciones.</p>
        ) : (
          Array.from(grouped.entries()).map(([group, rows]) => (
            <div key={group} className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{group}</p>
              <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
                {rows.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void markRead(item.id)}
                    className={`w-full text-left py-3.5 px-1 flex items-start gap-3 ${
                      item.unread ? 'bg-brand-primary/5' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-neutral-900 truncate">{item.title}</span>
                        <span className="text-[10px] text-neutral-400 font-normal shrink-0">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-normal mt-0.5">{item.body}</p>
                      {item.module ? (
                        <span className="text-[10px] text-brand-primary font-semibold">{item.module}</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
