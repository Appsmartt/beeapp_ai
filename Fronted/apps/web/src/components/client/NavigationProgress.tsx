'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { NAVIGATION_START_EVENT } from '@/lib/client/navigationFeedback';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => setActive(false), 8000);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    const start = () => setActive(true);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener(NAVIGATION_START_EVENT, start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(NAVIGATION_START_EVENT, start);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-[#F3EAF8]" role="progressbar" aria-label="Cargando página">
      <div className="buddy-nav-progress h-full w-1/3 bg-[#7427D5]" />
    </div>
  );
}
