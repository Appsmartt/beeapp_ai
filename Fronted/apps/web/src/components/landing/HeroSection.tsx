'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, MessageCircle, ShoppingBag, Bot, Shield, Sparkles } from 'lucide-react';
import { loadLandingHero } from '@/lib/client/publicAppSettings';

export default function HeroSection() {
  const [badge, setBadge] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  useEffect(() => {
    void loadLandingHero().then((hero) => {
      if (!hero) return;
      setBadge(hero.badge);
      setTitle(hero.title);
      setSubtitle(hero.subtitle);
    });
  }, []);

  return (
    <section className="bg-white py-16 lg:py-24 overflow-hidden border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {badge ? (
              <div className="motion-page-enter inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{badge}</span>
              </div>
            ) : null}

            <h1 className="motion-page-enter motion-delay-1 text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight leading-[1.15]">
              {title || 'Cargando…'}
            </h1>

            {subtitle ? (
              <p className="motion-page-enter motion-delay-2 text-lg sm:text-xl text-neutral-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {subtitle}
              </p>
            ) : null}

            <div className="motion-page-enter motion-delay-3 pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-primary text-white text-base font-semibold hover:bg-brand-dark transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
              >
                <span>Comenzar ahora</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[340px] bg-neutral-900 p-3 rounded-[36px] shadow-2xl border-4 border-neutral-800">
              <div className="w-28 h-4 bg-neutral-800 rounded-full mx-auto mb-3" />

              <div className="bg-neutral-950 rounded-[28px] overflow-hidden aspect-[9/19] p-4 space-y-4">
                <div className="flex items-center justify-between text-white/80 text-[10px]">
                  <span>Buddy AI</span>
                  <span>9:41</span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-2xl bg-brand-primary/20 p-3 flex items-center gap-2 text-white text-xs">
                    <MessageCircle className="w-4 h-4 text-brand-primary" />
                    <span>Chats y comunidades</span>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3 flex items-center gap-2 text-white/90 text-xs">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span>BeeServices</span>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3 flex items-center gap-2 text-white/90 text-xs">
                    <Bot className="w-4 h-4 text-sky-400" />
                    <span>Asistente IA</span>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3 flex items-center gap-2 text-white/90 text-xs">
                    <Shield className="w-4 h-4 text-amber-300" />
                    <span>Seguridad y PIN</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
