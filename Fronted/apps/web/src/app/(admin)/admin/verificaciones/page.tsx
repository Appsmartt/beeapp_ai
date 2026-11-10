'use client';

import { useEffect, useState } from 'react';
import { FileText, ShieldCheck, ShieldX } from 'lucide-react';
import {
  getAdminVerificationDocumentUrl,
  listAdminBusinessVerifications,
  reviewAdminBusinessVerification,
  type AdminBusinessVerificationDecision,
  type AdminBusinessVerificationRequest,
} from '@beeapp/api-client';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import { formatDate } from '@/lib/admin/format';

const STATUS_OPTIONS = [
  { value: 'pending_review', label: 'Pendientes' },
  { value: 'verified', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'requires_correction', label: 'Por corregir' },
  { value: 'suspended', label: 'Revocadas' },
  { value: '', label: 'Todas' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_review: { label: 'Pendiente', className: 'status-badge-warning' },
  verified: { label: 'Aprobada', className: 'status-badge-success' },
  rejected: { label: 'Rechazada', className: 'status-badge-error' },
  requires_correction: { label: 'Por corregir', className: 'status-badge-info' },
  suspended: { label: 'Revocada', className: 'status-badge-error' },
  draft: { label: 'Borrador', className: 'status-badge-neutral' },
};

const ACTION_META: Record<AdminBusinessVerificationDecision, {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'default' | 'danger';
  needsReason: boolean;
}> = {
  approve: {
    title: 'Aprobar verificación',
    description: 'El negocio mostrará el check de verificado en la app.',
    confirmLabel: 'Aprobar',
    tone: 'default',
    needsReason: false,
  },
  reject: {
    title: 'Rechazar solicitud',
    description: 'El negocio no tendrá check. El dueño verá tu comentario y podrá corregir la solicitud.',
    confirmLabel: 'Rechazar',
    tone: 'danger',
    needsReason: true,
  },
  request_correction: {
    title: 'Pedir corrección',
    description: 'El negocio no tendrá check. El dueño verá tu comentario y podrá reenviar la solicitud.',
    confirmLabel: 'Pedir corrección',
    tone: 'danger',
    needsReason: true,
  },
  revoke: {
    title: 'Revocar verificación',
    description: 'El negocio perderá el check de verificado en la app.',
    confirmLabel: 'Revocar',
    tone: 'danger',
    needsReason: false,
  },
};

function RequestStatus({ status }: { status: string }) {
  const config = STATUS_BADGE[status] ?? {
    label: status,
    className: 'status-badge-neutral',
  };

  return (
    <span className={`status-badge ${config.className}`}>
      <span className="status-badge-dot" />
      {config.label}
    </span>
  );
}

function applicantLabel(type: string | null): string {
  if (type === 'legal') return 'Jurídica';
  if (type === 'natural') return 'Natural';
  return 'Sin dato';
}

function displayDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return formatDate(value);
}

export default function VerificacionesPage() {
  const [status, setStatus] = useState('pending_review');
  const [items, setItems] = useState<AdminBusinessVerificationRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [action, setAction] = useState<AdminBusinessVerificationDecision | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError('');
    listAdminBusinessVerifications(status)
      .then((rows) => {
        if (!active) return;
        setItems(rows);
        setSelectedId((current) => (
          current && rows.some((row) => row.id === current) ? current : null
        ));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setItems([]);
        setSelectedId(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar las solicitudes.',
        );
      });

    return () => {
      active = false;
    };
  }, [reloadKey, status]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const actionMeta = action ? ACTION_META[action] : null;
  const canReview = selected
    && selected.verification_status !== 'verified'
    && selected.verification_status !== 'suspended';
  const canRevoke = selected?.verification_status === 'verified';

  const openAction = (next: AdminBusinessVerificationDecision) => {
    setAction(next);
    setReason('');
    setDialogError('');
  };

  const confirmAction = async () => {
    if (!selected || !action || !actionMeta || isSaving) return;
    if (actionMeta.needsReason && !reason.trim()) {
      setDialogError('Escribe un comentario para el dueño.');
      return;
    }

    setIsSaving(true);
    setDialogError('');
    try {
      await reviewAdminBusinessVerification({
        businessId: selected.id,
        decision: action,
        reason: reason.trim() || null,
      });
      setAction(null);
      setReloadKey((value) => value + 1);
    } catch (error: unknown) {
      setDialogError(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar la revisión.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openPdf = async () => {
    if (!selected?.document_bucket || !selected.document_path) return;
    setPdfError('');
    try {
      const url = await getAdminVerificationDocumentUrl(
        selected.document_bucket,
        selected.document_path,
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      setPdfError(
        error instanceof Error
          ? error.message
          : 'No fue posible abrir el PDF.',
      );
    }
  };

  const columns: DataTableColumn<AdminBusinessVerificationRequest>[] = [
    {
      key: 'negocio',
      header: 'Negocio',
      render: (row) => (
        <div className="table-user-name-col">
          <span className="table-user-name">{row.display_name}</span>
          <span className="table-user-email">{row.city || 'Sin ciudad'}</span>
        </div>
      ),
    },
    {
      key: 'dueno',
      header: 'Dueño',
      render: (row) => (
        <div className="table-user-name-col">
          <span className="table-user-name">{row.owner_name}</span>
          <span className="table-user-email">{row.owner_email || 'Sin correo'}</span>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => <RequestStatus status={row.verification_status} />,
    },
    {
      key: 'enviada',
      header: 'Enviada',
      hideOnMobile: true,
      render: (row) => displayDate(row.submitted_at),
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <div className="page-toolbar-heading">
          <span className="page-toolbar-title">Solicitudes de negocios</span>
          <span className="page-toolbar-subtitle">
            Aprueba una solicitud para mostrar el check en la app.
          </span>
        </div>
        <select
          aria-label="Filtrar solicitudes por estado"
          className="page-select"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loadError ? (
        <p className="confirm-dialog-description">{loadError}</p>
      ) : null}

      <div className="panel-card" style={{ marginBottom: 16 }}>
        <DataTable
          columns={columns}
          data={items}
          emptyMessage="No hay solicitudes en este estado."
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            setSelectedId(row.id);
            setPdfError('');
          }}
        />
      </div>

      <div className="panel-card">
        <span className="panel-card-title">Detalle de la solicitud</span>
        {selected ? (
          <>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-row-label">Negocio</span>
                <span className="detail-row-value">{selected.display_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Dueño</span>
                <span className="detail-row-value">
                  {selected.owner_name}
                  {selected.owner_email ? ` · ${selected.owner_email}` : ''}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Estado</span>
                <span className="detail-row-value">
                  <RequestStatus status={selected.verification_status} />
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Tipo de persona</span>
                <span className="detail-row-value">{applicantLabel(selected.applicant_type)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Nombre o razón social</span>
                <span className="detail-row-value">{selected.legal_name || 'Sin dato'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Identificación</span>
                <span className="detail-row-value">{selected.tax_id || 'Sin dato'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Dirección</span>
                <span className="detail-row-value">{selected.business_address || 'Sin dato'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Nota del dueño</span>
                <span className="detail-row-value">{selected.review_note || 'Sin nota'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Comentario de revisión</span>
                <span className="detail-row-value">{selected.review_reason_text || 'Sin comentario'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Enviada</span>
                <span className="detail-row-value">{displayDate(selected.submitted_at)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Revisada</span>
                <span className="detail-row-value">{displayDate(selected.reviewed_at)}</span>
              </div>
            </div>

            <div className="account-actions-row" style={{ marginTop: 16 }}>
              {selected.document_bucket && selected.document_path ? (
                <button className="confirm-dialog-btn-cancel" onClick={() => void openPdf()} type="button">
                  <FileText size={14} />
                  <span>{selected.document_name || 'Ver PDF'}</span>
                </button>
              ) : (
                <span className="detail-row-label">Sin PDF de soporte</span>
              )}
            </div>
            {pdfError ? <p className="confirm-dialog-description">{pdfError}</p> : null}

            <div className="account-actions-row" style={{ marginTop: 16 }}>
              {canReview ? (
                <>
                  <button className="confirm-dialog-btn-confirm" onClick={() => openAction('approve')} type="button">
                    <ShieldCheck size={14} />
                    <span>Aprobar</span>
                  </button>
                  <button className="confirm-dialog-btn-cancel" onClick={() => openAction('request_correction')} type="button">
                    <span>Pedir corrección</span>
                  </button>
                  <button className="confirm-dialog-btn-confirm danger" onClick={() => openAction('reject')} type="button">
                    <ShieldX size={14} />
                    <span>Rechazar</span>
                  </button>
                </>
              ) : null}
              {canRevoke ? (
                <button className="confirm-dialog-btn-confirm danger" onClick={() => openAction('revoke')} type="button">
                  <ShieldX size={14} />
                  <span>Revocar verificación</span>
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="confirm-dialog-description">Selecciona una solicitud para revisarla.</p>
        )}
      </div>

      <ConfirmDialog
        confirmLabel={isSaving ? 'Guardando…' : actionMeta?.confirmLabel}
        description={actionMeta?.description || ''}
        onCancel={() => {
          if (!isSaving) setAction(null);
        }}
        onConfirm={() => {
          void confirmAction();
        }}
        open={Boolean(action)}
        title={actionMeta?.title || ''}
        tone={actionMeta?.tone}
      >
        {actionMeta?.needsReason || action === 'revoke' ? (
          <div className="form-field">
            <label className="form-field-label">
              {actionMeta?.needsReason ? 'Comentario para el dueño' : 'Comentario (opcional)'}
            </label>
            <textarea
              className="form-field-textarea"
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              value={reason}
            />
          </div>
        ) : null}
        {dialogError ? <p className="confirm-dialog-description">{dialogError}</p> : null}
      </ConfirmDialog>
    </div>
  );
}
