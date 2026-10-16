'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="motion-page-enter">
      {children}
    </div>
  );
}
