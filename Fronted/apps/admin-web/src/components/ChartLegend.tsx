export interface ChartLegendItem {
  id: string;
  label: string;
  color: string;
  value?: string;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
}

export default function ChartLegend({ items }: ChartLegendProps) {
  return (
    <div className="chart-legend">
      {items.map((item) => (
        <div key={item.id} className="chart-legend-item">
          <span className="chart-legend-dot" style={{ backgroundColor: item.color }} />
          <span className="chart-legend-label">{item.label}</span>
          {item.value !== undefined && <span className="chart-legend-value">{item.value}</span>}
        </div>
      ))}
    </div>
  );
}
