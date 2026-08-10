'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import BeeAppLogo from '@/components/BeeAppLogo';

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center">
          <BeeAppLogo height={34} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-600 font-normal">
          <a href="#features" className="hover:text-brand-primary transition-colors">
            Características
          </a>
          <a href="#how-it-works" className="hover:text-brand-primary transition-colors">
            Cómo funciona
          </a>
          <a href="#security" className="hover:text-brand-primary transition-colors">
            Seguridad
          </a>
          <a href="#contact" className="hover:text-brand-primary transition-colors">
            Contacto
          </a>
        </nav>

        {/* Desktop CTA */}
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

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-neutral-600 hover:text-neutral-900"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-6 space-y-4">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-neutral-600 hover:text-brand-primary py-2 text-base font-normal"
          >
            Características
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-neutral-600 hover:text-brand-primary py-2 text-base font-normal"
          >
            Cómo funciona
          </a>
          <a
            href="#security"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-neutral-600 hover:text-brand-primary py-2 text-base font-normal"
          >
            Seguridad
          </a>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-neutral-600 hover:text-brand-primary py-2 text-base font-normal"
          >
            Contacto
          </a>
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
      )}
    </header>
  );
}
