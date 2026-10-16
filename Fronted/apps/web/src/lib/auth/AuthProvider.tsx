'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase } from '@beeapp/api-client';
import {
  ensureWebDeviceSession,
  fetchAuthProfile,
  signOutWeb,
  type AuthProfile,
} from './session';

type AuthStatus = 'loading' | 'anonymous' | 'ready';

type AuthContextValue = {
  status: AuthStatus;
  profile: AuthProfile | null;
  refreshProfile: () => Promise<AuthProfile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;

    if (!userId) {
      setProfile(null);
      setStatus('anonymous');
      return null;
    }

    await ensureWebDeviceSession();
    const nextProfile = await fetchAuthProfile(userId);
    setProfile(nextProfile);
    setStatus(nextProfile ? 'ready' : 'anonymous');
    return nextProfile;
  }, []);

  const signOut = useCallback(async () => {
    await signOutWeb();
    setProfile(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof getSupabase>;

    try {
      supabase = getSupabase();
    } catch {
      setStatus('anonymous');
      return undefined;
    }

    const applySession = async (userId: string | undefined) => {
      if (!active) {
        return;
      }

      if (!userId) {
        setProfile(null);
        setStatus('anonymous');
        return;
      }

      await ensureWebDeviceSession();
      const nextProfile = await fetchAuthProfile(userId);

      if (!active) {
        return;
      }

      setProfile(nextProfile);
      setStatus(nextProfile ? 'ready' : 'anonymous');
    };

    void supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session?.user.id);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applySession(session?.user.id);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    profile,
    refreshProfile,
    signOut,
  }), [profile, refreshProfile, signOut, status]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  return context;
}
