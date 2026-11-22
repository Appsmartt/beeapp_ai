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
  profileFromSupabaseUser,
  readCachedAuthProfile,
  readStoredSupabaseSession,
  rememberAuthProfile,
  signOutWeb,
  type AuthProfile,
} from './session';

type AuthStatus = 'loading' | 'anonymous' | 'ready';

type AuthContextValue = {
  status: AuthStatus;
  profile: AuthProfile | null;
  sessionConfirmed: boolean;
  refreshProfile: () => Promise<AuthProfile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function hasPendingOAuthReturn(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    hash.includes('access_token=')
    || search.includes('code=')
    || search.includes('adminSso=1')
  );
}

export function AuthProvider({
  children,
  initialProfile = null,
}: {
  children: ReactNode;
  initialProfile?: AuthProfile | null;
}) {
  const [status, setStatus] = useState<AuthStatus>(
    initialProfile ? 'ready' : 'loading',
  );
  const [profile, setProfile] = useState<AuthProfile | null>(
    initialProfile ?? null,
  );
  const [sessionConfirmed, setSessionConfirmed] = useState(false);
  const initialProfileRef = useRef<AuthProfile | null>(initialProfile ?? null);
  const voluntarySignOut = useRef(false);

  const publishProfile = useCallback((nextProfile: AuthProfile) => {
    voluntarySignOut.current = false;
    rememberAuthProfile(nextProfile);
    setProfile(nextProfile);
    setStatus('ready');
    setSessionConfirmed(true);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      const userId = sessionUser?.id;

      if (!userId) {
        if (voluntarySignOut.current) {
          forgetAuthProfile();
          setProfile(null);
          setSessionConfirmed(false);
          setStatus('anonymous');
        }
        return null;
      }

      void ensureWebDeviceSession().catch(() => undefined);

      const nextProfile = await fetchAuthProfile(userId);
      if (nextProfile) {
        publishProfile(nextProfile);
        return nextProfile;
      }

      const remembered = readCachedAuthProfile();
      if (remembered?.id === userId) {
        publishProfile(remembered);
        return remembered;
      }

      const fallback = profileFromSupabaseUser(sessionUser);
      if (fallback) {
        publishProfile(fallback);
        return fallback;
      }

      return null;
    } catch {
      return null;
    }
  }, [publishProfile]);

  const signOut = useCallback(async () => {
    voluntarySignOut.current = true;
    await signOutWeb();
    forgetAuthProfile();
    setProfile(null);
    setSessionConfirmed(false);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof getSupabase>;

    const clearToAnonymous = () => {
      if (!active) return;
      forgetAuthProfile();
      setProfile(null);
      setSessionConfirmed(false);
      setStatus('anonymous');
    };

    try {
      supabase = getSupabase();
    } catch {
      clearToAnonymous();
      return undefined;
    }

    // 1. Hidratación síncrona inmediata desde localStorage (< 1 ms):
    //    Confirma o limpia cualquier pista recibida por cookie en SSR y
    //    sincroniza la cookie buddy_web_hint para próximas cargas.
    const stored = readStoredSupabaseSession();
    const cachedProfile = readCachedAuthProfile();
    if (stored) {
      const serverHint = initialProfileRef.current;
      const hydratedProfile =
        cachedProfile?.id === stored.userId
          ? cachedProfile
          : serverHint?.id === stored.userId
            ? serverHint
            : stored.fallbackProfile;
      rememberAuthProfile(hydratedProfile);
      setProfile(hydratedProfile);
      setStatus('ready');
      setSessionConfirmed(true);
    } else if (!hasPendingOAuthReturn()) {
      clearToAnonymous();
    }

    // 2. Red de seguridad: nunca quedar atrapado en 'loading' si la red o Web Locks fallan.
    const safetyTimer = window.setTimeout(() => {
      if (!active) return;
      setStatus((current) => {
        if (current === 'loading') {
          forgetAuthProfile();
          setProfile(null);
          setSessionConfirmed(false);
          return 'anonymous';
        }
        return current;
      });
    }, 1500);

    const applySession = async (
      session: { user?: { id?: string; email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> | null } } | null | undefined,
      event: string,
    ) => {
      if (!active) {
        return;
      }

      try {
        let activeUser = session?.user;
        let userId = activeUser?.id;

        if (!userId && event === 'SIGNED_OUT' && !voluntarySignOut.current) {
          const existing = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
          activeUser = existing.data.session?.user;
          userId = activeUser?.id;
          if (!userId) {
            const refreshed = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));
            activeUser = refreshed.data.session?.user;
            userId = activeUser?.id;
          }
        }

        if (!active) {
          return;
        }

        if (!userId) {
          if (event === 'INITIAL_SESSION' && readStoredSupabaseSession()) {
            return;
          }
          clearToAnonymous();
          return;
        }

        const remembered = readCachedAuthProfile();
        if (remembered?.id === userId) {
          rememberAuthProfile(remembered);
          setProfile(remembered);
          setStatus('ready');
          setSessionConfirmed(true);
        } else {
          const immediateFallback = profileFromSupabaseUser(activeUser);
          if (immediateFallback) {
            rememberAuthProfile(immediateFallback);
            setProfile(immediateFallback);
            setStatus('ready');
            setSessionConfirmed(true);
          }
        }

        void ensureWebDeviceSession().catch(() => undefined);

        const nextProfile = await fetchAuthProfile(userId);
        if (!active) {
          return;
        }

        if (nextProfile) {
          publishProfile(nextProfile);
          return;
        }

        if (remembered?.id === userId) {
          publishProfile(remembered);
          return;
        }

        const fallback = profileFromSupabaseUser(activeUser);
        if (fallback) {
          publishProfile(fallback);
          return;
        }

        clearToAnonymous();
      } catch {
        if (active) {
          setStatus((current) => (current === 'loading' ? 'anonymous' : current));
        }
      }
    };

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error && !data.session) {
          clearToAnonymous();
          return;
        }
        void applySession(data.session, 'boot');
      })
      .catch(() => {
        clearToAnonymous();
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        window.setTimeout(() => {
          void applySession(session, event);
        }, 0);
      },
    );

    const syncFromStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (
        event.key === 'beeapp.web.authProfile'
        || (event.key.startsWith('sb-') && event.key.endsWith('-auth-token'))
      ) {
        void supabase.auth
          .getSession()
          .then(({ data }) => {
            void applySession(data.session, data.session ? 'storage' : 'SIGNED_OUT');
          })
          .catch(() => clearToAnonymous());
      }
    };
    window.addEventListener('storage', syncFromStorage);

    const keepAlive = () => {
      if (document.visibilityState === 'visible') {
        void supabase.auth.startAutoRefresh();
      }
    };
    document.addEventListener('visibilitychange', keepAlive);

    return () => {
      active = false;
      window.clearTimeout(safetyTimer);
      subscription.subscription.unsubscribe();
      window.removeEventListener('storage', syncFromStorage);
      document.removeEventListener('visibilitychange', keepAlive);
    };
  }, [publishProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    profile,
    sessionConfirmed,
    refreshProfile,
    signOut,
  }), [profile, refreshProfile, sessionConfirmed, signOut, status]);

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
