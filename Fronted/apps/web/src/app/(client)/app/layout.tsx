'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentProfile } from '@beeapp/api-client';
import AuthGuard from '@/lib/auth/AuthGuard';
import MobileBlockScreen from '@/components/client/MobileBlockScreen';
import NavigationProgress from '@/components/client/NavigationProgress';
import { AppRouteSkeleton } from '@/components/client/RouteSkeleton';
import { VoiceFabVisibility } from '@/components/client/VoiceAssistantFab';
import { getWebAuth } from '@/lib/client/webAuth';

let sessionOnboarding: 'unknown' | 'complete' | 'incomplete' = 'unknown';

function OnboardingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(
    pathname === '/app/onboarding' || sessionOnboarding === 'complete',
  );

  useEffect(() => {
    if (pathname === '/app/onboarding') {
      sessionOnboarding = 'unknown';
      setReady(true);
      return undefined;
    }
    if (sessionOnboarding === 'complete') {
      setReady(true);
      return undefined;
    }
    if (sessionOnboarding === 'incomplete') {
      router.replace('/app/onboarding');
      return undefined;
    }

    let active = true;
    getWebAuth()
      .then((auth) => getCurrentProfile(auth))
      .then((response) => {
        if (!active) return;
        const profile = response.profile;
        const incomplete = !profile.occupation?.trim()
          || !profile.location?.trim()
          || !profile.assistant_name?.trim();
        sessionOnboarding = incomplete ? 'incomplete' : 'complete';
        if (incomplete) router.replace('/app/onboarding');
        else setReady(true);
      })
      .catch(() => {
        if (!active) return;
        sessionOnboarding = 'complete';
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [pathname, router]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {ready ? children : <AppRouteSkeleton />}
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [hideVoiceFab, setHideVoiceFab] = useState(false);
  const onHome = pathname === '/app';

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
        <VoiceFabVisibility hidden={!onHome || hideVoiceFab} onHiddenChange={setHideVoiceFab}>
          <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-neutral-100/90 selection:bg-brand-primary/20">
            <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
              <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white">
                <Suspense fallback={null}>
                  <NavigationProgress />
                </Suspense>
                <OnboardingGate>{children}</OnboardingGate>
              </div>
            </div>
          </div>
        </VoiceFabVisibility>
      )}
    </AuthGuard>
  );
}
