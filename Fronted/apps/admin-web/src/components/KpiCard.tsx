import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface KpiItem {
  id: string;
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { value: string; trend: 'up' | 'down' | 'neutral' };
}

export default function KpiCard({ icon: Icon, label, value, delta }: KpiItem) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-icon-wrap">
        <Icon size={20} />
      </div>
      <div className="kpi-card-body">
        <span className="kpi-card-label">{label}</span>
        <span className="kpi-card-value">{value}</span>
        {delta && (
          <span className={`kpi-card-delta kpi-card-delta-${delta.trend}`}>
            {delta.trend === 'up' && <ArrowUpRight size={13} />}
            {delta.trend === 'down' && <ArrowDownRight size={13} />}
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}
