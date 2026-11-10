'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldX, EyeOff } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import VerifiedBadge from '@/components/admin/VerifiedBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { NetworkVisibility, VerificationStatus } from '@/lib/admin/types';
import { VISIBILITY_LABELS } from '@/lib/admin/labels';

type NetworkAction = 'aprobar' | 'rechazar' | 'revocar_verificacion' | 'revocar_visibilidad';

const ACTION_META: Record<NetworkAction, { title: string; description: string }> = {
  aprobar: { title: 'Aprobar Buddy Verify', description: 'La cuenta quedará verificada y el usuario verá la insignia en la app.' },
  rechazar: { title: 'Desaprobar Buddy Verify', description: 'La solicitud quedará rechazada. La persona puede volver a enviarla.' },
  revocar_verificacion: { title: 'Desaprobar Buddy Verify', description: 'La cuenta perderá la insignia de verificación.' },
  revocar_visibilidad: { title: 'Revocar visibilidad en la red', description: 'El perfil dejará de ser visible para otros usuarios de la red empresarial.' },
};

interface NetworkSectionProps {
  cargo?: string;
  departamento?: string;
  visibilidadRed: NetworkVisibility;
  verificacionRed: VerificationStatus;
  onSetVisibility: (visibilidad: NetworkVisibility) => void;
  onSetVerification: (estado: VerificationStatus) => void;
}

export default function NetworkSection({
  cargo,
  departamento,
  visibilidadRed,
  verificacionRed,
  onSetVisibility,
  onSetVerification,
}: NetworkSectionProps) {
  const [action, setAction] = useState<NetworkAction | null>(null);
  const [motivo, setMotivo] = useState('');

  const openAction = (next: NetworkAction) => {
    setAction(next);
    setMotivo('');
  };

  const confirmAction = () => {
    if (action === 'aprobar') onSetVerification('verificado');
    if (action === 'rechazar') onSetVerification('rechazado');
    if (action === 'revocar_verificacion') onSetVerification('rechazado');
    if (action === 'revocar_visibilidad') onSetVisibility('privado');
    setAction(null);
  };

  return (
    <div className="panel-card">
      <span className="panel-card-title">Red empresarial</span>
      <div className="detail-rows">
        <div className="detail-row">
          <span className="detail-row-label">Visibilidad actual</span>
          <span className="detail-row-value">{VISIBILITY_LABELS[visibilidadRed]}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">Verificación (Buddy Verify)</span>
          <span className="detail-row-value">
            <span className="table-user-name-row">
              <StatusBadge status={verificacionRed} />
              {verificacionRed === 'verificado' && <VerifiedBadge size={14} />}
            </span>
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">Cargo expuesto</span>
          <span className="detail-row-value">{cargo ?? 'No especificado'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">Departamento expuesto</span>
          <span className="detail-row-value">{departamento ?? 'No especificado'}</span>
        </div>
      </div>

      <div className="account-actions-row">
        {(verificacionRed === 'pendiente' || verificacionRed === 'en_revision' || verificacionRed === 'no_solicitado' || verificacionRed === 'rechazado') && (
          <button className="confirm-dialog-btn-confirm" onClick={() => openAction('aprobar')}>
            <ShieldCheck size={14} />
            <span>Aprobar Buddy Verify</span>
          </button>
        )}
        {(verificacionRed === 'pendiente' || verificacionRed === 'en_revision' || verificacionRed === 'verificado') && (
          <button className="confirm-dialog-btn-cancel" onClick={() => openAction(verificacionRed === 'verificado' ? 'revocar_verificacion' : 'rechazar')}>
            <ShieldX size={14} />
            <span>Desaprobar</span>
          </button>
        )}
        {visibilidadRed !== 'privado' && (
          <button className="confirm-dialog-btn-confirm danger" onClick={() => openAction('revocar_visibilidad')}>
            <EyeOff size={14} />
            <span>Revocar visibilidad</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        open={!!action}
        title={action ? ACTION_META[action].title : ''}
        description={action ? ACTION_META[action].description : ''}
        tone={action === 'aprobar' ? 'default' : 'danger'}
        onConfirm={confirmAction}
        onCancel={() => setAction(null)}
      >
        <div className="form-field">
          <label className="form-field-label">Motivo (opcional)</label>
          <textarea
            className="form-field-textarea"
            rows={2}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Agrega contexto para el registro administrativo..."
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
