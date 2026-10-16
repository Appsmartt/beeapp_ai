'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordReset,
} from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';

type Step = 'request' | 'verify' | 'confirm' | 'done';

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('request');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await requestPasswordReset({ phone: phone.trim() });
      setMessage('Te enviamos un código SMS a tu celular.');
      setStep('verify');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible enviar el código.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await verifyPasswordReset({ phone: phone.trim(), code: code.trim() });
      setResetToken(response.reset_token);
      setStep('confirm');
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Código inválido.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await confirmPasswordReset({
        reset_token: resetToken,
        new_password: password,
        confirm_password: confirmPassword,
      });
      setStep('done');
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'No fue posible restablecer la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell mode="login" title="Recuperar contraseña" subtitle="Verificamos tu identidad con el celular registrado.">
      {step === 'request' ? (
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
      ) : null}

      {step === 'verify' ? (
        <form onSubmit={(e) => void handleVerify(e)} className="space-y-3">
          {message ? <p className="text-xs text-neutral-600">{message}</p> : null}
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código recibido"
            className="w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm tracking-widest"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button type="submit" disabled={busy} className="w-full h-10 rounded-full bg-brand-primary text-white text-sm font-semibold disabled:opacity-50">
            Verificar código
          </button>
        </form>
      ) : null}

      {step === 'confirm' ? (
        <form onSubmit={(e) => void handleConfirm(e)} className="space-y-3">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contraseña"
            className="w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm"
          />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar contraseña"
            className="w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button type="submit" disabled={busy} className="w-full h-10 rounded-full bg-brand-primary text-white text-sm font-semibold disabled:opacity-50">
            Restablecer contraseña
          </button>
        </form>
      ) : null}

      {step === 'done' ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-neutral-700">Contraseña actualizada. Ya puedes iniciar sesión.</p>
          <Link href="/login" className="inline-flex h-10 items-center px-5 rounded-full bg-brand-primary text-white text-sm font-semibold">
            Ir a iniciar sesión
          </Link>
        </div>
      ) : null}

      <p className="text-center text-xs text-neutral-500 pt-4">
        <Link href="/login" className="text-brand-primary font-semibold">Volver al login</Link>
      </p>
    </AuthPageShell>
  );
}
