'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Lock, Check } from 'lucide-react';

interface PinLockModalProps {
  visible: boolean;
  itemName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinLockModal({
  visible,
  itemName,
  onClose,
  onSuccess,
}: PinLockModalProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (visible) {
      setDigits(['', '', '', '']);
      setError(null);
      setSuccess(false);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [visible]);

  if (!visible) return null;

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);
    setError(null);

    if (val && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (newDigits.every((d) => d !== '')) {
      // Mock validation: any 4-digit PIN is accepted
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 400);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay con fondo oscuro rgba(0,0,0,0.6) y blur(20px) */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xl transition-all"
        onClick={onClose}
      />

      {/* Card del PIN flotante centrado */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl z-50 p-8 space-y-5 border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Lock className="w-4 h-4 text-brand-primary shrink-0" />
            <h2 className="font-semibold text-sm text-neutral-900 truncate">
              {itemName ? `Contenido protegido: ${itemName}` : 'Contenido protegido'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-neutral-900">Ingresa tu PIN</p>
          <p className="text-xs text-neutral-500 font-normal leading-relaxed">
            Este elemento está protegido. Escribe tu PIN de 4 dígitos para abrirlo.
          </p>
        </div>

        {/* 4 Digit PIN inputs */}
        <div className="flex items-center justify-center gap-3 py-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 rounded-2xl border border-neutral-300 text-center font-bold text-xl outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all bg-neutral-50"
            />
          ))}
        </div>

        {success && (
          <p className="text-center text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
            <Check className="w-4 h-4" /> PIN correcto, abriendo...
          </p>
        )}

        {error && <p className="text-center text-xs text-red-600 font-medium">{error}</p>}

        <p className="text-center text-[11px] text-neutral-400 font-normal pt-1">
          ¿Olvidaste tu PIN? Recupéralo en Perfil → Seguridad.
        </p>
      </div>
    </div>
  );
}
