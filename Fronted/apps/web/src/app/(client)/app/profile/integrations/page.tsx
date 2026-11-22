import Link from 'next/link';
import {
  ArrowLeft,
} from 'lucide-react';

import {
  IntegrationsPanel,
} from '@/components/client/IntegrationsPanel';

export default function IntegrationsPage() {
  return (
    <div className="h-full overflow-y-auto bg-white pb-28">
      <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
          <Link
            href="/app"
            aria-label="Volver a la aplicación"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 sm:h-9 sm:w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-neutral-900 sm:text-lg">
              Integraciones externas
            </h1>

            <p className="mt-0.5 text-xs text-neutral-500">
              Gestiona tus cuentas y autorizaciones conectadas.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-7">
        <IntegrationsPanel />
      </main>
    </div>
  );
}