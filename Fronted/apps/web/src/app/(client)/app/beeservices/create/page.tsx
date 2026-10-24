'use client';

import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import CreateBusinessForm from '@/components/client/beeservices/CreateBusinessForm';

export default function CreateBusinessPage() {
  return (
    <div className="min-h-full bg-[#FFFCF9] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#F0EAF3] bg-[#FFFCF9]/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-5 py-4">
          <Link
            href="/app/beeservices/my-businesses"
            className="rounded-full p-1.5 text-[#7865AD] transition-colors hover:bg-[#F6EAFE] hover:text-[#7427D5]"
            aria-label="Volver a mis negocios"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex min-w-0 items-center gap-2">
            <Store className="h-5 w-5 shrink-0 text-brand-primary" />
            <h1 className="truncate text-base font-semibold text-[#261743]">
              Crear Nuevo Negocio
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 py-6">
        <p className="mb-6 text-sm leading-relaxed text-[#8A72B2]">
          Completa la información de tu negocio para publicar productos y
          servicios en la red Buddy.
        </p>

        <CreateBusinessForm />
      </main>
    </div>
  );
}
