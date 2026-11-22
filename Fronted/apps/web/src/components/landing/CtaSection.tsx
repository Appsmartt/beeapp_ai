'use client';

import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { homePathForRole, isAdminRole } from '@/lib/auth/sessionHint';

export default function CtaSection() {
  const { status, profile } = useAuth();
  const isAuthenticated = status === 'ready' && Boolean(profile);
  const appHref = homePathForRole(profile?.role);
  const appLabel = isAdminRole(profile?.role) ? 'Ir al panel' : 'Ir a mi espacio';

  return (
    <section className="bg-[#FAF7FE] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-[#5B2CD9]/30 bg-gradient-to-br from-[#1D0F3D] via-[#3A197E] to-[#6025D2] p-8 text-center shadow-[0_24px_60px_-15px_rgba(96,37,210,0.42)] sm:p-14">
          {/* Decorative glow & subtle rings */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#A78BFA]/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl"
          />

          <div className="relative z-10 mx-auto max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-[#EADFFF] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Web y móvil en perfecta sincronía</span>
            </div>

            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Lleva tu negocio al siguiente nivel
            </h2>

            <p className="text-base text-[#DED2FA] sm:text-lg">
              Únete a Buddy AI hoy mismo y experimenta el poder de gestionar tu comunicación, productividad y ventas con inteligencia artificial.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  href={appHref}
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[#271254] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#F5EFFE] sm:w-auto"
                >
                  <span>{appLabel}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[#271254] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#F5EFFE] sm:w-auto"
                  >
                    <span>Crear cuenta gratis</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs text-[#DFD3FA]">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                Configuración en minutos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                Asistente IA integrado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                Control total de seguridad
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
