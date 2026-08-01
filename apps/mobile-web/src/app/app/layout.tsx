'use client';

import { useEffect, useState } from 'react';
import MobileBlockScreen from '@/components/app/MobileBlockScreen';
import VoiceAssistantFab from '@/components/app/VoiceAssistantFab';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkScreen = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isMobileScreen) {
    return <MobileBlockScreen />;
  }

  return (
    <div className="min-h-screen bg-neutral-100/90 flex flex-col selection:bg-brand-primary/20 overflow-x-hidden">
      {/* Main Desktop Workspace Frame */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full">
        <div className="w-full mx-auto bg-white flex-1 flex flex-col relative">
          {children}
        </div>
      </div>

      {/* Botón flotante del Asistente de IA por Voz (Esquina Inferior Izquierda) */}
      <VoiceAssistantFab />
    </div>
  );
}
