'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AnimatedLogo from '../../components/AnimatedLogo';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Format the phone number dynamically using passed flag and dialCode
  const phoneVal = searchParams.get('phone') || '300 000 0000';
  const dialCode = searchParams.get('dialCode') || '+57';
  const flag = searchParams.get('flag') || '🇨🇴';
  const phone = `${flag} ${dialCode} ${phoneVal}`;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [timer, setTimer] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResendDisabled && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [timer, isResendDisabled]);

  const handleResend = () => {
    if (isResendDisabled) return;
    setTimer(60);
    setIsResendDisabled(true);
    setCode(['', '', '', '', '', '']);
    setError('Código reenviado (simulación).');
    inputRefs.current[0]?.focus();
  };

  const handleCodeChange = (value: string, index: number) => {
    const cleaned = value.replace(/\D/g, '');
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);

    if (error) setError('');

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Ingresa el código completo de 6 dígitos.');
      return;
    }
    router.replace('/dashboard');
  };

  return (
    <div style={cardStyle}>
      {/* Top Logo (AnimatedLogo web version, auto-stop after 2.5s) */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <AnimatedLogo size={80} showText={false} autoStopAfter={2500} />
      </div>

      <h1 style={titleStyle}>Verificación de Seguridad</h1>
      <p style={subtitleStyle}>
        Ingresa el código de 6 dígitos enviado por SMS a <strong style={{ color: '#1A1A2E' }}>{phone}</strong>
      </p>

      <form onSubmit={handleVerify}>
        <div style={codeRowStyle}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              style={{
                ...codeBoxStyle,
                borderColor: digit ? '#6025d2' : '#E9ECEF',
                backgroundColor: digit ? '#F3EDFC' : '#FFFFFF',
              }}
            />
          ))}
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <div style={resendContainerStyle}>
          <span style={{ fontSize: '13px', color: '#6C757D' }}>¿No recibiste el código? </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResendDisabled}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '13px',
              fontWeight: '400',
              color: isResendDisabled ? '#ADB5BD' : '#6025d2',
              cursor: isResendDisabled ? 'default' : 'pointer',
            }}
          >
            {isResendDisabled ? `Reenviar código (${timer}s)` : 'Reenviar código'}
          </button>
        </div>

        <button type="submit" style={buttonStyle}>
          Verificar y Acceder
        </button>
      </form>
    </div>
  );
}

export default function AdminVerifyPage() {
  return (
    <div style={containerStyle}>
      <Suspense fallback={
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', color: '#6C757D' }}>Cargando verificación...</p>
        </div>
      }>
        <VerifyForm />
      </Suspense>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100vw',
  backgroundColor: '#F8F9FC',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  padding: '40px 32px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 12px 32px rgba(96, 37, 210, 0.08)',
  border: '1px solid #E9ECEF',
  display: 'flex',
  flexDirection: 'column',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1A1A2E',
  textAlign: 'center',
  marginBottom: '8px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6C757D',
  textAlign: 'center',
  marginBottom: '32px',
  lineHeight: '1.5',
};

const codeRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '20px',
};

const codeBoxStyle: React.CSSProperties = {
  width: '48px',
  height: '56px',
  borderRadius: '12px',
  border: '1.5px solid #E9ECEF',
  fontSize: '22px',
  fontWeight: '400',
  color: '#1A1A2E',
  textAlign: 'center',
  outline: 'none',
  transition: 'all 0.15s ease',
};

const errorStyle: React.CSSProperties = {
  color: '#F44336',
  fontSize: '13px',
  textAlign: 'center',
  marginBottom: '16px',
};

const resendContainerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '28px',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#6025d2',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '12px',
  padding: '16px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 6px 16px rgba(96, 37, 210, 0.25)',
};
