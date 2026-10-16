/**
 * Estilos compartidos de los gráficos Recharts.
 * Mismos valores que usaban las páginas inline; extraídos para evitar duplicación.
 */

export const CHART_COLORS = {
  primary: '#6025d2',
  negative: '#d03b3b',
  surface: '#FFFFFF',
};

export const CHART_GRID_STROKE = '#F1F3F5';

export const CHART_AXIS_TICK = { fontSize: 11, fill: '#ADB5BD' };

export const CHART_AXIS_LINE = { stroke: '#E9ECEF' };

export const CHART_CURSOR = { fill: '#FAF5FF' };

export function formatMillionsTick(value: number): string {
  return `${(value / 1000000).toFixed(0)}M`;
}
