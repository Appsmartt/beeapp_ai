'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { requestPasswordReset } from '@beeapp/api-client';
import AuthPageShell from '@/components/auth/AuthPageShell';
import CountrySelector, { type Country } from '@/components/auth/CountrySelector';
import { loadRegistrationCountries } from '@/lib/client/publicAppSettings';

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadRegistrationCountries().then((list) => {
      setCountries(list);
      const co = list.find((c) => c.code === 'CO') ?? list[0] ?? null;
      setCountry((prev) => prev ?? co);
    });
  }, []);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const rawTrimmed = phone.trim();
    const digitsOnly = rawTrimmed.replace(/\D/g, '');
    const selectedDial = (country?.dialCode ?? '+57').replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      setError('Ingresa un número de celular válido.');
      return;
    }
    const normalizedPhone = rawTrimmed.startsWith('+')
      ? `+${digitsOnly}`
      : `+${selectedDial}${digitsOnly}`;

    setBusy(true);
    setError('');
    try {
      await requestPasswordReset({ phone: normalizedPhone });
      router.push(`/verify-code?phone=${encodeURIComponent(normalizedPhone)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible enviar el código.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell mode="login" title="Recuperar contraseña" subtitle="Verificamos tu identidad con el celular registrado.">
      <form onSubmit={(e) => void handleRequest(e)} className="space-y-3">
        <div className="flex h-10 items-center rounded-lg border border-neutral-300 bg-white focus-within:border-brand-primary">
          <CountrySelector
            countries={countries}
            selectedCountry={country}
            onSelectCountry={setCountry}
            variant="inline"
            disabled={busy}
          />
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="300 123 4567"
            className="h-full min-w-0 flex-1 rounded-r-lg border-l border-neutral-200 px-3 text-sm outline-none"
          />
        </div>
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
