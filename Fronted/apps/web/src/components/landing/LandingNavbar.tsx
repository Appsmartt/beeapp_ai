'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, LogOut, Menu, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import BuddyLogo from '@/components/shared/BuddyLogo';
import { useAuth } from '@/lib/auth/AuthProvider';
import { homePathForRole, isAdminRole } from '@/lib/auth/sessionHint';

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

function initialsOf(firstName?: string, lastName?: string, email?: string): string {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return 'BU';
}

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { status, profile, signOut } = useAuth();
  const isHome = pathname === '/';

  const isAuthenticated = status === 'ready' && Boolean(profile);
  const appHref = homePathForRole(profile?.role);
  const appLabel = isAdminRole(profile?.role) ? 'Ir al panel' : 'Ir a mi espacio';
  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
    || profile?.email?.split('@')[0]
    || 'Mi cuenta';
  const shortName = profile?.firstName?.trim() || displayName;
  const userInitials = initialsOf(profile?.firstName, profile?.lastName, profile?.email);

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

  const handleSignOut = async () => {
    setSigningOut(true);
    setMobileMenuOpen(false);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const linkClass =
    'rounded-full px-2.5 py-1.5 text-xs font-medium text-[#4A3B69] transition-colors duration-200 hover:bg-brand-primary/10 hover:text-brand-primary lg:px-3.5 lg:text-sm';

  return (
    <header className="sticky top-0 z-50 border-b border-[#E3D6F5] bg-[#FAF7FE]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <BuddyLogo height={34} priority />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex lg:gap-1">
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

        {/* Desktop auth area */}
        <div className="hidden shrink-0 items-center gap-2 md:flex lg:gap-2.5">
          {isAuthenticated ? (
            <>
              <Link
                href={appHref}
                className="flex items-center gap-2 rounded-full border border-[#DFD2F2] bg-white/90 py-1 pl-1.5 pr-3 text-xs font-semibold text-[#2A194B] transition-colors hover:border-brand-primary/40 hover:bg-white"
                title={displayName}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary/15 text-[11px] font-bold text-brand-primary">
                  {userInitials}
                </span>
                <span className="max-w-[84px] truncate lg:max-w-[110px]">{shortName}</span>
              </Link>

              <Link
                href={appHref}
                className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6025D2] to-[#7C3AED] px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-brand-primary/25 transition-all hover:shadow-md hover:shadow-brand-primary/30 hover:brightness-105 lg:px-4 lg:text-sm"
              >
                <span>{appLabel}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD0F2] bg-white/85 text-[#5A4B7B] transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-[#DDD0F2] bg-white/85 px-4 py-2 text-sm font-semibold text-[#2A194B] transition-all hover:border-brand-primary/40 hover:bg-white hover:text-brand-primary"
              >
                Ingresar
              </Link>

              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-[#6025D2] to-[#7C3AED] px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-primary/25 transition-all hover:shadow-md hover:shadow-brand-primary/30 hover:brightness-105"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-xl p-2 text-[#4A3B69] hover:bg-brand-primary/10 hover:text-[#1A1033] md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="space-y-4 border-b border-[#E3D6F5] bg-[#FAF7FE] px-4 py-6 md:hidden">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              onClick={(event) => handleSectionClick(event, link.id)}
              className="block rounded-xl px-3 py-2 text-base font-medium text-[#4A3B69] hover:bg-brand-primary/10 hover:text-brand-primary"
            >
              {link.label}
            </a>
          ))}
          <div className="space-y-2.5 pt-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 rounded-2xl border border-[#DFD2F2] bg-white px-3.5 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-xs font-bold text-brand-primary">
                    {userInitials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#190D33]">{displayName}</p>
                    {profile?.email ? (
                      <p className="truncate text-xs text-[#6B5B8E]">{profile.email}</p>
                    ) : null}
                  </div>
                </div>

                <Link
                  href={appHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6025D2] to-[#7C3AED] py-2.5 text-center text-base font-semibold text-white shadow-sm transition-all hover:brightness-105"
                >
                  <span>{appLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-white py-2.5 text-center text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-full border border-[#D8C8F2] bg-white py-2.5 text-center text-base font-semibold text-[#2A194B] transition-colors hover:bg-[#F4EEFC]"
                >
                  Ingresar
                </Link>

                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-full bg-gradient-to-r from-[#6025D2] to-[#7C3AED] py-2.5 text-center text-base font-semibold text-white shadow-sm transition-all hover:brightness-105"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
