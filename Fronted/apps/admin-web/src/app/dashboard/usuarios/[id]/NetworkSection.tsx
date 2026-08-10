'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldX, EyeOff } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { NetworkVisibility, VerificationStatus } from '@/mocks/types';
import { VISIBILITY_LABELS } from '@/utils/labels';

type NetworkAction = 'aprobar' | 'rechazar' | 'revocar_verificacion' | 'revocar_visibilidad';

const ACTION_META: Record<NetworkAction, { title: string; description: string }> = {
  aprobar: { title: 'Aprobar verificación', description: 'El usuario recibirá la insignia azul de cuenta verificada junto a su nombre en la app.' },
  rechazar: { title: 'Rechazar verificación', description: 'La solicitud de verificación quedará marcada como no solicitada.' },
  revocar_verificacion: { title: 'Revocar verificación', description: 'El usuario perderá la insignia azul de cuenta verificada en toda la app.' },
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
    if (action === 'rechazar') onSetVerification('no_solicitado');
    if (action === 'revocar_verificacion') onSetVerification('no_solicitado');
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
          <span className="detail-row-label">Verificación (Bee Verify)</span>
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
        {verificacionRed === 'pendiente' && (
          <>
            <button className="confirm-dialog-btn-confirm" onClick={() => openAction('aprobar')}>
              <ShieldCheck size={14} />
              <span>Aprobar</span>
            </button>
            <button className="confirm-dialog-btn-cancel" onClick={() => openAction('rechazar')}>
              <ShieldX size={14} />
              <span>Rechazar</span>
            </button>
          </>
        )}
        {verificacionRed === 'verificado' && (
          <button className="confirm-dialog-btn-cancel" onClick={() => openAction('revocar_verificacion')}>
            <ShieldX size={14} />
            <span>Revocar verificación</span>
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
