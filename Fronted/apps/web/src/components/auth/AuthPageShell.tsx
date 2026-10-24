import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import BuddyLogo from '@/components/shared/BuddyLogo';

type AuthMode = 'login' | 'register';

interface AuthPageShellProps {
  mode: AuthMode;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

const ASIDE_COPY: Record<
  AuthMode,
  { badge: string; heading: string; body: string; bullets: string[] }
> = {
  login: {
    badge: 'Plataforma Todo-en-Uno con IA',
    heading: 'Tu negocio, conectado e inteligente',
    body: 'Comunicación, productividad y ventas en una sola plataforma. Un solo acceso para cliente y administración.',
    bullets: [
      'Chat, agenda, correo y almacenamiento en la nube',
      'BuddyServices para publicar tu negocio',
      'Redirección automática según tu rol',
    ],
  },
  register: {
    badge: 'Empieza en minutos',
    heading: 'Crea tu cuenta Buddy AI',
    body: 'Regístrate con correo y contraseña. Tu perfil queda listo para usar la app web al instante.',
    bullets: [
      'Perfil personal con teléfono verificable',
      'Acceso seguro con Supabase',
      'Sin configuraciones técnicas iniciales',
    ],
  },
};

export default function AuthPageShell({
  mode,
  title,
  subtitle,
  children,
  footer,
}: AuthPageShellProps) {
  const aside = ASIDE_COPY[mode];
  const alternateHref = mode === 'login' ? '/register' : '/login';
  const alternateLabel = mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión';

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-brand-primary/20">
      <LandingNavbar />

      <main className="border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Aside — mismo tono que Hero / Features */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aside.badge}</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight leading-tight">
                  {aside.heading}
                </h1>
                <p className="text-neutral-600 text-base leading-relaxed max-w-md">
                  {aside.body}
                </p>
              </div>

              <ul className="space-y-3">
                {aside.bullets.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-neutral-600"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Vista previa estilo mock del Hero — solo decorativa */}
              <div className="hidden sm:block max-w-sm pt-2">
                <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-3 shadow-sm">
                  <div className="rounded-[20px] bg-white border border-neutral-100 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <BuddyLogo height={28} showText={false} />
                      <span className="text-xs font-semibold text-neutral-900">Buddy AI</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      {mode === 'login'
                        ? 'Ingresa y continúa donde lo dejaste: chats, agenda y tu panel.'
                        : 'Completa el formulario y entra a tu espacio de trabajo.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form card */}
            <div className="lg:col-span-7 w-full max-w-xl lg:max-w-none lg:ml-auto">
              <div className="motion-content-enter rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5 shadow-sm">
                <div className="mb-3 space-y-0.5">
                  <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                    {title}
                  </h2>
                  <p className="text-xs text-neutral-600 leading-snug">{subtitle}</p>
                </div>

                {children}

                {footer}

                <p className="mt-3 pt-3 border-t border-neutral-100 text-center text-xs text-neutral-600">
                  {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                  <Link
                    href={alternateHref}
                    className="font-semibold text-brand-primary hover:text-brand-dark transition-colors"
                  >
                    {alternateLabel}
                  </Link>
                </p>
              </div>

              <p className="mt-4 text-center">
                <Link
                  href="/"
                  className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  ← Volver al inicio
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
