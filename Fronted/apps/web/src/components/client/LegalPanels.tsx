'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Clock, FileText, Loader2, Scale, ScrollText, Shield } from 'lucide-react';
import { loadLegalContent } from '@/lib/client/publicAppSettings';

type LegalKind = 'terms' | 'privacy';

interface LegalSection {
  heading: string | null;
  body: string;
}

function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Divide bloques de texto plano en secciones legibles (títulos cortos o numerados). */
function parseLegalSections(raw: string): LegalSection[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const blocks = trimmed.split(/\n{2,}/);
  const sections: LegalSection[] = [];
  let preamble = '';

  for (const block of blocks) {
    const line = block.trim();
    const singleLine = !line.includes('\n');
    const numbered = /^\d+[\.\)]\s+/.test(line);
    const shortTitle =
      singleLine &&
      line.length <= 100 &&
      (numbered || line.endsWith(':') || (line === line.toUpperCase() && /[A-ZÁÉÍÓÚ]/.test(line)));

    if (shortTitle) {
      if (preamble) {
        sections.push({ heading: null, body: preamble });
        preamble = '';
      }
      const heading = line.replace(/:$/, '');
      sections.push({ heading, body: '' });
    } else if (sections.length > 0 && sections[sections.length - 1].heading && !sections[sections.length - 1].body) {
      sections[sections.length - 1].body = line;
    } else if (sections.length === 0 && !preamble) {
      preamble = line;
    } else {
      sections.push({ heading: null, body: line });
    }
  }

  if (preamble) {
    sections.unshift({ heading: null, body: preamble });
  }

  if (sections.length === 0) {
    return [{ heading: null, body: trimmed }];
  }

  return sections.filter((s) => s.heading || s.body.trim());
}

function LegalDocumentBody({ body }: { body: string }) {
  const sections = useMemo(() => parseLegalSections(body), [body]);

  if (sections.length <= 1 && !sections[0]?.heading) {
    return (
      <div className="select-text text-[15px] font-normal leading-[1.75] tracking-[0.01em] text-[#3D3350] sm:text-base sm:leading-8">
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{body.trim()}</p>
      </div>
    );
  }

  return (
    <article className="select-text space-y-6">
      {sections.map((section, index) => (
        <section key={`${section.heading ?? 'block'}-${index}`} className="scroll-mt-28">
          {section.heading ? (
            <h3
              id={section.heading.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}
              className="mb-3 text-base font-extrabold text-[#261743] sm:text-lg"
            >
              {section.heading}
            </h3>
          ) : null}
          {section.body.trim() ? (
            <p className="whitespace-pre-wrap text-[15px] font-normal leading-[1.75] tracking-[0.01em] text-[#3D3350] sm:text-base sm:leading-8 [overflow-wrap:anywhere]">
              {section.body.trim()}
            </p>
          ) : null}
        </section>
      ))}
    </article>
  );
}

function LegalDocumentPanel({
  kind,
  body,
  loading,
  error,
}: {
  kind: LegalKind;
  body: string;
  loading: boolean;
  error: string;
}) {
  const isTerms = kind === 'terms';
  const HeroIcon = isTerms ? Scale : Shield;
  const DocIcon = isTerms ? FileText : ScrollText;
  const title = isTerms ? 'Documento de uso' : 'Tratamiento de datos';
  const blurb = isTerms
    ? 'Condiciones que aplican al usar Buddy en web y móvil. Puedes seleccionar y copiar el texto.'
    : 'Información sobre cómo recopilamos, usamos y protegemos tus datos personales.';
  const otherHref = isTerms ? '/app/profile/privacy' : '/app/profile/terms';
  const otherLabel = isTerms ? 'Ver política de privacidad' : 'Ver términos y condiciones';
  const hasContent = body.trim().length > 0;
  const readingMinutes = hasContent ? estimateReadingMinutes(body) : 0;
  const sections = useMemo(() => (hasContent ? parseLegalSections(body) : []), [body, hasContent]);
  const tocItems = sections.filter((s) => s.heading);

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-2xl border border-[#E8D1F1] bg-gradient-to-r from-[#FAF4FF] via-[#FFFCF9] to-white p-4 shadow-sm sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7427D5] shadow-sm">
          <HeroIcon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-[#261743]">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#786593] sm:text-sm">{blurb}</p>
        </div>
        {hasContent && !loading ? (
          <div className="hidden shrink-0 flex-col items-end sm:flex">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#7427D5]">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {readingMinutes} min
            </span>
            <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">Lectura</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:items-start">
        <aside className="order-2 space-y-3 lg:sticky lg:top-24 lg:order-1">
          <nav className="rounded-2xl border border-[#E7DDF2] bg-white p-4 shadow-[0_10px_30px_rgba(116,39,213,0.06)] sm:p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8A72B2]">En esta página</p>
            {loading ? (
              <p className="mt-2 text-xs text-[#786593]">Cargando…</p>
            ) : hasContent && tocItems.length > 1 ? (
              <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pr-1 text-xs lg:max-h-[min(50vh,420px)]">
                {tocItems.map((item) => {
                  const id = item.heading!
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]/g, '');
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="block rounded-lg px-2 py-1.5 font-semibold text-[#5E506B] transition hover:bg-[#FAF4FF] hover:text-[#7427D5]"
                      >
                        {item.heading}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-[#786593]">
                {hasContent
                  ? 'Desplázate hacia abajo para leer el documento completo.'
                  : 'Cuando el equipo publique el texto, aparecerá aquí con formato legible.'}
              </p>
            )}
            <Link
              href={otherHref}
              className="mt-4 flex h-10 items-center justify-center rounded-xl border border-[#E7DDF2] bg-[#FFFCF9] px-3 text-xs font-extrabold text-[#7427D5] transition hover:border-[#C9A8E8] hover:bg-[#FAF4FF]"
            >
              {otherLabel}
            </Link>
          </nav>
        </aside>

        <section className="order-1 overflow-hidden rounded-2xl border border-[#E7DDF2] bg-white shadow-[0_10px_30px_rgba(116,39,213,0.06)] lg:order-2">
          <div className="flex items-center gap-2 border-b border-[#F1EAF6] bg-gradient-to-r from-[#FFFCF9] to-[#FAF4FF] px-4 py-4 sm:px-6">
            <DocIcon className="h-5 w-5 shrink-0 text-[#7427D5]" aria-hidden />
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-[#261743] sm:text-base">
                {isTerms ? 'Términos y condiciones' : 'Política de privacidad'}
              </h3>
              {hasContent && !loading ? (
                <p className="mt-0.5 text-xs text-[#786593]">Última versión publicada en la plataforma</p>
              ) : null}
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#E7DDF2] py-16 text-sm text-[#786593]">
                <Loader2 className="h-5 w-5 animate-spin text-[#7427D5]" />
                Cargando documento…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : !hasContent ? (
              <div className="rounded-2xl border border-dashed border-[#E7DDF2] bg-[#FFFCF9] px-5 py-12 text-center sm:py-16">
                <FileText className="mx-auto h-9 w-9 text-[#B8A5D6]" aria-hidden />
                <p className="mt-4 text-base font-extrabold text-[#261743]">Contenido en preparación</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#786593]">
                  El texto legal aún no está publicado. Un administrador puede configurarlo en el panel de configuración.
                </p>
              </div>
            ) : (
              <div className="max-w-none lg:max-w-[65ch]">
                <LegalDocumentBody body={body} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function TermsPanel() {
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadLegalContent({ fresh: true })
      .then((content) => setTerms(content.terms ?? ''))
      .catch((loadError) => {
        setTerms('');
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los términos.');
      })
      .finally(() => setLoading(false));
  }, []);

  return <LegalDocumentPanel kind="terms" body={terms} loading={loading} error={error} />;
}

export function PrivacyPanel() {
  const [privacy, setPrivacy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadLegalContent({ fresh: true })
      .then((content) => setPrivacy(content.privacy ?? ''))
      .catch((loadError) => {
        setPrivacy('');
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la política.');
      })
      .finally(() => setLoading(false));
  }, []);

  return <LegalDocumentPanel kind="privacy" body={privacy} loading={loading} error={error} />;
}
