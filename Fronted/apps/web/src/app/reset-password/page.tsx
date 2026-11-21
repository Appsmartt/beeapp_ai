'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { confirmPasswordReset } from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { signOutWeb } from '@/lib/auth/session';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError('Falta el token de restablecimiento. Verifica el código primero.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await confirmPasswordReset({
        reset_token: token,
        new_password: password,
        confirm_password: confirmPassword,
      });
      await signOutWeb().catch(() => undefined);
      setDone(true);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'No fue posible restablecer la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell mode="login" title="Nueva contraseña" subtitle="Elige una clave de mínimo 8 caracteres para volver a entrar.">
      {done ? (
        <div className="space-y-3 text-center">
          <p className="text-xs text-emerald-700">Tu contraseña se actualizó y cerramos las sesiones previas por seguridad.</p>
          <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-brand-primary px-5 text-sm font-semibold text-white">Ir a iniciar sesión</Link>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              placeholder="Nueva contraseña (mín. 8 caracteres)"
              className="h-10 w-full rounded-lg border border-neutral-300 px-3 pr-9 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              placeholder="Confirmar contraseña"
              className="h-10 w-full rounded-lg border border-neutral-300 px-3 pr-9 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button type="submit" disabled={busy} className="h-10 w-full rounded-full bg-brand-primary text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      )}
    </AuthPageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
