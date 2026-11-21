'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Bot,
  Calendar,
  Check,
  Loader2,
  LogOut,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  getCurrentProfile,
  updateAssistantSettings,
  updateOnboardingProfile,
} from '@beeapp/api-client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getWebAuth } from '@/lib/client/webAuth';

type OnboardingStep = 'profile' | 'assistant' | 'benefits';
type ToneId = 'friendly' | 'professional' | 'direct';

const TONE_OPTIONS: Array<{
  id: ToneId;
  label: string;
  description: string;
  preview: (name: string) => string;
}> = [
  {
    id: 'friendly',
    label: 'Cercano',
    description: 'Cálido, conversacional y empático.',
    preview: (name) => `¡Hola! Soy ${name || 'Buddy'}, tu asistente personal. Cuéntame qué necesitas organizar hoy y lo resolvemos juntos.`,
  },
  {
    id: 'professional',
    label: 'Profesional',
    description: 'Formal, estructurado y ejecutivo.',
    preview: (name) => `Buen día. Soy ${name || 'Buddy'}. Estoy listo para gestionar su agenda, correos, archivos y solicitudes comerciales.`,
  },
  {
    id: 'direct',
    label: 'Directo',
    description: 'Breve, concreto y enfocado en acción.',
    preview: (name) => `${name || 'Buddy'} activo. Dime la tarea y la ejecuto al instante.`,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('profile');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [assistantName, setAssistantName] = useState('Buddy');
  const [assistantTone, setAssistantTone] = useState<ToneId>('friendly');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const preloadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setLoadError('');
    try {
      const auth = await getWebAuth();
      const { profile } = await getCurrentProfile(auth);
      const nextOccupation = profile.occupation?.trim() || '';
      const nextLocation = profile.location?.trim() || '';
      const nextName = profile.assistant_name?.trim() || 'Buddy';
      const rawTone = (profile.assistant_tone?.trim() || 'friendly') as ToneId;
      const nextTone: ToneId = ['friendly', 'professional', 'direct'].includes(rawTone)
        ? rawTone
        : 'friendly';

      setOccupation(nextOccupation);
      setLocation(nextLocation);
      setAssistantName(nextName);
      setAssistantTone(nextTone);

      const profileDone = Boolean(nextOccupation && nextLocation);
      const assistantDone = Boolean(profile.assistant_name?.trim() && profile.assistant_tone?.trim());

      if (profileDone && assistantDone) {
        router.replace('/app');
        return;
      }
      if (profileDone) {
        setStep('assistant');
      } else {
        setStep('profile');
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No pudimos cargar tu perfil.');
    } finally {
      setLoadingProfile(false);
    }
  }, [router]);

  useEffect(() => {
    void preloadProfile();
  }, [preloadProfile]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!occupation.trim() || !location.trim()) {
      setError('Completa tu ocupación y ciudad para continuar.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      await updateOnboardingProfile(auth, {
        occupation: occupation.trim(),
        location: location.trim(),
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
    if (!assistantName.trim()) {
      setError('Elige un nombre para tu asistente.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const auth = await getWebAuth();
      await updateAssistantSettings(auth, {
        assistant_name: assistantName.trim(),
        assistant_tone: assistantTone,
      });
      setStep('benefits');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar el asistente.');
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = () => {
    router.replace('/app');
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  if (loadingProfile) {
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-3 px-6 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <p className="text-sm">Preparando tu cuenta…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-rose-600">{loadError}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void preloadProfile()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-primary px-5 text-xs font-semibold text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-300 px-5 text-xs font-semibold text-neutral-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const activeTone = TONE_OPTIONS.find((item) => item.id === assistantTone) ?? TONE_OPTIONS[0];
  const stepIndex = step === 'profile' ? 1 : step === 'assistant' ? 2 : 3;

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        {step !== 'profile' ? (
          <button
            type="button"
            onClick={() => {
              setError('');
              setStep(step === 'benefits' ? 'assistant' : 'profile');
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </button>
        ) : <span />}
        <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
          Paso {stepIndex} de 3
        </span>
      </div>

      {step === 'profile' ? (
        <>
          <h1 className="text-2xl font-semibold text-neutral-900">Bienvenida a Buddy</h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Cuéntanos a qué te dedicas y en qué ciudad estás para personalizar tus servicios y sugerencias.
          </p>
          <form onSubmit={(event) => void saveProfile(event)} className="mt-6 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">Ocupación o actividad</label>
              <input
                name="occupation"
                required
                value={occupation}
                onChange={(event) => setOccupation(event.target.value)}
                placeholder="Ej. Diseñadora, Abogado, Comerciante…"
                className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">Ciudad</label>
              <input
                name="location"
                required
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Ej. Bogotá, Medellín, Montería…"
                className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-brand-primary"
              />
            </div>
            <button type="submit" disabled={busy} className="mt-2 h-11 w-full rounded-full bg-brand-primary text-sm font-semibold text-white disabled:opacity-50">
              {busy ? 'Guardando…' : 'Continuar'}
            </button>
          </form>
        </>
      ) : null}

      {step === 'assistant' ? (
        <>
          <h1 className="text-2xl font-semibold text-neutral-900">Personaliza tu asistente IA</h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Elige cómo quieres llamarlo y el estilo con el que te responderá por texto y voz.
          </p>
          <form onSubmit={(event) => void saveAssistant(event)} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">Nombre del asistente</label>
              <input
                name="assistant_name"
                required
                value={assistantName}
                onChange={(event) => setAssistantName(event.target.value)}
                placeholder="Buddy"
                className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-brand-primary"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-neutral-700">Tono de conversación</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {TONE_OPTIONS.map((option) => {
                  const selected = assistantTone === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAssistantTone(option.id)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        selected
                          ? 'border-brand-primary bg-brand-primary/5 shadow-xs'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">{option.label}</span>
                        {selected ? <Check className="h-3.5 w-3.5 text-brand-primary" /> : null}
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-neutral-500">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-primary">
                <Bot className="h-4 w-4" />
                <span>Vista previa · {assistantName || 'Buddy'} ({activeTone.label})</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-700">
                “{activeTone.preview(assistantName.trim())}”
              </p>
            </div>

            <button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-brand-primary text-sm font-semibold text-white disabled:opacity-50">
              {busy ? 'Guardando…' : 'Continuar'}
            </button>
          </form>
        </>
      ) : null}

      {step === 'benefits' ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Todo conectado en un solo lugar</h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              {assistantName || 'Buddy'} ya está configurado. Esto es lo que puedes hacer ahora mismo:
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
              <div>
                <p className="text-xs font-bold text-neutral-900">Chats, llamadas, estados y comunidades</p>
                <p className="text-xs text-neutral-500">Comunícate en tiempo real y protege tus conversaciones con PIN.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
              <div>
                <p className="text-xs font-bold text-neutral-900">Correo, agenda, notas y archivos</p>
                <p className="text-xs text-neutral-500">Sincroniza Google o Microsoft y pídele a tu asistente redactar o agendar.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
              <div>
                <p className="text-xs font-bold text-neutral-900">Buddy Services y Voz IA</p>
                <p className="text-xs text-neutral-500">Encuentra proveedores con IA o publica y administra tu propio negocio.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5">
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
              <div>
                <p className="text-xs font-bold text-neutral-900">Permisos bajo tu control</p>
                <p className="text-xs text-neutral-500">El navegador solo te pedirá micrófono o ubicación cuando uses voz o llamadas.</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-primary text-sm font-semibold text-white"
          >
            <ShieldCheck className="h-4 w-4" />
            Entrar a Buddy
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
