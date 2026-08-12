'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@beeapp/api-client';
import MobileBlockScreen from '@/components/app/MobileBlockScreen';
import VoiceAssistantFab from '@/components/app/VoiceAssistantFab';

type WebSessionProfileResponse = {
  user: {
    id: string;
    first_name: string;
    last_name: string;
  };
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [isMobileScreen, setIsMobileScreen] = useState(false);

  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };

    const validateWebSession = async () => {
      try {
        await api.get<WebSessionProfileResponse>(
          '/accounts/web-session/me/',
          {
            credentials: 'include',
          },
        );

        setIsAuthorized(true);
      } catch {
        router.replace('/login');
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);

    void validateWebSession();

    const validationInterval = window.setInterval(
      () => {
        void validateWebSession();
      },
      30000,
    );

    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.clearInterval(validationInterval);
    };
  }, [router]);

  if (isCheckingSession || !isAuthorized) {
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
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full">
        <div className="w-full mx-auto bg-white flex-1 flex flex-col relative">
          {children}
        </div>
      </div>

      <VoiceAssistantFab />
    </div>
  );
}