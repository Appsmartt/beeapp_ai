'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Mail,
  MessageCircle,
  Mic,
  Shield,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { loadLandingHero } from '@/lib/client/publicAppSettings';
import { useAuth } from '@/lib/auth/AuthProvider';
import { homePathForRole, isAdminRole } from '@/lib/auth/sessionHint';

const DEFAULT_HERO = {
  badge: 'Nueva generación',
  title: 'Tu espacio de trabajo inteligente',
  subtitle: 'Comunicación, productividad e IA en una sola plataforma.',
};

const HIGHLIGHTS = [
  { icon: MessageCircle, label: 'Chats y llamadas HD' },
  { icon: ShoppingBag, label: 'Marketplace BuddyServices' },
  { icon: CalendarDays, label: 'Agenda, correo y nube' },
  { icon: Bot, label: 'Asistente IA por voz' },
] as const;

export default function HeroSection() {
  const [badge, setBadge] = useState(DEFAULT_HERO.badge);
  const [title, setTitle] = useState(DEFAULT_HERO.title);
  const [subtitle, setSubtitle] = useState(DEFAULT_HERO.subtitle);
  const { status, profile } = useAuth();
  const isAuthenticated = status === 'ready' && Boolean(profile);
  const appHref = homePathForRole(profile?.role);
  const appCtaLabel = isAdminRole(profile?.role) ? 'Ir al panel' : 'Ir a mi espacio';

  useEffect(() => {
    void loadLandingHero().then((hero) => {
      if (!hero) return;
      if (hero.badge) setBadge(hero.badge);
      if (hero.title) setTitle(hero.title);
      if (hero.subtitle) setSubtitle(hero.subtitle);
    });
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-[#E3D6F5] bg-[#F2ECFC] py-8 sm:py-12 lg:py-12">
      {/* Atmospheric mesh gradients & subtle dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.20),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(96,37,210,0.14),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(rgba(96,37,210,0.18)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left column: Value prop, CTAs, and capability pills */}
          <div className="space-y-5 text-center lg:col-span-7 lg:text-left">
            {badge ? (
              <div className="motion-page-enter inline-flex items-center gap-2 rounded-full border border-[#D8C5F6] bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#5E1ABF] shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{badge}</span>
              </div>
            ) : null}

            <h1 className="motion-page-enter motion-delay-1 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#190D33] sm:text-5xl lg:text-[3.35rem]">
              {title}
            </h1>

            {subtitle ? (
              <p className="motion-page-enter motion-delay-2 mx-auto max-w-xl text-base leading-relaxed text-[#4C3F6D] sm:text-lg lg:mx-0">
                {subtitle} Conecta tus conversaciones, correo, agenda, archivos y tienda en un mismo entorno diseñado para trabajar más rápido.
              </p>
            ) : null}

            <div className="motion-page-enter motion-delay-3 flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row lg:justify-start">
              {isAuthenticated ? (
                <>
                  <Link
                    href={appHref}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6025D2] via-[#6F32E6] to-[#7C3AED] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-primary/35 sm:w-auto sm:text-base"
                  >
                    <span>{appCtaLabel}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <a
                    href="#features"
                    className="flex w-full items-center justify-center rounded-full border border-[#D5C3F3] bg-white/90 px-7 py-3.5 text-sm font-semibold text-[#2A184E] shadow-sm backdrop-blur-sm transition-all hover:border-brand-primary/50 hover:bg-white hover:text-brand-primary sm:w-auto sm:text-base"
                  >
                    Ver funciones
                  </a>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6025D2] via-[#6F32E6] to-[#7C3AED] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-primary/35 sm:w-auto sm:text-base"
                  >
                    <span>Comenzar ahora</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center rounded-full border border-[#D5C3F3] bg-white/90 px-7 py-3.5 text-sm font-semibold text-[#2A184E] shadow-sm backdrop-blur-sm transition-all hover:border-brand-primary/50 hover:bg-white hover:text-brand-primary sm:w-auto sm:text-base"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}
            </div>

            <div className="motion-page-enter motion-delay-3 grid grid-cols-1 gap-2.5 pt-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-center lg:justify-start">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-xl border border-[#DFD2F2] bg-white/80 px-3 py-2 text-xs font-medium text-[#372959] shadow-sm backdrop-blur-sm"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="leading-tight sm:truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column: Sculpted showcase stage with compact phone */}
          <div className="flex justify-center lg:col-span-5 lg:justify-end">
            <div className="relative w-full max-w-[360px] rounded-[28px] border border-white/80 bg-gradient-to-br from-[#E6D9FA] via-[#F7F3FE] to-[#D9C7F7] p-4 shadow-[0_24px_60px_-15px_rgba(96,37,210,0.26)] sm:p-5">
              {/* Soft radial glow behind compact device */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary/25 blur-3xl"
              />

              {/* Floating notification top-left */}
              <div className="relative z-10 mb-2.5 hidden items-center gap-2 rounded-2xl border border-[#E4D7F5] bg-white/95 px-3 py-1.5 shadow-md shadow-brand-primary/10 backdrop-blur-md sm:inline-flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <div className="leading-tight">
                  <p className="text-[10.5px] font-bold text-[#190D33]">Asistente IA · Activo</p>
                  <p className="text-[9.5px] text-[#6B5B8E]">Cita confirmada · Hoy 4:00 PM</p>
                </div>
              </div>

              {/* Compact Smartphone Mockup */}
              <div className="relative z-10 mx-auto w-[176px] shrink-0 rounded-[26px] border-[3px] border-[#261B42] bg-[#120A24] p-1.5 shadow-[0_18px_40px_rgba(25,13,51,0.36)] sm:w-[186px]">
                {/* Dynamic island */}
                <div className="mx-auto mb-2 h-2.5 w-14 rounded-full bg-[#24193E]" />

                <div className="overflow-hidden rounded-[20px] bg-gradient-to-b from-[#160D2C] via-[#120A24] to-[#0D071A] p-2.5 space-y-2">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-1 text-[9px] font-medium text-white/75">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Buddy AI
                    </span>
                    <span>9:41</span>
                  </div>

                  {/* AI Prompt Banner */}
                  <div className="rounded-xl bg-gradient-to-r from-[#6025D2] to-[#7C3AED] p-2.5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold">¿Qué organizamos hoy?</span>
                      <Mic className="h-3 w-3 text-white/90" />
                    </div>
                    <p className="mt-0.5 text-[9px] text-white/80">
                      3 mensajes nuevos · 2 citas hoy
                    </p>
                  </div>

                  {/* App module rows */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.08] px-2.5 py-2 text-[10.5px] text-white">
                      <span className="flex items-center gap-2 font-medium">
                        <MessageCircle className="h-3.5 w-3.5 text-[#A78BFA]" />
                        Chats y grupos
                      </span>
                      <span className="rounded-full bg-[#7C3AED] px-1.5 py-0.5 text-[8.5px] font-bold">
                        3
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-2.5 py-2 text-[10.5px] text-white/90">
                      <span className="flex items-center gap-2 font-medium">
                        <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                        BuddyServices
                      </span>
                      <span className="text-[8.5px] font-semibold text-emerald-300">Activo</span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-2.5 py-2 text-[10.5px] text-white/90">
                      <span className="flex items-center gap-2 font-medium">
                        <Mail className="h-3.5 w-3.5 text-sky-400" />
                        Correo y Agenda
                      </span>
                      <span className="text-[8.5px] text-white/60">Sync</span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-2.5 py-2 text-[10.5px] text-white/90">
                      <span className="flex items-center gap-2 font-medium">
                        <Shield className="h-3.5 w-3.5 text-amber-300" />
                        Seguridad y PIN
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    </div>
                  </div>

                  {/* Mini bottom dock */}
                  <div className="flex items-center justify-around rounded-full border border-white/10 bg-white/[0.06] px-2 py-1.5 text-white/65">
                    <MessageCircle className="h-3 w-3 text-[#C4B5FD]" />
                    <ShoppingBag className="h-3 w-3" />
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white shadow-sm shadow-brand-primary/50">
                      <Bot className="h-3 w-3" />
                    </span>
                    <CalendarDays className="h-3 w-3" />
                    <Shield className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* Bottom summary floating pill */}
              <div className="relative z-10 mt-3 flex items-center justify-between rounded-2xl border border-[#E4D7F5] bg-white/95 px-3.5 py-2 shadow-md shadow-brand-primary/10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-[11px] font-bold text-[#190D33]">BuddyServices</p>
                    <p className="text-[10px] text-[#6B5B8E]">Pedido #204 confirmado</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  En vivo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
