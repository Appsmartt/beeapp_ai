'use client';

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, ArrowLeft } from 'lucide-react';

export default function OtpForm() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length === 6) {
      router.push('/app');
    }
  };

  const handleResend = () => {
    if (countdown === 0) {
      setCountdown(30);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl sm:border sm:border-neutral-200/80 sm:shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary mb-1">
          <Bot className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
          Verificación
        </h1>
        <p className="text-sm text-neutral-600 font-normal max-w-xs">
          Ingresá el código de 6 dígitos que enviamos a +57 *** ***89
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 6 Digit Inputs */}
        <div className="flex justify-between gap-2 sm:gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={digits.join('').length < 6}
          className="w-full h-12 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-dark transition-colors shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Verificar
        </button>
      </form>

      {/* Resend & Change Number */}
      <div className="text-center space-y-3 pt-2 text-xs font-normal text-neutral-600">
        <div>
          {countdown > 0 ? (
            <span className="text-neutral-500">Reenviar código en 0:{countdown < 10 ? `0${countdown}` : countdown}</span>
          ) : (
            <button
              onClick={handleResend}
              type="button"
              className="text-brand-primary font-medium hover:underline"
            >
              Reenviar código
            </button>
          )}
        </div>

        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cambiar número</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
