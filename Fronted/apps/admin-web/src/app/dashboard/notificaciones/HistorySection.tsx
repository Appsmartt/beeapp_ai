'use client';

import { useMemo, useState } from 'react';
import { Send, Percent, Clock, Pencil, Ban } from 'lucide-react';
import KpiGrid, { type KpiItem } from '@/components/KpiGrid';
import FilterBar, { type FilterConfig } from '@/components/FilterBar';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import SlidePanel from '@/components/SlidePanel';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBadge from '@/components/StatusBadge';
import type { NotificationCampaign } from '@/mocks/types';
import { formatDate, formatNumber } from '@/utils/format';

const PAGE_SIZE = 6;

const RECIPIENT_SHORT_LABELS: Record<NotificationCampaign['modoDestinatario'], string> = {
  todos: 'Todos',
  segmento: 'Segmento',
  especificos: 'Específicos',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${formatDate(iso)}, ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
}

function segmentSummary(campaign: NotificationCampaign): string {
  if (campaign.modoDestinatario === 'especificos') return `${campaign.usuariosIds?.length ?? 0} usuarios elegidos manualmente`;
  if (campaign.modoDestinatario === 'todos') return 'Todos los usuarios registrados';
  const c = campaign.segmentoCriterios;
  if (!c) return 'Sin criterios';
  const parts: string[] = [];
  if (c.planTier) parts.push(`Plan: ${c.planTier === 'gratuito' ? 'Gratuito' : 'De pago'}`);
  if (c.estado) parts.push(`Estado: ${c.estado === 'activo' ? 'Activo' : 'Inactivo'}`);
  if (c.registroDias) parts.push(`Registrados en los últimos ${c.registroDias} días`);
  if (c.visibilidad) parts.push(`Visibilidad: ${c.visibilidad}`);
  return parts.length > 0 ? parts.join(' · ') : 'Sin filtros adicionales';
}

interface HistorySectionProps {
  notifications: NotificationCampaign[];
  onCancel: (id: string) => void;
  onEdit: (campaign: NotificationCampaign) => void;
}

export default function HistorySection({ notifications, onCancel, onEdit }: HistorySectionProps) {
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [rango, setRango] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<NotificationCampaign | null>(null);
  const [cancelTarget, setCancelTarget] = useState<NotificationCampaign | null>(null);

  const kpis = useMemo(() => {
    const now = new Date();
    const enviadasEsteMes = notifications.filter((n) => {
      const d = new Date(n.fechaEnvio);
      return n.estado === 'enviada' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const conApertura = notifications.filter((n) => n.estado === 'enviada' && n.entregados);
    const tasaPromedio = conApertura.length
      ? conApertura.reduce((sum, n) => sum + (n.abiertos ?? 0) / (n.entregados ?? 1), 0) / conApertura.length
      : 0;
    const programadasPendientes = notifications.filter((n) => n.estado === 'programada').length;
    return { enviadasEsteMes, tasaPromedio, programadasPendientes };
  }, [notifications]);

  const kpiItems: KpiItem[] = [
    { id: 'enviadas', icon: Send, label: 'Enviadas este mes', value: String(kpis.enviadasEsteMes) },
    { id: 'apertura', icon: Percent, label: 'Tasa de apertura promedio', value: `${(kpis.tasaPromedio * 100).toFixed(1)}%` },
    { id: 'programadas', icon: Clock, label: 'Programadas pendientes', value: String(kpis.programadasPendientes) },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'estado',
      label: 'Estado',
      value: estado,
      options: [
        { value: 'enviada', label: 'Enviada' },
        { value: 'programada', label: 'Programada' },
        { value: 'fallida', label: 'Fallida' },
        { value: 'cancelada', label: 'Cancelada' },
      ],
    },
    {
      id: 'rango',
      label: 'Rango de fechas',
      value: rango,
      options: [
        { value: '30', label: 'Últimos 30 días' },
        { value: '90', label: 'Últimos 90 días' },
        { value: '365', label: 'Último año' },
      ],
    },
  ];

  const filtered = useMemo(() => {
    const now = Date.now();
    return notifications.filter((n) => {
      const matchesSearch = n.titulo.toLowerCase().includes(search.toLowerCase()) || n.mensaje.toLowerCase().includes(search.toLowerCase());
      const matchesEstado = !estado || n.estado === estado;
      const matchesRango = !rango || now - new Date(n.fechaEnvio).getTime() <= Number(rango) * 24 * 60 * 60 * 1000;
      return matchesSearch && matchesEstado && matchesRango;
    });
  }, [notifications, search, estado, rango]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: DataTableColumn<NotificationCampaign>[] = [
    { key: 'titulo', header: 'Título', render: (row) => row.titulo },
    { key: 'mensaje', header: 'Mensaje', hideOnMobile: true, render: (row) => (row.mensaje.length > 40 ? `${row.mensaje.slice(0, 40)}…` : row.mensaje) },
    { key: 'tipo', header: 'Destinatarios', render: (row) => RECIPIENT_SHORT_LABELS[row.modoDestinatario] },
    { key: 'cantidad', header: 'Cantidad', align: 'right', render: (row) => formatNumber(row.cantidadDestinatarios) },
    { key: 'fecha', header: 'Fecha', hideOnMobile: true, render: (row) => <span suppressHydrationWarning>{formatDateTime(row.fechaEnvio)}</span> },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
  ];

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <span className="panel-card-title">Resumen del mes</span>
      </div>
      <KpiGrid items={kpiItems} />

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Buscar por título o mensaje..."
        filters={filters}
        onFilterChange={(id, value) => {
          setPage(1);
          if (id === 'estado') setEstado(value);
          if (id === 'rango') setRango(value);
        }}
      />

      <DataTable
        columns={columns}
        data={paginated}
        keyExtractor={(row) => row.id}
        onRowClick={setSelected}
        emptyMessage="No se encontraron envíos con estos filtros."
      />

      <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title="Detalle del envío">
        {selected && (
          <>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-row-label">Estado</span>
                <span className="detail-row-value"><StatusBadge status={selected.estado} /></span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Título</span>
                <span className="detail-row-value">{selected.titulo}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Mensaje</span>
                <span className="detail-row-value">{selected.mensaje}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Destinatarios</span>
                <span className="detail-row-value">{segmentSummary(selected)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Cantidad</span>
                <span className="detail-row-value">{formatNumber(selected.cantidadDestinatarios)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Fecha y hora</span>
                <span className="detail-row-value" suppressHydrationWarning>{formatDateTime(selected.fechaEnvio)}</span>
              </div>
              {selected.estado === 'enviada' && (
                <>
                  <div className="detail-row">
                    <span className="detail-row-label">Entregados</span>
                    <span className="detail-row-value">{formatNumber(selected.entregados ?? 0)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Abiertos</span>
                    <span className="detail-row-value">
                      {formatNumber(selected.abiertos ?? 0)} ({(((selected.abiertos ?? 0) / (selected.entregados || 1)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </>
              )}
            </div>

            {selected.estado === 'programada' && (
              <div className="slide-panel-actions">
                <button className="confirm-dialog-btn-cancel" onClick={() => { onEdit(selected); setSelected(null); }}>
                  <Pencil size={14} />
                  <span>Editar</span>
                </button>
                <button className="confirm-dialog-btn-confirm danger" onClick={() => setCancelTarget(selected)}>
                  <Ban size={14} />
                  <span>Cancelar envío</span>
                </button>
              </div>
            )}
          </>
        )}
      </SlidePanel>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancelar envío programado"
        description={`¿Seguro que quieres cancelar "${cancelTarget?.titulo}"? Los usuarios no recibirán esta notificación.`}
        tone="danger"
        confirmLabel="Sí, cancelar"
        cancelLabel="Volver"
        onConfirm={() => {
          if (cancelTarget) onCancel(cancelTarget.id);
          setCancelTarget(null);
          setSelected(null);
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
