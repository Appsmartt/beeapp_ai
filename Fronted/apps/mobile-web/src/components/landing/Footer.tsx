import Link from 'next/link';
import BeeAppLogo from '@/components/BeeAppLogo';

export default function Footer() {
  return (
    <footer id="contact" className="bg-neutral-900 text-neutral-400 py-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-neutral-800">
          
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <BeeAppLogo height={32} inverted />
          </Link>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm font-normal text-neutral-400">
            <a href="#" className="hover:text-white transition-colors">
              Términos y Condiciones
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Política de Privacidad
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Contacto
            </a>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 text-center text-xs font-normal text-neutral-500">
          © 2026 BeeApp AI. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
