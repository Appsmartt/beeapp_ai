import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface ProfileSectionPageProps {
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}

export function ProfileSectionPage({
  title,
  description,
  children,
  wide = false,
}: ProfileSectionPageProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#F3EEF8] pb-16">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#E4D8F2] bg-[#EFE8F8]/95 px-5 py-4 backdrop-blur">
        <Link
          href="/app"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4D8F2] bg-white text-neutral-700 transition-colors hover:bg-[#F7F2FC]"
          aria-label="Volver a la aplicación"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="min-w-0">
          <h1 className="text-base font-semibold text-neutral-900">{title}</h1>
          <p className="text-xs text-[#6B5B8A]">{description}</p>
        </div>
      </header>

      <main className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {children}
      </main>
    </div>
  );
}
