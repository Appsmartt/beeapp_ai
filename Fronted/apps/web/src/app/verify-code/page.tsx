'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyPasswordReset } from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';

function VerifyCodeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await verifyPasswordReset({ phone: phone.trim(), code: code.trim() });
      router.push(`/reset-password?token=${encodeURIComponent(response.reset_token)}`);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Código inválido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell mode="login" title="Verificar código" subtitle="Ingresa el SMS que enviamos a tu celular.">
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <input value={phone} onChange={(event) => setPhone(event.target.value)} required placeholder="Celular" className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
        <input value={code} onChange={(event) => setCode(event.target.value)} required placeholder="Código" className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm tracking-widest" />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <button type="submit" disabled={busy} className="h-10 w-full rounded-full bg-brand-primary text-sm font-semibold text-white disabled:opacity-50">Continuar</button>
      </form>
      <p className="pt-4 text-center text-xs">
        <Link href="/forgot-password" className="font-semibold text-brand-primary">Pedir otro código</Link>
      </p>
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
