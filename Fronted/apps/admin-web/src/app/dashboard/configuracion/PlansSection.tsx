'use client';

import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { MOCK_PLANS } from '@/mocks/plans';
import type { Plan, PlanId } from '@/mocks/types';
import { formatCurrencyCOP, formatNumber } from '@/utils/format';
import PlanEditor from './PlanEditor';

export default function PlansSection() {
  const [plans, setPlans] = useState<Plan[]>(MOCK_PLANS);
  const [editingId, setEditingId] = useState<PlanId | null>(null);

  const editingPlan = plans.find((plan) => plan.id === editingId) ?? null;

  const handleSave = (updated: Plan) => {
    setPlans((prev) => prev.map((plan) => (plan.id === updated.id ? updated : plan)));
    setEditingId(null);
  };

  if (editingPlan) {
    return (
      <div className="page-section">
        <PlanEditor plan={editingPlan} onSave={handleSave} onCancel={() => setEditingId(null)} />
      </div>
    );
  }

  return (
    <div className="page-section" style={{ padding: 0, marginTop: 0 }}>
      <span className="panel-card-title">Gestión de planes</span>
      <div className="plans-grid" style={{ marginTop: '16px' }}>
        {plans.map((plan) => (
          <div key={plan.id} className="plan-manage-card">
            <div className="plan-manage-card-top">
              <span className="plan-manage-name">{plan.nombre}</span>
              <span className="plan-manage-dot" style={{ backgroundColor: plan.color }} />
            </div>

            <div>
              <span className="plan-manage-price">
                {plan.precioMensual === 0 ? 'Gratis' : formatCurrencyCOP(plan.precioMensual)}
              </span>
              {plan.precioMensual > 0 && <span className="plan-manage-price-period"> / mes</span>}
            </div>

            <p className="plan-manage-description">{plan.descripcion}</p>

            <div className="plan-manage-features">
              {plan.caracteristicas.map((feature) => (
                <div key={feature} className="plan-manage-feature-row">
                  <Check size={14} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="plan-manage-footer">
              <span className="plan-manage-active-count">{formatNumber(plan.usuariosActivos)} usuarios activos</span>
              <button className="panel-card-link plan-edit-btn" onClick={() => setEditingId(plan.id)}>
                <Pencil size={13} />
                <span>Editar</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
