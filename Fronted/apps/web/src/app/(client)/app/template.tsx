'use client';

import type { ReactNode } from 'react';
import RouteMotion from '@/components/motion/RouteMotion';

export default function ClientTemplate({ children }: { children: ReactNode }) {
  return <RouteMotion>{children}</RouteMotion>;
}
