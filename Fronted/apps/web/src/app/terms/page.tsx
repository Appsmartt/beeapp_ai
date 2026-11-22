'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadLegalContent } from '@/lib/client/publicAppSettings';

export default function TermsPage() {
  const router = useRouter();
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadLegalContent()
      .then((content) => setTerms(content.terms))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-dvh justify-center bg-[#F8F9FC] px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-[800px] rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-[0_12px_32px_rgba(96,37,210,0.06)] sm:rounded-3xl sm:p-10">
        <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-[#F1F3F5] pb-4 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[#6025d2] transition-colors hover:bg-[#6025d2]/10"
            type="button"
          >
            ← Volver
          </button>
          <h1 className="min-w-0 text-lg font-semibold text-[#1A1A2E] sm:text-[22px]">
            Términos y condiciones
          </h1>
        </div>

        <div className="text-sm leading-relaxed text-[#495057] sm:text-[15px]">
          {loading ? (
            <p className="mb-4">Cargando…</p>
          ) : terms.trim() ? (
            <p className="mb-4 whitespace-pre-line break-words [overflow-wrap:anywhere]">{terms}</p>
          ) : (
            <p className="mb-4">Los términos no están publicados todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}
