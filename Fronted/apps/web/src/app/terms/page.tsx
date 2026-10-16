'use client';

import React, { useEffect, useState } from 'react';
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
    <div style={pageContainerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <button onClick={() => router.back()} style={backButtonStyle} type="button">
            ← Volver
          </button>
          <h1 style={titleStyle}>Términos y condiciones</h1>
        </div>

        <div style={contentStyle}>
          {loading ? (
            <p style={paragraphStyle}>Cargando…</p>
          ) : terms.trim() ? (
            <p style={paragraphStyle}>{terms}</p>
          ) : (
            <p style={paragraphStyle}>Los términos no están publicados todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const pageContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#F8F9FC',
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  padding: '40px',
  maxWidth: '800px',
  width: '100%',
  boxShadow: '0 12px 32px rgba(96, 37, 210, 0.06)',
  border: '1px solid #E9ECEF',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '32px',
  paddingBottom: '16px',
  borderBottom: '1px solid #F1F3F5',
};

const backButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#6025d2',
  fontSize: '15px',
  fontWeight: '400',
  cursor: 'pointer',
  marginRight: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '600',
  color: '#1A1A2E',
  margin: 0,
};

const contentStyle: React.CSSProperties = {
  color: '#495057',
  lineHeight: '1.6',
  fontSize: '15px',
};

const paragraphStyle: React.CSSProperties = {
  marginBottom: '16px',
  whiteSpace: 'pre-line',
};
