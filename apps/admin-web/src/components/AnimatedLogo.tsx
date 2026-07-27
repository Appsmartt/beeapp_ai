import React, { useState, useEffect } from 'react';

interface AnimatedLogoProps {
  size?: number;
  showText?: boolean;
  autoStopAfter?: number;
}

export default function AnimatedLogo({ size = 100, showText = true, autoStopAfter }: AnimatedLogoProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (autoStopAfter) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, autoStopAfter);
      return () => clearTimeout(timer);
    }
  }, [autoStopAfter]);

  const leftWingStyle = isAnimating
    ? {
        animation: 'spinCounterClockwise 3s linear infinite',
      }
    : {
        transform: 'rotate(45deg)',
        transition: 'transform 0.5s ease-out',
      };

  const rightWingStyle = isAnimating
    ? {
        animation: 'spinClockwise 3s linear infinite',
      }
    : {
        transform: 'rotate(0deg)',
        transition: 'transform 0.5s ease-out',
      };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes spinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinCounterClockwise {
          from { transform: rotate(45deg); }
          to { transform: rotate(-315deg); }
        }
      `}</style>

      <div style={{
        position: 'relative',
        width: size * 1.5,
        height: size * 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Left Wing */}
        <div style={{
          position: 'absolute',
          width: size * 1.25,
          height: size * 1.25,
          borderRadius: size * 0.28,
          backgroundColor: '#6025d2',
          opacity: 0.35,
          transformOrigin: 'center center',
          ...leftWingStyle
        }} />

        {/* Right Wing */}
        <div style={{
          position: 'absolute',
          width: size * 1.25,
          height: size * 1.25,
          borderRadius: size * 0.28,
          backgroundColor: '#6025d2',
          opacity: 0.35,
          transformOrigin: 'center center',
          ...rightWingStyle
        }} />

        {/* Central Square (static, white foreground, tilted 12 degrees) */}
        <div style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: size * 0.25,
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(12deg)',
          boxShadow: '0 6px 12px rgba(26,26,46,0.15)',
          zIndex: 2
        }}>
          {/* 2x2 Grid dots */}
          <div style={{
            width: size * 0.52,
            height: size * 0.52,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: size * 0.06
          }}>
            <div style={{ backgroundColor: '#6025d2', borderRadius: size * 0.06 }} />
            <div style={{ backgroundColor: '#6025d2', borderRadius: size * 0.06 }} />
            <div style={{ backgroundColor: '#6025d2', borderRadius: size * 0.06 }} />
            <div style={{ backgroundColor: '#6025d2', borderRadius: size * 0.06 }} />
          </div>
        </div>
      </div>

      {showText && (
        <div style={{ marginTop: size * 0.24, textAlign: 'center' }}>
          <h2 style={{
            fontSize: Math.max(18, size * 0.24),
            color: '#6025d2',
            fontWeight: 700,
            margin: 0
          }}>
            BeeApp AI
          </h2>
          <p style={{
            fontSize: Math.max(9, size * 0.1),
            color: '#6C757D',
            fontWeight: 400,
            letterSpacing: `${size * 0.02}px`,
            margin: '4px 0 0 0',
            textTransform: 'uppercase'
          }}>
            ECOSISTEMA INTELIGENTE
          </p>
        </div>
      )}
    </div>
  );
}
