'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic } from 'lucide-react';
import { LEFT_TAB_NOTIFICATIONS, RIGHT_TAB_NOTIFICATIONS } from '@/mocks/tabNotifications';
import NotificationTicker from './NotificationTicker';
import VoiceAssistantModal from './VoiceAssistantModal';

/**
 * Barra flotante inferior de la app web, visible en todos los módulos:
 * ticker de notificaciones a la izquierda, botón del asistente por voz en el
 * centro y ticker de chats a la derecha.
 *
 * En desktop se detiene antes del sidebar derecho (`lg:right-14`) para no
 * quedar por debajo de él.
 */
export default function AppBottomBar() {
  const router = useRouter();
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 lg:right-14 z-40 pointer-events-none">
        <div className="mx-auto w-full max-w-full sm:max-w-3xl lg:max-w-5xl px-4 pointer-events-auto">
          <div className="h-14 rounded-t-3xl bg-white border border-b-0 border-neutral-200/80 shadow-lg px-4 flex items-center justify-between gap-2">
            <NotificationTicker
              notifications={LEFT_TAB_NOTIFICATIONS}
              onPress={() => router.push('/app/notifications')}
            />

            {/* Asistente por voz: sobresale por encima de la barra, con halo pulsante */}
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

            <NotificationTicker
              notifications={RIGHT_TAB_NOTIFICATIONS}
              intervalMs={4500}
              align="right"
              onPress={() => router.push('/app/notifications')}
            />
          </div>
        </div>
      </div>

      <VoiceAssistantModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </>
  );
}
