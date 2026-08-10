import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  height?: number;
  children: ReactNode;
}

export default function ChartCard({ title, subtitle, actions, height = 280, children }: ChartCardProps) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-card-heading-col">
          <span className="chart-card-title">{title}</span>
          {subtitle && <span className="chart-card-subtitle">{subtitle}</span>}
        </div>
        {actions && <div className="chart-card-actions">{actions}</div>}
      </div>
      <div className="chart-card-body" style={{ height }}>
        {children}
      </div>
    </div>
  );
}
