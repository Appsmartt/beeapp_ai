import { Check, HardDrive, BriefcaseBusiness } from 'lucide-react';
import type { Plan } from '@/lib/admin/types';
import { formatCurrencyCOP } from '@/lib/admin/format';

interface PlanPreviewCardProps {
  plan: Plan;
  descuentoAnual: number;
}

export default function PlanPreviewCard({ plan, descuentoAnual }: PlanPreviewCardProps) {

  return (
    <div className="plan-preview-card" style={{ borderColor: plan.color }}>
      <div className="plan-manage-card-top">
        <span className="plan-manage-name">{plan.nombre.trim() || 'Sin nombre'}</span>
        <span className="plan-manage-dot" style={{ backgroundColor: plan.color }} />
      </div>

      <div>
        <span className="plan-manage-price">
          {plan.precioMensual === 0 ? 'Gratis' : formatCurrencyCOP(plan.precioMensual)}
        </span>
        {plan.precioMensual > 0 && <span className="plan-manage-price-period"> / mes</span>}
      </div>

      {plan.precioMensual > 0 && (
        <span className="plan-preview-annual">
          {formatCurrencyCOP(plan.precioAnual)} / año{descuentoAnual > 0 ? ` · ahorra ${descuentoAnual}%` : ''}
        </span>
      )}

      <p className="plan-manage-description">{plan.descripcion}</p>

      <div className="plan-manage-features">
        {plan.caracteristicas.map((feature) => (
          <div key={feature} className="plan-manage-feature-row">
            <Check size={14} />
            <span>{feature}</span>
          </div>
        ))}
        <div className="plan-manage-feature-row">
          <Check size={14} />
          <span>
            {plan.entitlements.aiCredits == null
              ? 'Créditos de IA sin límite'
              : `${plan.entitlements.aiCredits} créditos de IA al mes`}
          </span>
        </div>
      </div>

      <div className="plan-preview-limits">
        <span className="plan-preview-limit-item">
          <HardDrive size={13} />
          {plan.entitlements.filesGb == null ? 'Archivos sin límite' : `${plan.entitlements.filesGb} GB de archivos`}
        </span>
        <span className="plan-preview-limit-item">
          <BriefcaseBusiness size={13} />
          {plan.entitlements.catalogOffers == null ? 'Catálogo sin límite' : `${plan.entitlements.catalogOffers} productos`}
        </span>
      </div>
    </div>
  );
}
