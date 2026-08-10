import Link from 'next/link';
import { ArrowRight, MessageCircle, ShoppingBag, Bot, Shield, Sparkles } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="bg-white py-16 lg:py-24 overflow-hidden border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Text & CTA */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plataforma Todo-en-Uno con IA</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight leading-[1.15]">
              Tu negocio, conectado e inteligente
            </h1>

            <p className="text-lg sm:text-xl text-neutral-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Comunicación, productividad y ventas en una sola plataforma con inteligencia artificial integrada.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-primary text-white text-base font-semibold hover:bg-brand-dark transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
              >
                <span>Comenzar ahora</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right Column: App Phone Preview Mockup */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[340px] bg-neutral-900 p-3 rounded-[36px] shadow-2xl border-4 border-neutral-800">
              {/* Device Notch/Island */}
              <div className="w-28 h-4 bg-neutral-800 rounded-full mx-auto mb-3"></div>

              {/* Mock Screen Content */}
              <div className="bg-white rounded-[24px] overflow-hidden p-4 space-y-4 text-left border border-neutral-100">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-neutral-900">BeeApp AI</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-semantic-success"></div>
                </div>

                {/* Module chips */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
                  <span className="px-2.5 py-1 rounded-full bg-brand-primary text-white font-medium flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> Chat
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 font-normal flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> Servicios
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 font-normal flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Seguridad
                  </span>
                </div>

                {/* Simulated Feed items */}
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-neutral-900">
                      <span>Asistente IA</span>
                      <span className="text-[9px] text-neutral-400 font-normal">10:42 AM</span>
                    </div>
                    <p className="text-[10px] text-neutral-600 font-normal leading-snug">
                      Respondiendo solicitudes de clientes de forma automática...
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-neutral-900">
                      <span>BeeServices</span>
                      <span className="text-[9px] text-neutral-400 font-normal">Hace 5m</span>
                    </div>
                    <p className="text-[10px] text-neutral-600 font-normal leading-snug">
                      Nuevo catálogo de productos publicado con éxito.
                    </p>
                  </div>
                </div>

                {/* Bottom status bar mock */}
                <div className="pt-2 border-t border-neutral-100 text-center">
                  <span className="text-[10px] text-brand-primary font-medium">Vista previa de la app</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
