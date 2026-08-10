import KpiCard, { type KpiItem } from './KpiCard';

export type { KpiItem };

interface KpiGridProps {
  items: KpiItem[];
  loading?: boolean;
}

export default function KpiGrid({ items, loading }: KpiGridProps) {
  if (loading) {
    return (
      <div className="kpi-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="kpi-card kpi-card-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="kpi-grid">
      {items.map((item) => (
        <KpiCard key={item.id} {...item} />
      ))}
    </div>
  );
}
