'use client';

import { useEffect, useState } from 'react';
import {
  getAdminModerationQueue,
  hideAdminStatus,
  setAdminBusinessPublication,
  setAdminOfferVisibility,
  setAdminReportStatus,
} from '@beeapp/api-client';

type Queue = Awaited<ReturnType<typeof getAdminModerationQueue>>;

export default function ModeracionPage() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    getAdminModerationQueue()
      .then(setQueue)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la cola.');
      });
  };

  useEffect(() => {
    load();
  }, []);

  const act = (work: Promise<unknown>) => {
    setError('');
    void work.then(load).catch((actionError: unknown) => {
      setError(actionError instanceof Error ? actionError.message : 'No se pudo completar la acción.');
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="form-hint">Se puede ocultar o pausar. Esta pantalla no abre chats, correos ni archivos.</p>
      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
      <section className="panel-card">
        <span className="panel-card-title">Reportes</span>
        {(queue?.reports || []).map((report) => (
          <div key={String(report.id)} className="feature-edit-row">
            <span className="feature-edit-text">{String(report.reason || 'Reporte')} · {String(report.status || '')}</span>
            <button type="button" onClick={() => act(setAdminReportStatus(String(report.id), 'revisado'))}>Revisado</button>
            <button type="button" onClick={() => act(setAdminReportStatus(String(report.id), 'descartado'))}>Descartar</button>
          </div>
        ))}
      </section>
      <section className="panel-card">
        <span className="panel-card-title">Estados</span>
        {(queue?.statuses || []).map((status) => (
          <div key={String(status.id)} className="feature-edit-row">
            <span className="feature-edit-text">{String(status.author || '')}: {String(status.body || '')}</span>
            {status.archived ? <span>Oculto</span> : (
              <button type="button" onClick={() => act(hideAdminStatus(String(status.id)))}>Ocultar</button>
            )}
          </div>
        ))}
      </section>
      <section className="panel-card">
        <span className="panel-card-title">Perfiles comerciales</span>
        {(queue?.businesses || []).map((business) => (
          <div key={String(business.id)} className="feature-edit-row">
            <span className="feature-edit-text">{String(business.name || '')} · {String(business.publicationStatus || '')}</span>
            <button type="button" onClick={() => act(setAdminBusinessPublication(String(business.id), 'paused'))}>Pausar</button>
            <button type="button" onClick={() => act(setAdminBusinessPublication(String(business.id), 'published'))}>Publicar</button>
          </div>
        ))}
      </section>
      <section className="panel-card">
        <span className="panel-card-title">Ofertas</span>
        {(queue?.offers || []).map((offer) => (
          <div key={String(offer.id)} className="feature-edit-row">
            <span className="feature-edit-text">{String(offer.title || '')} · {String(offer.businessName || '')} · {String(offer.status || '')}</span>
            <button type="button" onClick={() => act(setAdminOfferVisibility(String(offer.id), 'paused'))}>Pausar</button>
            <button type="button" onClick={() => act(setAdminOfferVisibility(String(offer.id), 'published'))}>Publicar</button>
          </div>
        ))}
      </section>
    </div>
  );
}
