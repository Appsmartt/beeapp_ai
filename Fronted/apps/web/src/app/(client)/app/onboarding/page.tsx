'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateAssistantSettings, updateOnboardingProfile } from '@beeapp/api-client';
import { getWebAuth } from '@/lib/client/webAuth';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'profile' | 'assistant'>('profile');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      await updateOnboardingProfile(auth, {
        occupation: String(form.get('occupation') || '').trim(),
        location: String(form.get('location') || '').trim(),
      });
      setStep('assistant');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar tu perfil.');
    } finally {
      setBusy(false);
    }
  };

  const saveAssistant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      await updateAssistantSettings(auth, {
        assistant_name: String(form.get('assistant_name') || 'Buddy').trim(),
        assistant_tone: String(form.get('assistant_tone') || 'friendly'),
      });
      router.replace('/app');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar el asistente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Bienvenida a Buddy</h1>
      <p className="mt-2 text-sm text-neutral-500">Completa estos datos para entrar, igual que en la app móvil.</p>
      {step === 'profile' ? (
        <form onSubmit={(event) => void saveProfile(event)} className="mt-6 space-y-3">
          <input name="occupation" required placeholder="A qué te dedicas" className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm" />
          <input name="location" required placeholder="Ciudad" className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm" />
          <button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-brand-primary text-sm font-semibold text-white disabled:opacity-50">Continuar</button>
        </form>
      ) : (
        <form onSubmit={(event) => void saveAssistant(event)} className="mt-6 space-y-3">
          <input name="assistant_name" required defaultValue="Buddy" placeholder="Nombre del asistente" className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm" />
          <select name="assistant_tone" className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm">
            <option value="friendly">Cercano</option>
            <option value="professional">Profesional</option>
            <option value="direct">Directo</option>
          </select>
          <button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-brand-primary text-sm font-semibold text-white disabled:opacity-50">Entrar</button>
        </form>
      )}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
