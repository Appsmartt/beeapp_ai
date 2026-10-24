'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadLegalContent } from '@/lib/client/publicAppSettings';

function LegalTextBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) {
    return (
      <div className="text-xs text-neutral-500">
        {title} no está configurado. Un administrador puede publicarlo en Configuración.
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap text-xs text-neutral-700 font-normal leading-relaxed">
      {body}
    </div>
  );
}

export function TermsPanel() {
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadLegalContent()
      .then((content) => setTerms(content.terms))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 select-none">
      <div className="border-b border-neutral-100 pb-2">
        <span className="text-xs font-semibold text-neutral-900 block">Términos y condiciones</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando…
        </div>
      ) : (
        <LegalTextBlock title="Términos" body={terms} />
      )}
    </div>
  );
}

export function PrivacyPanel() {
  const [privacy, setPrivacy] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadLegalContent()
      .then((content) => setPrivacy(content.privacy))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 select-none">
      <div className="border-b border-neutral-100 pb-2">
        <span className="text-xs font-semibold text-neutral-900 block">Política de privacidad</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando…
        </div>
      ) : (
        <LegalTextBlock title="Privacidad" body={privacy} />
      )}
    </div>
  );
}
