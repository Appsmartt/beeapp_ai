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
    <div className="fixed inset-0 z-50 bg-white flex flex-col justify-between max-w-[430px] mx-auto p-6 text-neutral-900">
      
      {/* Top logo & PIN dots */}
      <div className="pt-10 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto shadow-sm">
          <Bot className="w-9 h-9" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">BeeApp AI</h1>
        <p className="text-xs text-neutral-500 font-normal">Ingresa tu código PIN de 6 dígitos para acceder</p>

        {/* 6 Dots */}
        <div className="flex justify-center gap-3 pt-4">
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
      <div className="pb-8 space-y-4 max-w-xs mx-auto w-full">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleKeyPress(n)}
              className="h-14 rounded-2xl bg-neutral-100 font-semibold text-lg text-neutral-900 hover:bg-neutral-200/80 active:scale-95 transition-all"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={onUnlock}
            className="h-14 rounded-2xl bg-brand-primary/10 text-brand-primary font-semibold flex items-center justify-center active:scale-95 transition-all"
            title="Autenticación Biométrica"
          >
            <Fingerprint className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-neutral-100 font-semibold text-lg text-neutral-900 hover:bg-neutral-200/80 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-neutral-100 font-medium text-xs text-neutral-700 hover:bg-neutral-200/80 active:scale-95 transition-all"
          >
            Borrar
          </button>
        </div>
      </div>

    </div>
  );
}
