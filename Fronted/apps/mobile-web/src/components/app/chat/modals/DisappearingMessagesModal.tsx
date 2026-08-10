'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

export type DisappearingInterval = '30m' | '1h' | '6h' | '24h' | '7d';

export const DISAPPEARING_OPTIONS: { id: DisappearingInterval; label: string }[] = [
  { id: '30m', label: '30 minutos' },
  { id: '1h', label: '1 hora' },
  { id: '6h', label: '6 horas' },
  { id: '24h', label: '24 horas' },
  { id: '7d', label: '7 días' },
];

export const disappearingLabel = (interval: DisappearingInterval) =>
  `Cada ${DISAPPEARING_OPTIONS.find((o) => o.id === interval)?.label ?? ''}`;

interface DisappearingMessagesModalProps {
  visible: boolean;
  value: DisappearingInterval;
  onSave: (interval: DisappearingInterval) => void;
  onClose: () => void;
}

export default function DisappearingMessagesModal({
  visible,
  value,
  onSave,
  onClose,
}: DisappearingMessagesModalProps) {
  const [selected, setSelected] = useState<DisappearingInterval>(value);

  useEffect(() => {
    if (visible) setSelected(value);
  }, [visible, value]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl z-50 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="font-semibold text-base text-neutral-900">Mensajes temporales</h2>
            <p className="text-xs text-neutral-500 font-normal mt-0.5">
              Los mensajes se eliminarán automáticamente después del tiempo seleccionado.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100">
          {DISAPPEARING_OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            return (
              <div
                key={option.id}
                onClick={() => setSelected(option.id)}
                className="py-3 px-2 flex items-center justify-between cursor-pointer hover:bg-neutral-50 rounded-xl transition-colors"
              >
                <span className="text-sm font-normal text-neutral-900">{option.label}</span>
                {isSelected && <Check className="w-4.5 h-4.5 text-brand-primary shrink-0" />}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onSave(selected)}
          className="w-full h-12 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
