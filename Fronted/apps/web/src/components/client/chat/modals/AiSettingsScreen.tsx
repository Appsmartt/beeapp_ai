'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Check,
  Mic,
  Minus,
  Shield,
  Smile,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/client/beeservices/CommercialShell';
import {
  clearAssistantMemory,
  getAssistantSettings,
  saveAssistantSettings,
} from '@beeapp/api-client';
import type {
  AssistantLevel,
  AssistantPermissions,
  AssistantTone,
} from '@beeapp/shared-types';
import { getWebAuth } from '@/lib/client/liveData';

const TONES: { id: AssistantTone; label: string; desc: string; icon: typeof Smile }[] = [
  { id: 'formal', label: 'Formal', desc: 'Trato de usted, preciso.', icon: Briefcase },
  { id: 'cercano', label: 'Cercano', desc: 'Tutea, con calidez.', icon: Smile },
  { id: 'neutro', label: 'Neutro', desc: 'Claro y sin adornos.', icon: Minus },
];

const VOICES = [
  { id: 'alloy', label: 'Clara' },
  { id: 'nova', label: 'Brillante' },
  { id: 'shimmer', label: 'Suave' },
  { id: 'echo', label: 'Grave' },
  { id: 'onyx', label: 'Profunda' },
  { id: 'fable', label: 'Narrativa' },
];

const LEVELS: { id: AssistantLevel; label: string }[] = [
  { id: 'sugerir', label: 'Sugerir' },
  { id: 'confirmar', label: 'Confirmar' },
  { id: 'automatico', label: 'Automático' },
];

const LANGUAGES = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'Inglés' },
  { id: 'pt', label: 'Portugués' },
];

const PERMISSIONS: { id: keyof AssistantPermissions; label: string }[] = [
  { id: 'calendar', label: 'Agenda' },
  { id: 'notes', label: 'Notas' },
  { id: 'mail', label: 'Correo' },
  { id: 'marketplace', label: 'Buddy Services' },
  { id: 'send_messages', label: 'Enviar mensajes' },
];

const DEFAULT_PERMISSIONS: AssistantPermissions = {
  calendar: true,
  notes: true,
  mail: true,
  marketplace: true,
  send_messages: true,
};

function languageCode(value: string | undefined): string {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized.startsWith('en') || normalized === 'inglés' || normalized === 'ingles') return 'en';
  if (normalized.startsWith('pt') || normalized === 'portugués' || normalized === 'portugues') return 'pt';
  return 'es';
}

const sectionLabelClass = 'text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]';
const fieldLabelClass = 'mb-1.5 block text-[13px] font-extrabold text-[#4E3B68]';

function toneLabel(tone: AssistantTone): string {
  return TONES.find((item) => item.id === tone)?.label || tone;
}

interface AiSettingsScreenProps {
  onBack: () => void;
  hideHeader?: boolean;
}

export default function AiSettingsScreen({ onBack, hideHeader = false }: AiSettingsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('Buddy AI');
  const [tone, setTone] = useState<AssistantTone>('neutro');
  const [voice, setVoice] = useState('alloy');
  const [language, setLanguage] = useState('es');
  const [voiceActivation, setVoiceActivation] = useState(false);
  const [level, setLevel] = useState<AssistantLevel>('confirmar');
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [permissions, setPermissions] = useState<AssistantPermissions>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    let cancelled = false;
    void getWebAuth()
      .then((auth) => getAssistantSettings(auth))
      .then((response) => {
        if (cancelled) return;
        const settings = response.settings;
        setName(settings.name || 'Buddy AI');
        setTone(settings.tone || 'neutro');
        setVoice(settings.voice || 'alloy');
        setLanguage(languageCode(settings.language));
        setVoiceActivation(Boolean(settings.voice_activation));
        setLevel(settings.assistance_level || 'confirmar');
        setMemoryEnabled(settings.memory_enabled !== false);
        setPermissions({ ...DEFAULT_PERMISSIONS, ...settings.permissions });
      })
      .catch((error) => {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : 'No se pudo cargar la configuración.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = () => {
    void (async () => {
      setSaving(true);
      setNotice('');
      try {
        const auth = await getWebAuth();
        await saveAssistantSettings(auth, {
          name: name.trim() || 'Buddy AI',
          tone,
          voice,
          language,
          voice_activation: voiceActivation,
          assistance_level: level,
          memory_enabled: memoryEnabled,
          permissions,
        });
        onBack();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'No fue posible guardar.');
      } finally {
        setSaving(false);
      }
    })();
  };

  const clearMemory = () => {
    void (async () => {
      setNotice('');
      try {
        const auth = await getWebAuth();
        await clearAssistantMemory(auth);
        setNotice('Borré lo que el asistente recordaba de ti.');
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'No se pudo borrar la memoria.');
      }
    })();
  };

  const shellClass = hideHeader
    ? 'min-h-0 w-full'
    : 'flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F4FB]';

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
      active
        ? 'border-[#7427D5] bg-[#7427D5] text-white shadow-sm'
        : 'border-[#E7DDF2] bg-white text-[#5E506B] hover:border-[#C9A8E8]'
    }`;

  const toggleCardClass = (active: boolean) =>
    `flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
      active ? 'border-[#7427D5] bg-[#F6EAFE] shadow-sm' : 'border-[#E7DDF2] bg-white hover:border-[#C9A8E8]'
    }`;

  return (
    <div className={shellClass}>
      {!hideHeader ? (
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#E7DDF2] bg-[#F7F4FB]/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8D1F1] bg-white text-[#5E1ABF]"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-extrabold text-[#261743]">Configuración del Asistente</h1>
        </div>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border border-[#E7DDF2] bg-white px-6 py-12 text-center text-xs text-[#786593]">
          Cargando configuración…
        </p>
      ) : (
        <div
          className={`mx-auto w-full space-y-5 ${
            hideHeader ? '' : 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-28 sm:px-5'
          } max-w-5xl`}
        >
          <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-[#261743]">Buddy AI a tu medida</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#786593]">
                Los mensajes que envías se procesan con OpenAI para responder y ejecutar acciones en tu cuenta.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start">
            <aside className="space-y-4 lg:sticky lg:top-4">
              <article className="overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white p-5 text-center shadow-[0_10px_30px_rgba(116,39,213,0.08)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#7427D5] to-[#9B6DD7] text-white shadow-lg">
                  <Bot className="h-10 w-10" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-[#261743] [overflow-wrap:anywhere]">
                  {name.trim() || 'Tu asistente'}
                </h3>
                <p className="mt-1 text-xs text-[#8A72B2]">Tono: {toneLabel(tone)}</p>
                <div className="mt-4 space-y-1.5 text-left text-[11px] text-[#786593]">
                  <p>Voz: {VOICES.find((item) => item.id === voice)?.label || voice}</p>
                  <p>Idioma: {LANGUAGES.find((item) => item.id === language)?.label || language}</p>
                  <p>Nivel: {LEVELS.find((item) => item.id === level)?.label || level}</p>
                </div>
              </article>

              <div className="hidden flex-col gap-2 lg:flex">
                <button type="button" onClick={handleSave} disabled={saving} className={`${primaryButtonClass} w-full`}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                {!hideHeader ? (
                  <button type="button" onClick={onBack} className={`${secondaryButtonClass} w-full`}>
                    Volver
                  </button>
                ) : null}
              </div>
            </aside>

            <div className="space-y-4">
              <section className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm sm:p-5">
                <p className={sectionLabelClass}>Identidad</p>
                <div className="mt-3">
                  <label className={fieldLabelClass} htmlFor="assistant-name">
                    Nombre del asistente
                  </label>
                  <input
                    id="assistant-name"
                    type="text"
                    value={name}
                    maxLength={40}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ej. Buddy AI"
                    className={fieldClass}
                  />
                </div>

                <p className={`${sectionLabelClass} mt-5`}>Tono de trato</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {TONES.map((item) => {
                    const active = tone === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTone(item.id)}
                        className={`flex h-full flex-col items-start gap-2 rounded-2xl border p-3 text-left ${
                          active ? 'border-[#7427D5] bg-[#F6EAFE]' : 'border-[#E7DDF2] bg-[#FFFCF9] hover:border-[#C9A8E8]'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            active ? 'bg-white text-[#7427D5]' : 'bg-[#F6EAFE] text-[#8A72B2]'
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="text-xs font-extrabold text-[#261743]">{item.label}</span>
                        <span className="text-[10px] leading-snug text-[#786593]">{item.desc}</span>
                        {active ? <Check className="h-3.5 w-3.5 text-[#7427D5]" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm sm:p-5">
                <p className={sectionLabelClass}>Voz e idioma</p>
                <p className="mt-2 text-[11px] text-[#786593]">Voz</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VOICES.map((item) => (
                    <button key={item.id} type="button" onClick={() => setVoice(item.id)} className={chipClass(voice === item.id)}>
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-[#786593]">Idioma preferido</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLanguage(item.id)}
                      className={chipClass(language === item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm sm:p-5">
                <p className={sectionLabelClass}>Comportamiento</p>
                <div className="mt-3 space-y-2">
                  <button type="button" onClick={() => setVoiceActivation((current) => !current)} className={toggleCardClass(voiceActivation)}>
                    <Mic className="mt-0.5 h-4 w-4 shrink-0 text-[#7427D5]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold text-[#261743]">Tocar para hablar</span>
                      <span className="mt-0.5 block text-[11px] text-[#786593]">
                        Al abrir el asistente de voz, empieza a escuchar sin palabra clave fija.
                      </span>
                    </span>
                    {voiceActivation ? <Check className="h-4 w-4 shrink-0 text-[#7427D5]" /> : null}
                  </button>

                  <p className="pt-1 text-[11px] text-[#786593]">Nivel de asistencia</p>
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map((item) => (
                      <button key={item.id} type="button" onClick={() => setLevel(item.id)} className={chipClass(level === item.id)}>
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <button type="button" onClick={() => setMemoryEnabled((current) => !current)} className={toggleCardClass(memoryEnabled)}>
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#7427D5]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold text-[#261743]">Recordar contexto</span>
                      <span className="mt-0.5 block text-[11px] text-[#786593]">Guarda datos que le pidas recordar.</span>
                    </span>
                    {memoryEnabled ? <Check className="h-4 w-4 shrink-0 text-[#7427D5]" /> : null}
                  </button>

                  <button
                    type="button"
                    onClick={clearMemory}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#5E1ABF] hover:text-[#7427D5]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Borrar memoria
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-sm sm:p-5">
                <p className={`${sectionLabelClass} flex items-center gap-1.5`}>
                  <Shield className="h-3.5 w-3.5 text-[#7427D5]" aria-hidden />
                  Permisos
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {PERMISSIONS.map((item) => {
                    const active = permissions[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPermissions((current) => ({ ...current, [item.id]: !current[item.id] }))}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-extrabold ${
                          active ? 'border-[#7427D5] bg-[#F6EAFE] text-[#261743]' : 'border-[#E7DDF2] bg-[#FFFCF9] text-[#5E506B]'
                        }`}
                      >
                        {item.label}
                        {active ? <Check className="h-4 w-4 text-[#7427D5]" /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              {notice ? (
                <p className="rounded-xl border border-[#E8D1F1] bg-[#FAF4FF] px-3 py-2 text-xs font-semibold text-[#5E1ABF]">{notice}</p>
              ) : null}

              <div className="flex flex-col gap-2 pb-4 lg:hidden">
                <button type="button" onClick={handleSave} disabled={saving} className={`${primaryButtonClass} w-full`}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                {!hideHeader ? (
                  <button type="button" onClick={onBack} className={`${secondaryButtonClass} w-full`}>
                    Volver
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
