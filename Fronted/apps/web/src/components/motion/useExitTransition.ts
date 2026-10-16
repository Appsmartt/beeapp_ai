'use client';

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const EXIT_MS = 260;

export function useExitTransition(open: boolean) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (reduced) {
        setVisible(true);
        return undefined;
      }

      const frame = window.requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    if (!mounted) {
      return undefined;
    }

    if (reduced) {
      setMounted(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, open, reduced]);

  return { mounted, visible, reduced };
}
