'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { requestPasswordReset } from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await requestPasswordReset({ phone: phone.trim() });
      router.push(`/verify-code?phone=${encodeURIComponent(phone.trim())}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible enviar el código.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell mode="login" title="Recuperar contraseña" subtitle="Verificamos tu identidad con el celular registrado.">
      <form onSubmit={(e) => void handleRequest(e)} className="space-y-3">
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+57 300 123 4567"
          className="w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm"
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-full h-10 rounded-full bg-brand-primary text-white text-sm font-semibold disabled:opacity-50">
          {busy ? 'Enviando…' : 'Enviar código SMS'}
        </button>
      </form>

      <p className="text-center text-xs text-neutral-500 pt-4">
        <Link href="/login" className="text-brand-primary font-semibold">Volver al login</Link>
      </p>
    </AuthPageShell>
  );
}
