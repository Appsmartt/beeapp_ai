'use client';

import { useEffect, useState } from 'react';
import { listAdminAudit, type AdminAuditEntry } from '@beeapp/api-client';
import { formatDate } from '@/lib/admin/format';

export default function AuditoriaPage() {
  const [rows, setRows] = useState<AdminAuditEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listAdminAudit(120)
      .then(setRows)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible leer la auditoría.');
      });
  }, []);

  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="panel-card-title">Registro de actividad</span>
      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
      {rows.map((entry) => (
        <div key={entry.id} className="feature-edit-row">
          <span className="feature-edit-text">
            {formatDate(entry.createdAt)} · {entry.actor} · {entry.entity} · {entry.action}
            {entry.payload && Object.keys(entry.payload).length > 0 ? ` · ${JSON.stringify(entry.payload)}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
