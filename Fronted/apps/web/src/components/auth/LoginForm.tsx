'use client';

import { type FormEvent, type KeyboardEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import Link from 'next/link';
import {
  activateWebSession,
  adoptSupabaseSession,
  createQrLoginChallenge,
  getQrLoginChallengeStatus,
  loginUser,
  requestPhoneOtp,
  verifyPhoneOtpMobile,
} from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  homePathForRole,
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
  const { status, profile, refreshProfile } = useAuth();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [browserNonce, setBrowserNonce] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'ready' && profile) {
      router.replace(homePathForRole(profile.role));
    }
  }, [profile, router, status]);

  useEffect(() => {
    if (mode !== 'qr' || !qrToken || !browserNonce) return undefined;
    let cancelled = false;
    const interval = window.setInterval(() => {
      void getQrLoginChallengeStatus(qrToken).then(async (statusResponse) => {
        if (cancelled) return;
        if (statusResponse.status === 'APPROVED' || statusResponse.status === 'CONSUMED') {
          await activateWebSession({
            challenge_token: qrToken,
            browser_nonce: browserNonce,
          });
          const nextProfile = await refreshProfile();
          router.replace(homePathForRole(nextProfile?.role ?? normalizeRole('USER')));
        }
      }).catch(() => undefined);
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [browserNonce, mode, qrToken, refreshProfile, router]);

  useEffect(() => {
    if (mode !== 'qr') return;
    const nonce = crypto.randomUUID();
    void createQrLoginChallenge({ browser_nonce: nonce })
      .then((challenge) => {
        setBrowserNonce(nonce);
        setQrToken(challenge.challenge_token);
      })
      .catch(() => setError('No fue posible generar el QR.'));
  }, [mode]);

  const handlePasswordKey = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState?.('CapsLock') ?? false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

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
          <p className="text-xs text-neutral-600">Escanea con la app móvil de Buddy para iniciar sesión en web.</p>
          {qrToken ? (
            <p className="text-[10px] break-all text-neutral-500 bg-neutral-50 p-2 rounded-lg">{qrToken}</p>
          ) : null}
          {error ? <p className="text-xs text-semantic-error">{error}</p> : null}
        </div>
      ) : null}
    </AuthPageShell>
  );
}
