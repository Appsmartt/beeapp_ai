'use client';

import { useState } from 'react';
import { Bot, Smile, Briefcase, Zap, Sparkles, Check } from 'lucide-react';
import { AI_ASSISTANT_NAME } from '@/mocks/chats';

type Tone = 'profesional' | 'amigable' | 'directo' | 'creativo';

const TONES: { id: Tone; label: string; desc: string; icon: typeof Smile }[] = [
  { id: 'profesional', label: 'Profesional', desc: 'Respuestas formales y precisas.', icon: Briefcase },
  { id: 'amigable', label: 'Amigable', desc: 'Trato cercano y con calidez.', icon: Smile },
  { id: 'directo', label: 'Directo', desc: 'Al grano, sin rodeos.', icon: Zap },
  { id: 'creativo', label: 'Creativo', desc: 'Propone ideas y alternativas.', icon: Sparkles },
];

const LANGUAGES = ['Español', 'Inglés', 'Portugués'];

export function AiSettingsPanel() {
  const [name, setName] = useState(AI_ASSISTANT_NAME);
  const [tone, setTone] = useState<Tone>('amigable');
  const [language, setLanguage] = useState('Español');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Hero Avatar */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center mx-auto shadow-md">
          <Bot className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900">{name || 'Tu asistente'}</h3>
        <p className="text-xs text-neutral-500 font-normal">
          Así se presenta y responde tu asistente dentro del chat.
        </p>
      </div>

      {/* Nombre del asistente */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider font-semibold text-neutral-500">
          Nombre del asistente
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Bee, Colmena, Asistente..."
          className="w-full h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-normal text-neutral-900 outline-none focus:border-brand-primary transition-colors"
        />
      </div>

      {/* Tono de trato */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider font-semibold text-neutral-500">
          Tono de trato
        </label>
        <div className="space-y-2">
          {TONES.map((item) => {
            const active = tone === item.id;
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setTone(item.id)}
                className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                  active
                    ? 'border-brand-primary bg-brand-primary/5 shadow-xs'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? 'bg-brand-primary/15 text-brand-primary' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${active ? 'text-brand-primary' : 'text-neutral-900'}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-normal">{item.desc}</p>
                </div>
                {active && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Idioma preferido */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider font-semibold text-neutral-500">
          Idioma preferido
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => {
            const active = language === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-4 py-2 rounded-xl text-xs font-normal border transition-colors ${
                  active
                    ? 'bg-brand-primary/15 border-brand-primary text-brand-primary font-semibold'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-xs flex items-center justify-center gap-1.5"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            <span>Configuración guardada</span>
          </>
        ) : (
          <span>Guardar Cambios</span>
        )}
      </button>
    </div>
  );
}
