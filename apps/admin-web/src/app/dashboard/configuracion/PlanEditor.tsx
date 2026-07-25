'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Save, Users } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Plan, PlanLimits } from '@/mocks/types';
import { formatNumber } from '@/utils/format';
import PlanFeaturesEditor from './PlanFeaturesEditor';
import PlanPreviewCard from './PlanPreviewCard';

interface PlanEditorProps {
  plan: Plan;
  onSave: (plan: Plan) => void;
  onCancel: () => void;
}

export default function PlanEditor({ plan, onSave, onCancel }: PlanEditorProps) {
  const [draft, setDraft] = useState<Plan>(plan);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const descuentoAnual = useMemo(() => {
    if (draft.precioMensual <= 0 || draft.precioAnual <= 0) return 0;
    return Math.max(0, Math.round((1 - draft.precioAnual / (draft.precioMensual * 12)) * 100));
  }, [draft.precioMensual, draft.precioAnual]);

  const setField = <K extends keyof Plan>(key: K, value: Plan[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const setLimit = (key: keyof PlanLimits, value: string) => {
    setField('limites', { ...draft.limites, [key]: Math.max(0, Number(value) || 0) });
  };

  return (
    <>
      <div className="plan-editor-header">
        <button className="back-link" onClick={onCancel}>
          <ArrowLeft size={15} />
          <span>Volver a los planes</span>
        </button>
        <span className="panel-card-title">Editar plan {plan.nombre}</span>
      </div>

      <div className="user-detail-grid">
        <div className="user-detail-column">
          <div className="panel-card">
            <span className="panel-card-title">Información del plan</span>
            <div className="form-field">
              <label className="form-field-label">Nombre</label>
              <input className="form-field-input" value={draft.nombre} maxLength={30} onChange={(e) => setField('nombre', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-field-label">Descripción</label>
              <textarea className="form-field-textarea" rows={3} value={draft.descripcion} onChange={(e) => setField('descripcion', e.target.value)} />
            </div>
            <div className="schedule-inputs">
              <div className="form-field">
                <label className="form-field-label">Precio mensual (COP)</label>
                <input type="number" min={0} className="form-field-input" value={draft.precioMensual} onChange={(e) => setField('precioMensual', Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div className="form-field">
                <label className="form-field-label">Precio anual (COP)</label>
                <input type="number" min={0} className="form-field-input" value={draft.precioAnual} onChange={(e) => setField('precioAnual', Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>
            <p className="form-hint">
              {descuentoAnual > 0
                ? `El precio anual equivale a un descuento del ${descuentoAnual}% frente al pago mensual.`
                : 'El precio anual no ofrece descuento frente al pago mensual.'}
            </p>
          </div>

          <div className="panel-card">
            <span className="panel-card-title">Límites del plan</span>
            <div className="plan-limits-grid">
              <div className="form-field">
                <label className="form-field-label">Almacenamiento (GB)</label>
                <input type="number" min={0} className="form-field-input" value={draft.limites.almacenamientoGB} onChange={(e) => setLimit('almacenamientoGB', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-field-label">Dispositivos</label>
                <input type="number" min={0} className="form-field-input" value={draft.limites.dispositivos} onChange={(e) => setLimit('dispositivos', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-field-label">Ofertas de perfil profesional</label>
                <input type="number" min={0} className="form-field-input" value={draft.limites.ofertasPerfil} onChange={(e) => setLimit('ofertasPerfil', e.target.value)} />
              </div>
            </div>
            <p className="form-hint">Usa 0 en almacenamiento para indicar sin límite.</p>
          </div>

          <PlanFeaturesEditor
            funciones={draft.funciones}
            caracteristicas={draft.caracteristicas}
            onToggle={(key, value) => setField('funciones', { ...draft.funciones, [key]: value })}
            onCaracteristicasChange={(list) => setField('caracteristicas', list)}
          />
        </div>

        <div className="user-detail-column">
          <div className="panel-card">
            <span className="panel-card-title">Vista previa para el usuario</span>
            <PlanPreviewCard plan={draft} descuentoAnual={descuentoAnual} />
          </div>

          <div className="recipient-count-banner">
            <Users size={16} />
            <span>{formatNumber(plan.usuariosActivos)} usuarios tienen este plan actualmente.</span>
          </div>

          <button className="send-notification-btn" disabled={!draft.nombre.trim()} onClick={() => setConfirmOpen(true)}>
            <Save size={16} />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Guardar cambios del plan"
        description={`Los cambios en "${draft.nombre}" afectarán a los ${formatNumber(plan.usuariosActivos)} usuarios que tienen este plan y actualizarán la oferta visible en la app.`}
        confirmLabel="Guardar"
        onConfirm={() => {
          setConfirmOpen(false);
          onSave(draft);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
