type KnownStatus =
  | 'activo'
  | 'inactivo'
  | 'suspendido'
  | 'pendiente'
  | 'bloqueado'
  | 'pagado'
  | 'fallido'
  | 'reembolsado'
  | 'enviada'
  | 'programada'
  | 'fallida'
  | 'cancelada'
  | 'verificado'
  | 'no_solicitado'
  | 'revisado'
  | 'descartado';

const STATUS_CONFIG: Record<KnownStatus, { label: string; className: string }> = {
  activo: { label: 'Activo', className: 'status-badge-success' },
  pagado: { label: 'Pagado', className: 'status-badge-success' },
  enviada: { label: 'Enviada', className: 'status-badge-success' },
  verificado: { label: 'Verificado', className: 'status-badge-success' },
  revisado: { label: 'Revisado', className: 'status-badge-success' },
  inactivo: { label: 'Inactivo', className: 'status-badge-neutral' },
  cancelada: { label: 'Cancelada', className: 'status-badge-neutral' },
  no_solicitado: { label: 'No solicitado', className: 'status-badge-neutral' },
  descartado: { label: 'Descartado', className: 'status-badge-neutral' },
  pendiente: { label: 'Pendiente', className: 'status-badge-warning' },
  programada: { label: 'Programada', className: 'status-badge-info' },
  reembolsado: { label: 'Reembolsado', className: 'status-badge-info' },
  suspendido: { label: 'Suspendido', className: 'status-badge-error' },
  bloqueado: { label: 'Bloqueado', className: 'status-badge-error' },
  fallido: { label: 'Fallido', className: 'status-badge-error' },
  fallida: { label: 'Fallida', className: 'status-badge-error' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as KnownStatus] ?? { label: status, className: 'status-badge-neutral' };

  return (
    <span className={`status-badge ${config.className}`}>
      <span className="status-badge-dot" />
      {config.label}
    </span>
  );
}
