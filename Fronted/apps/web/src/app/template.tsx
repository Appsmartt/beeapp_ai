'use client';

import type { ReactNode } from 'react';
import RouteMotion from '@/components/motion/RouteMotion';

export default function RootTemplate({ children }: { children: ReactNode }) {
  return <RouteMotion>{children}</RouteMotion>;
}
