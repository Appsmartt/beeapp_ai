'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic } from 'lucide-react';
import { LEFT_TAB_NOTIFICATIONS, RIGHT_TAB_NOTIFICATIONS, TickerNotification } from '@/mocks/tabNotifications';
import NotificationTicker from './NotificationTicker';
import VoiceAssistantModal from './VoiceAssistantModal';
import NotificationsPopover from './NotificationsPopover';

/**
 * Barra flotante inferior de la app web, visible en todos los módulos:
 * ticker de notificaciones a la izquierda, botón del asistente por voz en el
 * centro y ticker de chats a la derecha.
 *
 * Al tocar el lado izquierdo se despliega el popover de Notificaciones.
 * Al tocar el lado derecho se despliega el popover de Chats y llamadas.
 */
export default function AppBottomBar() {
  const router = useRouter();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [popover, setPopover] = useState<'left' | 'right' | null>(null);

  const [leftItems, setLeftItems] = useState<TickerNotification[]>(LEFT_TAB_NOTIFICATIONS);
  const [rightItems, setRightItems] = useState<TickerNotification[]>(RIGHT_TAB_NOTIFICATIONS);

  const handleSelectLeftItem = (item: TickerNotification) => {
    setLeftItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, read: true } : i))
    );
    setPopover(null);
  };

  const handleSelectRightItem = (item: TickerNotification) => {
    setRightItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, read: true } : i))
    );
    setPopover(null);
    router.push('/app');
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 lg:right-14 z-40 pointer-events-none">
        <div className="mx-auto w-full max-w-full sm:max-w-3xl lg:max-w-5xl px-4 pointer-events-auto relative">
          
          {/* Popover Notificaciones (Izquierda) */}
          <NotificationsPopover
            visible={popover === 'left'}
            align="left"
            title="Notificaciones"
            items={leftItems}
            onClose={() => setPopover(null)}
            onSelectItem={handleSelectLeftItem}
          />

          {/* Popover Chats y Llamadas (Derecha) */}
          <NotificationsPopover
            visible={popover === 'right'}
            align="right"
            title="Chats y llamadas"
            items={rightItems}
            onClose={() => setPopover(null)}
            onSelectItem={handleSelectRightItem}
          />

          <div className="h-14 rounded-t-3xl bg-white border border-b-0 border-neutral-200/80 shadow-lg px-4 flex items-center justify-between gap-2">
            {/* Lado izquierdo: Notificaciones Generales */}
            <div
              onClick={() => setPopover(popover === 'left' ? null : 'left')}
              className="flex-1 cursor-pointer min-w-0"
            >
              <NotificationTicker
                notifications={leftItems}
                onPress={() => setPopover(popover === 'left' ? null : 'left')}
              />
            </div>

            {/* Asistente por voz: sobresale por encima de la barra */}
            <div className="shrink-0 flex flex-col items-center -mt-9 px-2">
              <button
                type="button"
                onClick={() => setVoiceOpen(true)}
                aria-label="Asistente por voz"
                title="Asistente por voz"
                className="assistant-glow w-14 h-14 rounded-full bg-brand-primary text-white border-4 border-white flex items-center justify-center hover:bg-brand-dark transition-transform hover:scale-105 active:scale-95 focus:outline-none"
              >
                <Mic className="w-6 h-6" />
              </button>
              <span className="text-[10px] font-normal text-neutral-500 mt-0.5">Asistente</span>
            </div>

            {/* Lado derecho: Chats y Llamadas */}
            <div
              onClick={() => setPopover(popover === 'right' ? null : 'right')}
              className="flex-1 cursor-pointer min-w-0 flex justify-end"
            >
              <NotificationTicker
                notifications={rightItems}
                intervalMs={4500}
                align="right"
                onPress={() => setPopover(popover === 'right' ? null : 'right')}
              />
            </div>
          </div>
        </div>
      </div>

      <VoiceAssistantModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </>
  );
}
