'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { requestPasswordReset, verifyPasswordReset } from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';

function VerifyCodeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const digitsOnly = code.replace(/\D/g, '');
    if (digitsOnly.length !== 6) {
      setError('Ingresa el código de 6 dígitos que enviamos por SMS.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await verifyPasswordReset({ phone: phone.trim(), code: digitsOnly });
      router.push(`/reset-password?token=${encodeURIComponent(response.reset_token)}`);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Código inválido.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!phone.trim() || busy || resendCooldown > 0) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await requestPasswordReset({ phone: phone.trim() });
      setNotice('Enviamos un nuevo código SMS a tu celular.');
      setResendCooldown(60);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'No fue posible reenviar el código.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell mode="login" title="Verificar código" subtitle="Ingresa el SMS de 6 dígitos que enviamos a tu celular.">
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          placeholder="+573001234567"
          className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm"
        />
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          required
          placeholder="Código de 6 dígitos"
          className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-center text-sm tracking-widest"
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        {notice ? <p className="text-xs text-emerald-700">{notice}</p> : null}
        <button type="submit" disabled={busy || code.replace(/\D/g, '').length !== 6} className="h-10 w-full rounded-full bg-brand-primary text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Verificando…' : 'Continuar'}
        </button>
      </form>
      <div className="flex items-center justify-between pt-4 text-xs">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={busy || resendCooldown > 0 || !phone.trim()}
          className="font-semibold text-brand-primary disabled:text-neutral-400"
        >
          {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código'}
        </button>
        <Link href="/forgot-password" className="font-semibold text-neutral-600 hover:text-brand-primary">
          Cambiar número
        </Link>
      </div>
    </AuthPageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VerifyCodeForm />
    </Suspense>
  );
}
