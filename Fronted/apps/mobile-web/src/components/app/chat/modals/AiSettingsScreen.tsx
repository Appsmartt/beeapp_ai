'use client';

import { useState } from 'react';
import { ArrowLeft, Bot, Smile, Briefcase, Zap, Sparkles, Check } from 'lucide-react';
import { AI_ASSISTANT_NAME } from '@/mocks/chats';

type Tone = 'profesional' | 'amigable' | 'directo' | 'creativo';

const TONES: { id: Tone; label: string; desc: string; icon: typeof Smile }[] = [
  { id: 'profesional', label: 'Profesional', desc: 'Respuestas formales y precisas.', icon: Briefcase },
  { id: 'amigable', label: 'Amigable', desc: 'Trato cercano y con calidez.', icon: Smile },
  { id: 'directo', label: 'Directo', desc: 'Al grano, sin rodeos.', icon: Zap },
  { id: 'creativo', label: 'Creativo', desc: 'Propone ideas y alternativas.', icon: Sparkles },
];

const LANGUAGES = ['Español', 'Inglés', 'Portugués'];

interface AiSettingsScreenProps {
  onBack: () => void;
}

export default function AiSettingsScreen({ onBack }: AiSettingsScreenProps) {
  const [name, setName] = useState(AI_ASSISTANT_NAME);
  const [tone, setTone] = useState<Tone>('amigable');
  const [language, setLanguage] = useState('Español');

  const handleSave = () => {
    alert('La configuración de tu asistente se actualizó.');
    onBack();
  };

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm text-neutral-900 ml-2">Configuración del Asistente</h1>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        {/* Hero Avatar & Info */}
        <div className="text-center space-y-2">
          <div className="w-18 h-18 rounded-full bg-brand-primary text-white flex items-center justify-center mx-auto shadow-md">
            <Bot className="w-9 h-9" />
          </div>
          <h2 className="text-base font-semibold text-neutral-900">{name || 'Tu asistente'}</h2>
          <p className="text-xs text-neutral-500 font-normal max-w-xs mx-auto">
            Así se presenta y responde tu asistente dentro del chat.
          </p>
        </div>

        {/* Assistant Name input */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider font-normal text-neutral-500">
            Nombre del asistente
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Bee, Colmena, Asistente..."
            className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl text-sm font-normal text-neutral-900 outline-none focus:border-brand-primary"
          />
        </div>

        {/* Tone Selector */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-normal text-neutral-500">
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
                      ? 'border-brand-primary bg-brand-primary/5'
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
                    <p
                      className={`text-xs font-semibold ${
                        active ? 'text-brand-primary' : 'text-neutral-900'
                      }`}
                    >
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

        {/* Preferred Language */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-normal text-neutral-500">
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

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full h-12 rounded-2xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors shadow-md mt-4"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
