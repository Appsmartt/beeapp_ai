'use client';

import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import {
  activateWebSession,
  adoptSupabaseSession,
  createQrLoginChallenge,
  getQrLoginChallengeStatus,
  getSupabase,
  loginUser,
  requestPhoneOtp,
  verifyPhoneOtpMobile,
} from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  homePathForRole,
  isAdminRole,
  normalizeRole,
  rememberWebDeviceSession,
} from '@/lib/auth/session';

function loginErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (/invalid login credentials|correo o contraseña incorrectos/i.test(message)) {
    return 'Correo o contraseña incorrectos.';
  }

  if (/email not confirmed|confirma tu correo/i.test(message)) {
    return 'Confirma tu correo antes de iniciar sesión.';
  }

  if (/duplicate key|session_token_hash|dispositivo/i.test(message)) {
    return 'No fue posible registrar este dispositivo. Inténtalo de nuevo.';
  }

  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'No hay conexión. Revisa tu red e inténtalo de nuevo.';
  }

  if (/sesión no válida/i.test(message)) {
    return 'La sesión no es válida. Vuelve a iniciar sesión.';
  }

  return message || 'No fue posible iniciar sesión.';
}

const inputWrap =
  'flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-2.5 transition-colors focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15';

type LoginMode = 'email' | 'phone' | 'qr';

export default function LoginForm() {
  const router = useRouter();
  const { status, profile, refreshProfile, signOut } = useAuth();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const [qrOpening, setQrOpening] = useState(false);
  const qrOpeningRef = useRef(false);
  const [browserNonce, setBrowserNonce] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('adminSso') === '1') {
      window.sessionStorage.setItem('buddy.adminSso', '1');
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !profile) return;
    const adminSso = window.sessionStorage.getItem('buddy.adminSso') === '1';
    if (adminSso && !isAdminRole(profile.role)) {
      window.sessionStorage.removeItem('buddy.adminSso');
      void signOut().finally(() => setError('Esta cuenta no es de administrador.'));
      return;
    }
    if (adminSso) window.sessionStorage.removeItem('buddy.adminSso');
    router.replace(homePathForRole(profile.role));
  }, [profile, router, signOut, status]);

  const startGoogle = async () => {
    setError('');
    setIsSubmitting(true);
    window.sessionStorage.setItem('buddy.adminSso', '1');
    const { error: oauthError } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login?adminSso=1` },
    });
    if (oauthError) {
      window.sessionStorage.removeItem('buddy.adminSso');
      setError('Google no está activo en el acceso. Usa correo y contraseña.');
      setIsSubmitting(false);
    }
  };

  const startQrChallenge = useCallback(() => {
    const nonce = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    qrOpeningRef.current = false;
    setQrOpening(false);
    setBrowserNonce(nonce);
    setQrToken(null);
    setQrExpiresAt(null);
    void createQrLoginChallenge({ browser_nonce: nonce })
      .then((challenge) => {
        setBrowserNonce(challenge.browser_nonce || nonce);
        setQrToken(challenge.challenge_token);
        setQrExpiresAt(challenge.expires_at);
        setError('');
      })
      .catch((qrError: unknown) => {
        setError(qrError instanceof Error && qrError.message
          ? qrError.message
          : 'No fue posible generar el QR.');
      });
  }, []);

  useEffect(() => {
    if (mode !== 'qr' || !qrToken || !browserNonce) return undefined;
    let cancelled = false;

    const watchScan = async () => {
      if (cancelled || qrOpeningRef.current) return;
      try {
        const statusResponse = await getQrLoginChallengeStatus(qrToken);
        if (cancelled || qrOpeningRef.current) return;
        if (statusResponse.status === 'EXPIRED') {
          startQrChallenge();
          return;
        }
        if (statusResponse.status !== 'APPROVED' && statusResponse.status !== 'CONSUMED') {
          return;
        }
        qrOpeningRef.current = true;
        setQrOpening(true);
        setError('');
        await activateWebSession({
          challenge_token: qrToken,
          browser_nonce: browserNonce,
        });
        const nextProfile = await refreshProfile();
        if (!cancelled) {
          router.replace(homePathForRole(nextProfile?.role ?? normalizeRole('USER')));
        }
      } catch (openError) {
        qrOpeningRef.current = false;
        if (!cancelled) {
          setQrOpening(false);
          setError(openError instanceof Error ? openError.message : 'No fue posible abrir la sesión.');
        }
      }
    };

    void watchScan();
    const interval = window.setInterval(() => {
      void watchScan();
    }, 400);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [browserNonce, mode, qrToken, refreshProfile, router, startQrChallenge]);

  useEffect(() => {
    if (mode !== 'qr') return;
    startQrChallenge();
  }, [mode, startQrChallenge]);

  useEffect(() => {
    if (mode !== 'qr' || !qrExpiresAt) return undefined;
    const delay = new Date(qrExpiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => startQrChallenge(), Math.max(delay, 1000));
    return () => window.clearTimeout(timer);
  }, [mode, qrExpiresAt, startQrChallenge]);

  const handlePasswordKey = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState?.('CapsLock') ?? false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    window.sessionStorage.removeItem('buddy.adminSso');

    if (!email.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await loginUser({
        email: email.trim(),
        password,
        device_type: 'WEB',
        platform: 'web',
        device_name: 'Buddy Web',
        user_agent: window.navigator.userAgent,
      });

      await adoptSupabaseSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token,
      });
      rememberWebDeviceSession(response.device_session_id);
      const nextProfile = await refreshProfile();
      router.replace(homePathForRole(nextProfile?.role ?? normalizeRole(response.user.role)));
    } catch (submitError) {
      setError(loginErrorMessage(submitError));
      setIsSubmitting(false);
    }
  };

  const handlePhoneOtpRequest = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    window.sessionStorage.removeItem('buddy.adminSso');
    if (!phone.trim()) {
      setError('Ingresa tu número de celular.');
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPhoneOtp({ phone: phone.trim() });
      setOtpSent(true);
    } catch (requestError) {
      setError(loginErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneVerify = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await verifyPhoneOtpMobile({ phone: phone.trim(), code: otpCode.trim() });
      await adoptSupabaseSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token,
      });
      rememberWebDeviceSession(response.device_session_id);
      const nextProfile = await refreshProfile();
      router.replace(homePathForRole(nextProfile?.role ?? normalizeRole(response.user.role)));
    } catch (verifyError) {
      setError(loginErrorMessage(verifyError));
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      mode="login"
      title="Inicia sesión"
      subtitle="Correo, celular con OTP o código QR desde la app móvil."
    >
      <div className="flex gap-1 p-1 rounded-xl bg-neutral-100 text-xs mb-3">
        {(['email', 'phone', 'qr'] as LoginMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setMode(item); setError(''); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold ${mode === item ? 'bg-white text-brand-primary shadow-xs' : 'text-neutral-500'}`}
          >
            {item === 'email' ? 'Correo' : item === 'phone' ? 'OTP' : 'QR'}
          </button>
        ))}
      </div>

      {mode === 'email' ? (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-700" htmlFor="login-email">
            Correo electrónico
          </label>
          <div className={inputWrap}>
            <Mail className="w-4 h-4 shrink-0 text-neutral-400" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-neutral-700" htmlFor="login-password">
              Contraseña
            </label>
            {capsLockOn ? (
              <span className="text-[11px] text-amber-700">Mayús activado</span>
            ) : null}
          </div>
          <div className={`${inputWrap} relative`}>
            <LockKeyhole className="w-4 h-4 shrink-0 text-neutral-400" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyUp={handlePasswordKey}
              onKeyDown={handlePasswordKey}
              placeholder="Tu contraseña"
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <p className="text-xs text-semantic-error leading-snug" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[11px] font-semibold text-brand-primary">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 rounded-full bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-60"
        >
          {isSubmitting ? 'Ingresando...' : 'Continuar'}
        </button>
      </form>
      ) : null}

      {mode === 'phone' ? (
        <form onSubmit={(e) => void (otpSent ? handlePhoneVerify(e) : handlePhoneOtpRequest(e))} className="space-y-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+57 300 123 4567"
            className="w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm"
            disabled={otpSent}
          />
          {otpSent ? (
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código de 6 dígitos"
              className="w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm tracking-widest text-center"
            />
          ) : null}
          {error ? <p className="text-xs text-semantic-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting} className="w-full h-10 rounded-full bg-brand-primary text-white text-sm font-semibold disabled:opacity-60">
            {isSubmitting ? 'Procesando…' : otpSent ? 'Verificar e ingresar' : 'Enviar código OTP'}
          </button>
        </form>
      ) : null}

      {mode === 'qr' ? (
        <div className="space-y-3 text-center">
          <p className="text-xs text-neutral-600">
            {qrOpening
              ? 'Código leído. Abriendo tu sesión…'
              : 'En el teléfono abre Dispositivos y escanea este código. El acceso dura dos minutos.'}
          </p>
          <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-2xl border border-neutral-200 bg-white p-3">
            {qrToken ? (
              <QRCode
                value={`beeapp://web-login?token=${encodeURIComponent(qrToken)}`}
                size={188}
              />
            ) : (
              <span className="text-xs text-neutral-500">Generando código…</span>
            )}
          </div>
          {error ? <p className="text-xs text-semantic-error">{error}</p> : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void startGoogle()}
        disabled={isSubmitting}
        className="mt-3 w-full h-10 rounded-full border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 disabled:opacity-60"
      >
        Continuar con Google
      </button>
    </AuthPageShell>
  );
}
