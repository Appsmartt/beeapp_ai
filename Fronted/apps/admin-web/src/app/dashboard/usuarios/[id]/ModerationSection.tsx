'use client';

import { useState } from 'react';
import { Check, Ban, ShieldOff, RotateCcw } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { ReportStatus, SanctionType, UserReport, UserSanction, UserStatus } from '@/mocks/types';
import { formatDate } from '@/utils/format';
import { REPORT_REASON_LABELS, SANCTION_LABELS } from '@/utils/labels';

interface ModerationSectionProps {
  estado: UserStatus;
  reports: UserReport[];
  sanctions: UserSanction[];
  onReportStatusChange: (id: string, estado: ReportStatus) => void;
  onSanction: (tipo: SanctionType, motivo: string) => void;
}

export default function ModerationSection({ estado, reports, sanctions, onReportStatusChange, onSanction }: ModerationSectionProps) {
  const [actionTarget, setActionTarget] = useState<SanctionType | null>(null);
  const [motivo, setMotivo] = useState('');

  const openAction = (tipo: SanctionType) => {
    setActionTarget(tipo);
    setMotivo('');
  };

  const confirmAction = () => {
    if (actionTarget) onSanction(actionTarget, motivo.trim() || 'Sin motivo especificado.');
    setActionTarget(null);
  };

  const isBlockedOrSuspended = estado === 'suspendido' || estado === 'bloqueado';

  return (
    <div className="panel-card">
      <span className="panel-card-title">Moderación</span>

      <div className="privacy-banner">
        <ShieldOff size={18} />
        <span>
          Solo se muestra el contenido específico reportado por otros usuarios. El equipo administrativo{' '}
          <strong>nunca</strong> tiene acceso libre a las conversaciones, correos ni archivos.
        </span>
      </div>

      <span className="moderation-subtitle">Historial de reportes ({reports.length})</span>
      {reports.length === 0 ? (
        <p className="activity-feed-empty">Este usuario no tiene reportes registrados.</p>
      ) : (
        <div className="moderation-report-list">
          {reports.map((report) => (
            <div key={report.id} className="moderation-report-card">
              <div className="moderation-report-header">
                <span className="moderation-report-reason">{REPORT_REASON_LABELS[report.motivo]}</span>
                <StatusBadge status={report.estado} />
              </div>
              <p className="moderation-report-meta">
                Reportado por {report.reportadoPor} · {formatDate(report.fecha)}
              </p>
              <p className="moderation-report-detalle">{report.detalle}</p>
              <p className="moderation-report-content">&quot;{report.contenidoReportado}&quot;</p>
              {report.estado === 'pendiente' && (
                <div className="moderation-report-actions">
                  <button className="table-row-action-btn" title="Marcar como revisado" onClick={() => onReportStatusChange(report.id, 'revisado')}>
                    <Check size={15} />
                  </button>
                  <button className="table-row-action-btn" title="Descartar reporte" onClick={() => onReportStatusChange(report.id, 'descartado')}>
                    <Ban size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <span className="moderation-subtitle">Historial de sanciones ({sanctions.length})</span>
      {sanctions.length === 0 ? (
        <p className="activity-feed-empty">Sin sanciones aplicadas a este usuario.</p>
      ) : (
        <div className="activity-feed">
          {sanctions.map((sanction) => (
            <div key={sanction.id} className="activity-feed-row">
              <div className="activity-feed-icon-wrap activity-feed-icon-alerta">
                <ShieldOff size={15} />
              </div>
              <div className="activity-feed-text-col">
                <p className="activity-feed-description">
                  {SANCTION_LABELS[sanction.tipo]} · {sanction.motivo}
                </p>
                <span className="activity-feed-time">
                  {formatDate(sanction.fecha)} · {sanction.adminResponsable}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <span className="moderation-subtitle">Acciones sobre la cuenta</span>
      <div className="account-actions-row">
        {!isBlockedOrSuspended && (
          <>
            <button className="confirm-dialog-btn-cancel" onClick={() => openAction('suspension')}>
              <Ban size={14} />
              <span>Suspender</span>
            </button>
            <button className="confirm-dialog-btn-confirm danger" onClick={() => openAction('bloqueo')}>
              <ShieldOff size={14} />
              <span>Bloquear</span>
            </button>
          </>
        )}
        {isBlockedOrSuspended && (
          <button className="confirm-dialog-btn-confirm" onClick={() => openAction('reactivacion')}>
            <RotateCcw size={14} />
            <span>Reactivar</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        open={!!actionTarget}
        title={actionTarget ? `Confirmar ${SANCTION_LABELS[actionTarget].toLowerCase()}` : ''}
        description="Esta acción cambiará el estado de la cuenta del usuario. Describe el motivo para dejar constancia en el historial de moderación."
        tone={actionTarget === 'reactivacion' ? 'default' : 'danger'}
        confirmLabel="Confirmar"
        onConfirm={confirmAction}
        onCancel={() => setActionTarget(null)}
      >
        <div className="form-field">
          <label className="form-field-label">Motivo</label>
          <textarea
            className="form-field-textarea"
            rows={3}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Describe el motivo de esta acción..."
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
