import { Check, HardDrive, Smartphone, BriefcaseBusiness } from 'lucide-react';
import type { Plan, PlanFeatureKey } from '@/mocks/types';
import { formatCurrencyCOP } from '@/utils/format';
import { PLAN_FEATURE_LABELS } from '@/utils/labels';

interface PlanPreviewCardProps {
  plan: Plan;
  descuentoAnual: number;
}

export default function PlanPreviewCard({ plan, descuentoAnual }: PlanPreviewCardProps) {
  const funcionesActivas = (Object.keys(PLAN_FEATURE_LABELS) as PlanFeatureKey[]).filter((key) => plan.funciones[key]);

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
        {funcionesActivas.map((key) => (
          <div key={key} className="plan-manage-feature-row">
            <Check size={14} />
            <span>{PLAN_FEATURE_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <div className="plan-preview-limits">
        <span className="plan-preview-limit-item">
          <HardDrive size={13} />
          {plan.limites.almacenamientoGB === 0 ? 'Almacenamiento ilimitado' : `${plan.limites.almacenamientoGB} GB`}
        </span>
        <span className="plan-preview-limit-item">
          <Smartphone size={13} />
          {plan.limites.dispositivos} {plan.limites.dispositivos === 1 ? 'dispositivo' : 'dispositivos'}
        </span>
        <span className="plan-preview-limit-item">
          <BriefcaseBusiness size={13} />
          {plan.limites.ofertasPerfil} {plan.limites.ofertasPerfil === 1 ? 'oferta de perfil' : 'ofertas de perfil'}
        </span>
      </div>
    </div>
  );
}
