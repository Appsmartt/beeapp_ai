'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedLogo from '../components/AnimatedLogo';

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main style={styles.splashContainer}>
      <style>{`
        @keyframes flowLeft1 {
          from { transform: rotate(-10deg) translate3d(0, 0, 0); }
          to { transform: rotate(-10deg) translate3d(-1200px, 0, 0); }
        }
        @keyframes flowRight2 {
          from { transform: rotate(12deg) translate3d(-1200px, 0, 0); }
          to { transform: rotate(12deg) translate3d(0, 0, 0); }
        }
        @keyframes flowLeft3 {
          from { transform: rotate(-8deg) translate3d(0, 0, 0); }
          to { transform: rotate(-8deg) translate3d(-1200px, 0, 0); }
        }
        @keyframes flowRight4 {
          from { transform: rotate(15deg) translate3d(-1200px, 0, 0); }
          to { transform: rotate(15deg) translate3d(0, 0, 0); }
        }
        @keyframes spinSpinner {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Background Paths (Líneas fluyendo) ── */}
      <div style={styles.pathsContainer}>
        {/* Path 1 */}
        <div style={{
          position: 'absolute',
          top: '15%',
          width: '3600px',
          left: 'calc(50% - 1800px)',
          animation: 'flowLeft1 16s linear infinite'
        }}>
          <svg width="3600" height="120">
            <path
              d="M 0,60 Q 300,30 600,60 T 1200,60 T 1800,60 T 2400,60 T 3000,60 T 3600,60"
              fill="none"
              stroke="#6025d2"
              strokeWidth="1.5"
              opacity="0.07"
            />
          </svg>
        </div>

        {/* Path 2 */}
        <div style={{
          position: 'absolute',
          top: '38%',
          width: '3600px',
          left: 'calc(50% - 1800px)',
          animation: 'flowRight2 22s linear infinite'
        }}>
          <svg width="3600" height="160">
            <path
              d="M 0,80 Q 300,35 600,80 T 1200,80 T 1800,80 T 2400,80 T 3000,80 T 3600,80"
              fill="none"
              stroke="#5B2CD9"
              strokeWidth="2"
              opacity="0.08"
            />
          </svg>
        </div>

        {/* Path 3 */}
        <div style={{
          position: 'absolute',
          top: '60%',
          width: '3600px',
          left: 'calc(50% - 1800px)',
          animation: 'flowLeft3 18s linear infinite'
        }}>
          <svg width="3600" height="140">
            <path
              d="M 0,70 Q 300,35 600,70 T 1200,70 T 1800,70 T 2400,70 T 3000,70 T 3600,70"
              fill="none"
              stroke="#6025d2"
              strokeWidth="2.5"
              opacity="0.06"
            />
          </svg>
        </div>

        {/* Path 4 */}
        <div style={{
          position: 'absolute',
          top: '80%',
          width: '3600px',
          left: 'calc(50% - 1800px)',
          animation: 'flowRight4 26s linear infinite'
        }}>
          <svg width="3600" height="120">
            <path
              d="M 0,60 Q 300,35 600,60 T 1200,60 T 1800,60 T 2400,60 T 3000,60 T 3600,60"
              fill="none"
              stroke="#5B2CD9"
              strokeWidth="1"
              opacity="0.11"
            />
          </svg>
        </div>
      </div>

      {/* ── Content Foreground ── */}
      <div style={styles.splashContent}>
        {/* Animated Logo (size 100, showing real text) */}
        <AnimatedLogo size={100} showText={true} />

        {/* Spinner */}
        <div style={styles.spinner} />

        <h1 style={styles.title}>Iniciando tu espacio seguro...</h1>
        <p style={styles.subtitle}>Todo lo importante, en un solo lugar.</p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  splashContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#FFFFFF', // White background
    position: 'relative',
    overflow: 'hidden',
  },
  pathsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  splashContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    zIndex: 10,
  },
  spinner: {
    margin: '32px 0',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid rgba(96, 37, 210, 0.1)',
    borderTopColor: '#6025d2',
    animation: 'spinSpinner 1s linear infinite',
  },
  title: {
    color: '#6025d2',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#6C757D',
    fontSize: '13px',
    fontWeight: '400',
    margin: 0,
  },
};
