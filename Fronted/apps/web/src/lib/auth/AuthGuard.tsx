'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { homePathForRole, isAdminRole } from './session';

type AuthArea = 'client' | 'admin';

function AuthSpinner() {
  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function AuthGuard({
  area,
  children,
}: {
  area: AuthArea;
  children: ReactNode;
}) {
  const router = useRouter();
  const { status, profile } = useAuth();
  const isAdmin = isAdminRole(profile?.role);
  const allowed = area === 'admin' ? isAdmin : !isAdmin;

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login');
      return;
    }

    if (status !== 'ready' || !profile) {
      return;
    }

    if (!allowed) {
      router.replace(homePathForRole(profile.role));
    }
  }, [allowed, profile, router, status]);

  if (status !== 'ready' || !profile || !allowed) {
    return <AuthSpinner />;
  }

  return (
    <div className="motion-fade-in flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
