'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/lib/auth/AuthGuard';
import MobileBlockScreen from '@/components/client/MobileBlockScreen';
import VoiceAssistantFab from '@/components/client/VoiceAssistantFab';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return (
    <AuthGuard area="client">
      {isMobileScreen ? (
        <MobileBlockScreen />
      ) : (
        <div className="min-h-screen bg-neutral-100/90 flex flex-col selection:bg-brand-primary/20 overflow-x-hidden">
          <div className="relative flex h-screen min-h-0 w-full flex-1 flex-col overflow-hidden">
            <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white">
              {children}
            </div>
          </div>

          <VoiceAssistantFab />
        </div>
      )}
    </AuthGuard>
  );
}
