'use client';

import Link from 'next/link';
import {
  ArrowLeft,
} from 'lucide-react';

import { EditProfilePanel } from '@/components/app/EditProfilePanel';

export default function EditProfilePage() {
  return (
    <div className="min-h-full bg-white pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-100 bg-white px-5 py-4">
        <Link
          href="/app"
          className="rounded-full p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100"
          aria-label="Volver a la aplicación"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <h1 className="text-base font-semibold text-neutral-900">
          Editar Perfil
        </h1>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 py-6">
        <EditProfilePanel />
      </main>
    </div>
  );
}