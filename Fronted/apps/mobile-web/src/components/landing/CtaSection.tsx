import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CtaSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-neutral-900 rounded-[32px] p-8 sm:p-14 text-center space-y-6 shadow-xl relative overflow-hidden">
          
          {/* Subtle Glow background effect */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight relative z-10">
            Lleva tu negocio al siguiente nivel
          </h2>

          <p className="text-neutral-400 font-normal text-base sm:text-lg max-w-2xl mx-auto relative z-10">
            Únete a BeeApp AI hoy mismo y experimenta el poder de gestionar tu comunicación y ventas con inteligencia artificial.
          </p>

          <div className="pt-4 flex justify-center relative z-10">
            <Link
              href="/register"
              className="px-8 py-4 rounded-full bg-brand-primary text-white text-base font-semibold hover:bg-brand-dark transition-all shadow-lg hover:shadow-brand-primary/30 flex items-center justify-center gap-2 group"
            >
              <span>Crear cuenta gratis</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
