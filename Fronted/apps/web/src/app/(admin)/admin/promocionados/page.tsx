'use client';

import { useEffect, useState } from 'react';
import { listAdminPromotedOffers, setAdminOfferPromotion, type AdminPromotedOffer } from '@beeapp/api-client';

const LABELS: Record<string, string> = {
  none: 'Sin solicitud',
  pending: 'Pendiente',
  approved: 'Aprobada',
  paused: 'Pausada',
};

export default function PromocionadosPage() {
  const [rows, setRows] = useState<AdminPromotedOffer[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    listAdminPromotedOffers()
      .then(setRows)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las promociones.');
      });
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, status: string) => {
    setError('');
    void setAdminOfferPromotion(id, status).then(load).catch((actionError: unknown) => {
      setError(actionError instanceof Error ? actionError.message : 'No se pudo actualizar la promoción.');
    });
  };

  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span className="panel-card-title">Espacios promocionados</span>
      <p className="form-hint">Las solicitudes asociadas a la oferta sirven como medida de rendimiento.</p>
      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
      {rows.length === 0 ? <p className="form-hint">No hay ofertas con una promoción pendiente, aprobada o pausada.</p> : null}
      {rows.map((offer) => (
        <div key={offer.id} className="feature-edit-row">
          <span className="feature-edit-text">
            {offer.title} · {offer.businessName} · {LABELS[offer.promotionStatus] || offer.promotionStatus} · {offer.requests} solicitudes
          </span>
          <button type="button" onClick={() => update(offer.id, 'approved')}>Aprobar</button>
          <button type="button" onClick={() => update(offer.id, 'paused')}>Pausar</button>
        </div>
      ))}
    </div>
  );
}
