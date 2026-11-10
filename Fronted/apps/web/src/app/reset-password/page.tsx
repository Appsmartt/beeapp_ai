'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { confirmPasswordReset } from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError('Falta el token de restablecimiento. Verifica el código primero.');
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
      setDone(true);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'No fue posible restablecer la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell mode="login" title="Nueva contraseña" subtitle="Elige una clave para volver a entrar.">
      {done ? (
        <Link href="/login" className="inline-flex h-10 items-center rounded-full bg-brand-primary px-5 text-sm font-semibold text-white">Ir a iniciar sesión</Link>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Nueva contraseña" className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required placeholder="Confirmar contraseña" className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button type="submit" disabled={busy} className="h-10 w-full rounded-full bg-brand-primary text-sm font-semibold text-white disabled:opacity-50">Guardar contraseña</button>
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
