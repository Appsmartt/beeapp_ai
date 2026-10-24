'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import BuddyLogo from '@/components/shared/BuddyLogo';

const SECTION_LINKS = [
  { id: 'features', label: 'Características' },
  { id: 'how-it-works', label: 'Cómo funciona' },
  { id: 'security', label: 'Seguridad' },
  { id: 'contact', label: 'Contacto' },
] as const;

type SectionId = (typeof SECTION_LINKS)[number]['id'];

function scrollToSection(id: SectionId) {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${id}`);
  return true;
}

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) return;
    const hash = window.location.hash.replace('#', '') as SectionId;
    if (!hash || !SECTION_LINKS.some((link) => link.id === hash)) return;
    const timer = window.setTimeout(() => scrollToSection(hash), 100);
    return () => window.clearTimeout(timer);
  }, [isHome, pathname]);

  const handleSectionClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: SectionId) => {
      event.preventDefault();
      setMobileMenuOpen(false);
      if (isHome) {
        scrollToSection(id);
        return;
      }
      router.push(`/#${id}`);
    },
    [isHome, router],
  );

  const linkClass =
    'hover:text-brand-primary transition-colors duration-200';

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <BuddyLogo height={34} />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-600 font-normal">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              onClick={(event) => handleSectionClick(event, link.id)}
              className={linkClass}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:text-brand-primary"
          >
            Ingresar
          </Link>

          <Link
            href="/register"
            className="px-5 py-2 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-dark transition-colors shadow-sm"
          >
            Crear cuenta
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-neutral-600 hover:text-neutral-900"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-6 space-y-4">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              onClick={(event) => handleSectionClick(event, link.id)}
              className="block text-neutral-600 hover:text-brand-primary py-2 text-base font-normal"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 space-y-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full rounded-full border border-neutral-300 py-2.5 text-center text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Ingresar
            </Link>

            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full rounded-full bg-brand-primary py-2.5 text-center text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
