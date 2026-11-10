'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase } from '@beeapp/api-client';
import {
  ensureWebDeviceSession,
  fetchAuthProfile,
  forgetAuthProfile,
  readCachedAuthProfile,
  rememberAuthProfile,
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
  const voluntarySignOut = useRef(false);

  const publishProfile = useCallback((nextProfile: AuthProfile) => {
    rememberAuthProfile(nextProfile);
    setProfile(nextProfile);
    setStatus('ready');
  }, []);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;

    if (!userId) {
      if (voluntarySignOut.current) {
        setProfile(null);
        setStatus('anonymous');
      }
      return null;
    }

    try {
      await ensureWebDeviceSession();
    } catch {
      // Un fallo al registrar el navegador no cierra la sesión.
    }

    const nextProfile = await fetchAuthProfile(userId);
    if (nextProfile) {
      publishProfile(nextProfile);
      return nextProfile;
    }

    const remembered = readCachedAuthProfile();
    if (remembered?.id === userId) {
      setProfile(remembered);
      setStatus('ready');
      return remembered;
    }

    return null;
  }, [publishProfile]);

  const signOut = useCallback(async () => {
    voluntarySignOut.current = true;
    await signOutWeb();
    forgetAuthProfile();
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

    const applySession = async (userId: string | undefined, event: string) => {
      if (!active) {
        return;
      }

      if (!userId && event === 'SIGNED_OUT' && !voluntarySignOut.current) {
        const existing = await supabase.auth.getSession();
        userId = existing.data.session?.user.id;
        if (!userId) {
          const refreshed = await supabase.auth.refreshSession();
          userId = refreshed.data.session?.user.id;
        }
      }

      if (!userId) {
        if (event === 'INITIAL_SESSION') {
          return;
        }
        if (voluntarySignOut.current || event === 'boot' || event === 'SIGNED_OUT') {
          setProfile(null);
          setStatus('anonymous');
        }
        return;
      }

      try {
        await ensureWebDeviceSession();
      } catch {
        // La sesión de Supabase sigue vigente aunque el dispositivo no se registre.
      }

      const nextProfile = await fetchAuthProfile(userId);
      if (!active) {
        return;
      }

      if (nextProfile) {
        publishProfile(nextProfile);
        return;
      }

      const remembered = readCachedAuthProfile();
      if (remembered?.id === userId) {
        setProfile(remembered);
        setStatus('ready');
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (userId) {
        const remembered = readCachedAuthProfile();
        if (remembered?.id === userId) {
          setProfile(remembered);
          setStatus('ready');
        }
      }
      void applySession(userId, 'boot');
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        window.setTimeout(() => {
          void applySession(session?.user.id, event);
        }, 0);
      },
    );

    const keepAlive = () => {
      if (document.visibilityState === 'visible') {
        void supabase.auth.startAutoRefresh();
      }
    };
    document.addEventListener('visibilitychange', keepAlive);

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', keepAlive);
    };
  }, [publishProfile]);

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
