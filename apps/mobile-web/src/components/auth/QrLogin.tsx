'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft } from 'lucide-react';
import BeeAppLogo from '@/components/BeeAppLogo';

/** Sesión mock que codifica el QR: la reemplazará el token real del backend */
const MOCK_SESSION = 'beeapp-web-session-abc123';

const STEPS = [
  'Abre BeeApp AI en tu teléfono',
  'Ve a Menú > Dispositivos',
  'Escanea el código QR',
];

/** Único método de inicio de sesión de la web: escanear el QR desde la app móvil */
export default function QrLogin() {
  const router = useRouter();

  return (
    <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl sm:border sm:border-neutral-200/80 sm:shadow-xl space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col items-center text-center space-y-3">
        <Link href="/" className="mb-1">
          <BeeAppLogo height={52} />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
          Inicia sesión en BeeApp Web
        </h1>
        <p className="text-sm text-neutral-600 font-normal max-w-xs">
          Escanea el código QR desde la app de BeeApp AI en tu teléfono para iniciar sesión.
        </p>
      </div>

      {/* Código QR */}
      <div className="flex justify-center">
        <div className="rounded-2xl border border-neutral-200 p-4 bg-white">
          <QRCodeSVG value={MOCK_SESSION} size={218} level="M" marginSize={0} />
        </div>
      </div>

      {/* Botón de prueba: desaparece cuando exista backend real */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => router.push('/app')}
          className="h-9 px-4 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-normal hover:bg-neutral-200/70 transition-colors"
        >
          Simular escaneo
        </button>
      </div>

      {/* Instrucciones */}
      <ol className="space-y-2">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-2.5 text-xs text-neutral-500 font-normal">
            <span className="shrink-0 w-4 h-4 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-normal flex items-center justify-center mt-px">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {/* Navegación */}
      <div className="text-center pt-4 border-t border-neutral-100">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-normal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
      </div>
    </div>
  );
}
