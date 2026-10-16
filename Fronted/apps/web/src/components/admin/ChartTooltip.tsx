interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  valueFormatter?: (value: number) => string;
}

export default function ChartTooltip({ active, label, payload, valueFormatter = String }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="chart-tooltip">
      {label && <span className="chart-tooltip-label">{label}</span>}
      <div className="chart-tooltip-rows">
        {payload.map((item, index) => (
          <div key={item.name ?? index} className="chart-tooltip-row">
            <span className="chart-tooltip-key" style={{ backgroundColor: item.color }} />
            <span className="chart-tooltip-name">{item.name}</span>
            <span className="chart-tooltip-value">{valueFormatter(item.value ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
