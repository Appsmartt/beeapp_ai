import Link from 'next/link';
import BuddyLogo from '@/components/shared/BuddyLogo';

export default function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-white/10 bg-[#110824] py-14 text-[#B9ABD6]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-10 md:grid-cols-12">
          {/* Brand */}
          <div className="space-y-3 md:col-span-5">
            <Link href="/" className="inline-flex items-center">
              <BuddyLogo height={32} inverted />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-[#A596C6]">
              Comunicación, productividad, comercio con BuddyServices y asistente de inteligencia artificial en una sola plataforma.
            </p>
          </div>

          {/* Plataforma links */}
          <div className="space-y-3 md:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Plataforma
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="transition-colors hover:text-white">
                  Características
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="transition-colors hover:text-white">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="#security" className="transition-colors hover:text-white">
                  Seguridad
                </a>
              </li>
            </ul>
          </div>

          {/* Cuenta & Legal */}
          <div className="space-y-3 md:col-span-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Acceso y legal
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/register" className="transition-colors hover:text-white">
                  Crear cuenta
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-white">
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-white">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-white">
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-8 text-xs text-[#8C7DAE] sm:flex-row">
          <p>© 2026 Buddy AI. Todos los derechos reservados.</p>
          <p>Web y aplicación móvil sincronizadas</p>
        </div>
      </div>
    </footer>
  );
}
