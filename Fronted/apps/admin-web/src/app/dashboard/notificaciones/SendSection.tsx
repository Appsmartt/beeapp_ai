'use client';

import { useEffect, useState } from 'react';
import { Send, Clock, X } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import PhonePreview from '@/components/PhonePreview';
import RecipientPicker, { DEFAULT_RECIPIENT_SELECTION, type RecipientSelection } from '@/components/RecipientPicker';
import type { NotificationCampaign } from '@/mocks/types';
import { formatNumber } from '@/utils/format';

const MESSAGE_LIMIT = 178;

const RECIPIENT_LABELS: Record<RecipientSelection['mode'], string> = {
  todos: 'todos los usuarios',
  segmento: 'un segmento de usuarios',
  especificos: 'usuarios específicos',
};

interface SendSectionProps {
  onSend: (campaign: NotificationCampaign) => void;
  editingCampaign: NotificationCampaign | null;
  onDoneEditing: () => void;
}

export default function SendSection({ onSend, editingCampaign, onDoneEditing }: SendSectionProps) {
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [recipients, setRecipients] = useState<RecipientSelection>(DEFAULT_RECIPIENT_SELECTION);
  const [programar, setProgramar] = useState(false);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!editingCampaign) return;
    setTitulo(editingCampaign.titulo);
    setMensaje(editingCampaign.mensaje);
    setRecipients({
      mode: editingCampaign.modoDestinatario,
      criteria: editingCampaign.segmentoCriterios ?? DEFAULT_RECIPIENT_SELECTION.criteria,
      userIds: editingCampaign.usuariosIds ?? [],
      estimatedCount: editingCampaign.cantidadDestinatarios,
    });
    const [datePart, timePart] = editingCampaign.fechaEnvio.split('T');
    setFecha(datePart);
    setHora(timePart?.slice(0, 5) ?? '');
    setProgramar(true);
  }, [editingCampaign]);

  const resetForm = () => {
    setTitulo('');
    setMensaje('');
    setRecipients(DEFAULT_RECIPIENT_SELECTION);
    setProgramar(false);
    setFecha('');
    setHora('');
  };

  const isValid = titulo.trim().length > 0 && mensaje.trim().length > 0 && (recipients.mode !== 'especificos' || recipients.userIds.length > 0);
  const scheduledIso = programar && fecha ? `${fecha}T${hora || '09:00'}:00` : null;

  const handleConfirmSend = () => {
    const campaign: NotificationCampaign = {
      id: editingCampaign?.id ?? `ntf_${Date.now()}`,
      titulo: titulo.trim(),
      mensaje: mensaje.trim(),
      modoDestinatario: recipients.mode,
      segmentoCriterios: recipients.mode === 'segmento' ? recipients.criteria : undefined,
      usuariosIds: recipients.mode === 'especificos' ? recipients.userIds : undefined,
      cantidadDestinatarios: recipients.estimatedCount,
      fechaEnvio: scheduledIso ?? new Date().toISOString(),
      estado: scheduledIso ? 'programada' : 'enviada',
      entregados: scheduledIso ? undefined : recipients.estimatedCount,
      abiertos: scheduledIso ? undefined : 0,
    };
    onSend(campaign);
    setConfirmOpen(false);
    resetForm();
    onDoneEditing();
  };

  return (
    <div className="user-detail-grid">
      <div className="user-detail-column">
        {editingCampaign && (
          <div className="recipient-count-banner">
            <Clock size={16} />
            <span>Editando el envío programado &quot;{editingCampaign.titulo}&quot;.</span>
            <button className="table-row-action-btn" style={{ marginLeft: 'auto' }} onClick={() => { resetForm(); onDoneEditing(); }}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="panel-card">
          <span className="panel-card-title">Contenido de la notificación</span>
          <div className="form-field">
            <label className="form-field-label">Título</label>
            <input className="form-field-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Nueva función disponible" maxLength={60} />
          </div>
          <div className="form-field">
            <label className="form-field-label">Mensaje</label>
            <textarea
              className="form-field-textarea"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value.slice(0, MESSAGE_LIMIT))}
              placeholder="Escribe el mensaje que verán los usuarios..."
              rows={4}
            />
            <span className="form-field-counter">{mensaje.length}/{MESSAGE_LIMIT}</span>
          </div>
        </div>

        <div className="panel-card">
          <span className="panel-card-title">Destinatarios</span>
          <RecipientPicker value={recipients} onChange={setRecipients} />
        </div>

        <div className="panel-card">
          <span className="panel-card-title">Programación</span>
          <div className="recipient-mode-tabs">
            <button type="button" className={`recipient-mode-tab ${!programar ? 'active' : ''}`} onClick={() => setProgramar(false)}>
              <Send size={14} />
              <span>Enviar ahora</span>
            </button>
            <button type="button" className={`recipient-mode-tab ${programar ? 'active' : ''}`} onClick={() => setProgramar(true)}>
              <Clock size={14} />
              <span>Programar envío</span>
            </button>
          </div>
          {programar && (
            <div className="schedule-inputs">
              <input type="date" className="form-field-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              <input type="time" className="form-field-input" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="user-detail-column">
        <div className="panel-card">
          <span className="panel-card-title">Vista previa</span>
          <PhonePreview title={titulo} message={mensaje} />
        </div>
        <button className="send-notification-btn" disabled={!isValid} onClick={() => setConfirmOpen(true)}>
          <Send size={16} />
          <span>{editingCampaign ? 'Guardar cambios' : 'Enviar notificación'}</span>
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={scheduledIso ? 'Confirmar programación' : 'Confirmar envío'}
        description={`Esta notificación se enviará a ${RECIPIENT_LABELS[recipients.mode]} (~${formatNumber(recipients.estimatedCount)} usuarios)${scheduledIso ? `, programada para el ${fecha} a las ${hora || '09:00'}` : ' de inmediato'}.`}
        confirmLabel={scheduledIso ? 'Programar' : 'Enviar'}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
