import Link from 'next/link';
import {
  ArrowLeft,
} from 'lucide-react';

import {
  IntegrationsPanel,
} from '@/components/app/IntegrationsPanel';

export default function IntegrationsPage() {
  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-3">
          <Link
            href="/app"
            aria-label="Volver a la aplicación"
            className="w-9 h-9 rounded-xl text-neutral-600 flex items-center justify-center hover:bg-neutral-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <h1 className="text-lg font-bold text-neutral-900">
              Integraciones externas
            </h1>

            <p className="mt-0.5 text-xs text-neutral-500">
              Gestiona tus cuentas y autorizaciones conectadas.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-7">
        <IntegrationsPanel />
      </main>
    </div>
  );
}