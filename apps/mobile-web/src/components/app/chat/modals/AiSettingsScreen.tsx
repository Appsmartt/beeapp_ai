'use client';

import { useState } from 'react';
import { ArrowLeft, Bot, Check } from 'lucide-react';

interface AiSettingsScreenProps {
  onBack: () => void;
}

const TONES = [
  { id: 'professional', label: 'Profesional', desc: 'Respuestas formales y directas al grano' },
  { id: 'friendly', label: 'Amigable', desc: 'Tono cercano, empático y servicial' },
  { id: 'direct', label: 'Directo', desc: 'Respuestas concisas y breves' },
  { id: 'creative', label: 'Creativo', desc: 'Tono dinámico y persuasivo' },
];

export default function AiSettingsScreen({ onBack }: AiSettingsScreenProps) {
  const [name, setName] = useState('Bee');
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [language, setLanguage] = useState('Español');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm text-neutral-900">Configuración del Asistente IA</h1>
        <button
          onClick={handleSave}
          className="h-8 px-3 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{saved ? 'Guardado' : 'Guardar'}</span>
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        {/* Avatar Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary text-white flex items-center justify-center mx-auto shadow-md">
            <Bot className="w-9 h-9" />
          </div>
          <p className="text-xs text-neutral-500 font-normal">Personaliza el comportamiento del asistente de tu negocio</p>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700">Nombre del Asistente</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-primary"
          />
        </div>

        {/* Tone Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-700">Tono de conversación</label>
          <div className="space-y-2">
            {TONES.map((t) => {
              const active = selectedTone === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTone(t.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    active ? 'border-brand-primary bg-brand-primary/5' : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-900">{t.label}</span>
                    {active && <Check className="w-4 h-4 text-brand-primary" />}
                  </div>
                  <p className="text-[11px] text-neutral-500 font-normal mt-0.5">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700">Idioma preferido</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:border-brand-primary font-normal text-neutral-800"
          >
            <option value="Español">Español</option>
            <option value="English">English</option>
            <option value="Português">Português</option>
          </select>
        </div>
      </div>
    </div>
  );
}
