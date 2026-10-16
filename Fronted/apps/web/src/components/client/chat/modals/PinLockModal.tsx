'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Lock, Check } from 'lucide-react';
import { verifyAccountSecurityPin } from '@beeapp/api-client';
import { getWebAuth } from '@/lib/client/liveData';

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
  const [verifying, setVerifying] = useState(false);
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
      setVerifying(false);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [visible]);

  if (!visible) return null;

  const verifyPin = async (pin: string) => {
    setVerifying(true);
    setError(null);
    try {
      const auth = await getWebAuth();
      const result = await verifyAccountSecurityPin(auth, pin);
      if (!result.verified) {
        setError('PIN incorrecto.');
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 400);
    } catch {
      setError('No fue posible verificar el PIN.');
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleChange = (index: number, val: string) => {
    if (verifying) return;
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);
    setError(null);

    if (val && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (newDigits.every((d) => d !== '')) {
      void verifyPin(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xl transition-all"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl z-50 p-8 space-y-5 border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Lock className="w-4 h-4 text-brand-primary shrink-0" />
            <h2 className="font-semibold text-sm text-neutral-900 truncate">
              {itemName ? `Contenido protegido: ${itemName}` : 'Contenido protegido'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:text-neutral-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-neutral-600 font-normal text-center">
          Ingresa tu PIN de seguridad de 4 dígitos para continuar.
        </p>

        <div className="flex justify-center gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={verifying || success}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-xl font-semibold rounded-xl border border-neutral-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
          ))}
        </div>

        {error ? <p className="text-xs text-red-600 text-center">{error}</p> : null}

        {success ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-semibold">
            <Check className="w-4 h-4" />
            PIN verificado
          </div>
        ) : null}
      </div>
    </div>
  );
}
