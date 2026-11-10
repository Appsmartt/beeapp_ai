'use client';

import { useState } from 'react';
import { getAdminCostReport, listAdminTransactions, listAdminUsers } from '@beeapp/api-client';
import { downloadCsv } from '@/lib/admin/csv';
import { toAdminUser, toTransaction } from '@/lib/admin/mapRecords';

async function allPages<T>(load: (page: number) => Promise<{ items: T[]; total: number }>) {
  const items: T[] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await load(page);
    total = result.total;
    items.push(...result.items);
    page += 1;
  } while (items.length < total && page < 20);
  return items;
}

export default function ReportesPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const run = async (kind: 'usuarios' | 'pagos' | 'costos') => {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'usuarios') {
        const rows = await allPages((page) => listAdminUsers({ page, pageSize: 100 }));
        downloadCsv('usuarios.csv', rows.map(toAdminUser).map((user) => ({
          nombre: user.nombreCompleto,
          correo: user.email,
          estado: user.estado,
          plan: user.planId,
          registro: user.fechaRegistro,
        })));
      }
      if (kind === 'pagos') {
        const rows = await allPages((page) => listAdminTransactions({ page, pageSize: 100 }));
        downloadCsv('pagos.csv', rows.map(toTransaction).map((payment) => ({
          usuario: payment.usuarioNombre,
          plan: payment.planId,
          tipo: payment.tipo,
          estado: payment.estado,
          monto: payment.monto,
          fecha: payment.fecha,
        })));
      }
      if (kind === 'costos') {
        const report = await getAdminCostReport();
        downloadCsv('costos.csv', report.plans.map((plan) => ({
          plan: plan.planId,
          usuariosActivos: plan.activeUsers,
          costoIa: plan.aiCost,
          costoLlamadas: plan.callCost,
          costoAlmacenamiento: plan.storageCost,
          costoTotal: plan.totalCost,
          costoPorUsuario: plan.costPerActiveUser,
        })));
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el archivo.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span className="panel-card-title">Descargas</span>
      <p className="form-hint">Los archivos son CSV con punto y coma. Excel los abre directo.</p>
      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
      <button className="confirm-dialog-btn-confirm" type="button" disabled={busy !== ''} onClick={() => void run('usuarios')}>
        {busy === 'usuarios' ? 'Preparando…' : 'Usuarios'}
      </button>
      <button className="confirm-dialog-btn-confirm" type="button" disabled={busy !== ''} onClick={() => void run('pagos')}>
        {busy === 'pagos' ? 'Preparando…' : 'Pagos'}
      </button>
      <button className="confirm-dialog-btn-confirm" type="button" disabled={busy !== ''} onClick={() => void run('costos')}>
        {busy === 'costos' ? 'Preparando…' : 'Costos'}
      </button>
    </div>
  );
}
