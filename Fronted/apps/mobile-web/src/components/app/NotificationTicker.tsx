'use client';

import type { ElementType } from 'react';
import { useEffect, useState } from 'react';
import { Mail, FileText, FolderOpen, Calendar, MessageCircle, Phone } from 'lucide-react';
import { TickerNotification } from '@/mocks/tabNotifications';

const TYPE_ICONS: Record<TickerNotification['type'], ElementType> = {
  mail: Mail,
  notes: FileText,
  storage: FolderOpen,
  calendar: Calendar,
  chat: MessageCircle,
  call: Phone,
};

const TYPE_LABELS: Record<TickerNotification['type'], string> = {
  mail: 'Correo',
  notes: 'Nota',
  storage: 'Archivo',
  calendar: 'Agenda',
  chat: 'Chat',
  call: 'Llamada',
};

interface NotificationTickerProps {
  notifications: TickerNotification[];
  /** Milisegundos entre rotaciones */
  intervalMs?: number;
  /** Alinea el contenido a la derecha (lado derecho de la barra) */
  align?: 'left' | 'right';
  onPress: () => void;
}

/**
 * Notificación que rota automáticamente. El ícono cambia según el tipo de la
 * notificación visible y el badge cuenta las no leídas.
 */
export default function NotificationTicker({
  notifications,
  intervalMs = 4000,
  align = 'left',
  onPress,
}: NotificationTickerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % notifications.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [notifications.length, intervalMs]);

  const current = notifications[index];
  const Icon = TYPE_ICONS[current.type];
  const unread = notifications.filter((n) => !n.read).length;

  const badge = unread > 0 && (
    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-primary text-white text-[9px] font-normal flex items-center justify-center">
      {unread}
    </span>
  );

  const iconBlock = (
    <div className="relative shrink-0 text-brand-primary p-2 rounded-xl bg-brand-primary/10">
      <Icon className="w-4 h-4" />
      {badge}
    </div>
  );

  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex-1 min-w-0 flex items-center gap-2.5 p-2 rounded-2xl hover:bg-neutral-100/60 transition-colors ${
        align === 'right' ? 'flex-row-reverse text-right' : 'text-left'
      }`}
    >
      {iconBlock}

      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-semibold text-neutral-900 truncate">
          {TYPE_LABELS[current.type]}
        </span>
        <span className="text-[10px] text-neutral-500 font-normal truncate">{current.message}</span>
      </div>
    </button>
  );
}
