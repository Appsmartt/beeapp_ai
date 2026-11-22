'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import {
  getCurrentWebNotifications,
  markAllCurrentWebNotificationsAsRead,
  markCurrentWebNotificationAsRead,
} from '@beeapp/api-client';

type NotificationFilter = 'all' | 'unread' | 'read';

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  time: string;
  unread: boolean;
  module?: string | null;
  metadata?: Record<string, unknown> | null;
};

function formatTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function getDateBucket(isoString: string): 'Hoy' | 'Ayer' | 'Anteriores' {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Anteriores';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  if (date >= startOfToday) return 'Hoy';
  if (date >= startOfYesterday) return 'Ayer';
  return 'Anteriores';
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getCurrentWebNotifications({ limit: 100 });
      setItems(
        (response.notifications ?? []).map((notification) => ({
          id: notification.id,
          title: notification.title || 'Notificación',
          body: notification.body || '',
          createdAt: notification.created_at,
          time: formatTime(notification.created_at),
          unread: !notification.read_at,
          module: notification.module,
          metadata: (notification.metadata as Record<string, unknown> | null) ?? null,
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

  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);

  const filteredItems = useMemo(() => {
    if (filter === 'unread') return items.filter((item) => item.unread);
    if (filter === 'read') return items.filter((item) => !item.unread);
    return items;
  }, [filter, items]);

  const grouped = useMemo(() => {
    const groups = new Map<'Hoy' | 'Ayer' | 'Anteriores', NotificationRow[]>();
    filteredItems.forEach((item) => {
      const key = getDateBucket(item.createdAt);
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    });
    return groups;
  }, [filteredItems]);

  const handleNotificationClick = async (item: NotificationRow) => {
    if (item.unread) {
      try {
        await markCurrentWebNotificationAsRead(item.id);
        setItems((current) => current.map((row) => (row.id === item.id ? { ...row, unread: false } : row)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No fue posible marcar la notificación.');
      }
    }

    const meta = item.metadata ?? {};
    const conversationId = typeof meta.conversation_id === 'string' ? meta.conversation_id : null;
    const requestId = typeof meta.request_id === 'string' ? meta.request_id : null;
    const businessId = typeof meta.commercial_profile_id === 'string' ? meta.commercial_profile_id : null;

    if (conversationId) {
      router.push(`/app?openChat=${encodeURIComponent(conversationId)}`);
      return;
    }
    if (requestId && businessId) {
      router.push(`/app/beeservices/manage/${encodeURIComponent(businessId)}/requests/${encodeURIComponent(requestId)}`);
      return;
    }
    if (requestId) {
      router.push(`/app/beeservices/request/${encodeURIComponent(requestId)}`);
      return;
    }
    if (item.module === 'beeservices') {
      router.push('/app/beeservices');
      return;
    }
    if (item.module) {
      router.push('/app');
    }
  };

  const markAll = async () => {
    setError('');
    try {
      await markAllCurrentWebNotificationsAsRead();
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible marcar todas como leídas.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center">
            <Link href="/app" className="shrink-0 rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="ml-2 truncate text-base font-semibold text-neutral-900">Centro de Notificaciones</h1>
            {unreadCount > 0 ? (
              <span className="ml-2 shrink-0 rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                {unreadCount} sin leer
              </span>
            ) : null}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Actualizar notificaciones"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAll()}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-primary/10 px-2.5 py-2 text-[11px] font-semibold text-brand-primary hover:bg-brand-primary/15"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {([
            { id: 'all', label: `Todas (${items.length})` },
            { id: 'unread', label: `No leídas (${unreadCount})` },
            { id: 'read', label: `Leídas (${items.length - unreadCount})` },
          ] as Array<{ id: NotificationFilter; label: string }>).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.id
                  ? 'bg-brand-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 pb-24">
        {error ? (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="font-bold underline">
              Reintentar
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center gap-2 py-8 text-xs text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="py-8 text-center text-xs text-neutral-500">
            {filter === 'unread'
              ? 'No tienes notificaciones sin leer.'
              : filter === 'read'
                ? 'No tienes notificaciones leídas.'
                : 'No tienes notificaciones.'}
          </p>
        ) : (
          Array.from(grouped.entries()).map(([group, rows]) => (
            <div key={group} className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{group}</p>
              <div className="divide-y divide-neutral-100 border-b border-t border-neutral-100">
                {rows.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleNotificationClick(item)}
                    className={`flex w-full items-start gap-3 px-2 py-3.5 text-left transition hover:bg-neutral-50 ${
                      item.unread ? 'bg-brand-primary/5' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-neutral-900">{item.title}</span>
                        <span className="shrink-0 text-[10px] font-normal text-neutral-400">{item.time}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] font-normal text-neutral-500">{item.body}</p>
                      {item.module ? (
                        <span className="mt-1 inline-block text-[10px] font-semibold uppercase text-brand-primary">
                          {item.module}
                        </span>
                      ) : null}
                    </div>
                    {item.unread ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-primary" />
                    ) : null}
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
