'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export function CommercialShell({
  title,
  description,
  backHref,
  children,
  wide = false,
  compact = false,
}: {
  title: string;
  description?: string;
  backHref: string;
  children: ReactNode;
  wide?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="h-full overflow-y-auto bg-[#F7F4FB]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#E7DDF2] bg-[#F7F4FB]/95 px-4 py-4 backdrop-blur sm:px-6">
        <Link
          href={backHref}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8D1F1] bg-white text-[#5E1ABF]"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-[#261743]">{title}</h1>
          {description ? (
            <p className="truncate text-xs text-[#8A72B2]">{description}</p>
          ) : null}
        </div>
      </header>
      <main
        className={`mx-auto w-full px-4 sm:px-6 ${compact ? 'py-3 sm:py-4' : 'py-6'} ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}
      >
        {children}
      </main>
    </div>
  );
}

export function moneyCop(amount: number | null | undefined): string {
  if (amount == null) return 'A convenir';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function actionError(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible completar la acción.';
}

export const fieldClass =
  'mt-1 w-full rounded-xl border border-[#E8D1F1] bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#7427D5]';

export const primaryButtonClass =
  'inline-flex h-10 items-center justify-center rounded-xl bg-[#7427D5] px-4 text-sm font-semibold text-white hover:bg-[#5E1ABF] disabled:opacity-50';

export const secondaryButtonClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-[#E8D1F1] bg-white px-4 text-sm font-medium text-[#5E1ABF] hover:bg-[#F6EAFE]';
