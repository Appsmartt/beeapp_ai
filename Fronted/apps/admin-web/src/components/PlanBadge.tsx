import type { PlanId } from '@/mocks/types';

const PLAN_CONFIG: Record<PlanId, { label: string; className: string }> = {
  free: { label: 'Free', className: 'plan-badge-free' },
  plus: { label: 'Plus', className: 'plan-badge-plus' },
  pro: { label: 'Pro', className: 'plan-badge-pro' },
  enterprise: { label: 'Enterprise', className: 'plan-badge-enterprise' },
};

interface PlanBadgeProps {
  planId: PlanId;
}

export default function PlanBadge({ planId }: PlanBadgeProps) {
  const config = PLAN_CONFIG[planId];

  return <span className={`plan-badge ${config.className}`}>{config.label}</span>;
}
