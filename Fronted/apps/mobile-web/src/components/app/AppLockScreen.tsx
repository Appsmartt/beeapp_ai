'use client';

import { useState } from 'react';
import { Bot, Fingerprint } from 'lucide-react';

interface AppLockScreenProps {
  onUnlock: () => void;
}

export default function AppLockScreen({ onUnlock }: AppLockScreenProps) {
  const [pin, setPin] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 6) {
        setTimeout(onUnlock, 200);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay con fondo oscuro y backdrop blur (20px) */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" />

      {/* Card flotante del PIN */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl z-50 p-8 space-y-6 border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Top logo & PIN dots */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto shadow-xs">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-neutral-900">BeeApp AI</h1>
          <p className="text-xs text-neutral-500 font-normal">
            Ingresa tu código PIN de 6 dígitos para acceder
          </p>

          {/* 6 Dots */}
          <div className="flex justify-center gap-3 pt-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border border-neutral-300 transition-all ${
                  pin.length > idx ? 'bg-brand-primary border-brand-primary scale-110' : 'bg-neutral-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 3x4 Keypad */}
        <div className="space-y-3 w-full">
          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleKeyPress(n)}
                className="h-12 rounded-xl bg-neutral-100 font-semibold text-base text-neutral-900 hover:bg-neutral-200/80 active:scale-95 transition-all"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={onUnlock}
              className="h-12 rounded-xl bg-brand-primary/10 text-brand-primary font-semibold flex items-center justify-center active:scale-95 transition-all"
              title="Autenticación Biométrica"
            >
              <Fingerprint className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-xl bg-neutral-100 font-semibold text-base text-neutral-900 hover:bg-neutral-200/80 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-12 rounded-xl bg-neutral-100 font-medium text-xs text-neutral-700 hover:bg-neutral-200/80 active:scale-95 transition-all"
            >
              Borrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
