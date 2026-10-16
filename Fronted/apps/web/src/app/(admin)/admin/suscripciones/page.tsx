'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, TrendingUp, UserPlus, UserMinus, TrendingDown, Coins, Settings } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  getAdminRevenueSeries,
  getAdminSubscriptionFlow,
  getAdminSubscriptionKpis,
  type AdminFlowPoint,
  type AdminSeriesPoint,
  type AdminSubscriptionKpis,
} from '@beeapp/api-client';
import KpiGrid, { type KpiItem } from '@/components/admin/KpiGrid';
import ChartCard from '@/components/admin/ChartCard';
import ChartLegend from '@/components/admin/ChartLegend';
import ChartTooltip from '@/components/admin/ChartTooltip';
import { formatCurrencyCOP } from '@/lib/admin/format';
import { CHART_COLORS, CHART_GRID_STROKE, CHART_AXIS_TICK, CHART_AXIS_LINE, CHART_CURSOR, formatMillionsTick } from '@/lib/admin/chart';
import TransactionsSection from './TransactionsSection';

const EMPTY_KPIS: AdminSubscriptionKpis = {
  ingresosMes: 0,
  ingresosAnio: 0,
  altas: 0,
  cancelaciones: 0,
  churnRate: 0,
  ingresoPromedio: 0,
};

export default function SuscripcionesPage() {
  const [kpis, setKpis] = useState<AdminSubscriptionKpis>(EMPTY_KPIS);
  const [revenue, setRevenue] = useState<AdminSeriesPoint[]>([]);
  const [flow, setFlow] = useState<AdminFlowPoint[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getAdminSubscriptionKpis(),
      getAdminRevenueSeries(),
      getAdminSubscriptionFlow(),
    ])
      .then(([nextKpis, nextRevenue, nextFlow]) => {
        setKpis(nextKpis);
        setRevenue(nextRevenue);
        setFlow(nextFlow);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las suscripciones.');
      });
  }, []);

  const churnPercent = kpis.churnRate <= 1 ? kpis.churnRate * 100 : kpis.churnRate;
  const kpiItems: KpiItem[] = [
    { id: 'mes', icon: Wallet, label: 'Ingresos del mes', value: formatCurrencyCOP(kpis.ingresosMes) },
    { id: 'anio', icon: TrendingUp, label: 'Ingresos del año', value: formatCurrencyCOP(kpis.ingresosAnio) },
    { id: 'altas', icon: UserPlus, label: 'Altas del mes', value: String(kpis.altas) },
    { id: 'cancelaciones', icon: UserMinus, label: 'Cancelaciones', value: String(kpis.cancelaciones) },
    { id: 'churn', icon: TrendingDown, label: 'Tasa de churn', value: `${churnPercent.toFixed(1)}%` },
    { id: 'promedio', icon: Coins, label: 'Ingreso promedio', value: formatCurrencyCOP(kpis.ingresoPromedio) },
  ];

  return (
    <div>
      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
      <div className="page-section">
        <KpiGrid items={kpiItems} />
      </div>

      <div className="page-section">
        <div className="charts-grid">
          <ChartCard title="Ingresos por mes" subtitle="Ingresos totales facturados">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={false} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={40} tickFormatter={formatMillionsTick} />
                <Tooltip content={<ChartTooltip valueFormatter={formatCurrencyCOP} />} cursor={CHART_CURSOR} />
                <Bar dataKey="value" name="Ingresos" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Altas vs. cancelaciones" subtitle="Movimiento mensual de suscripciones">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flow} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={false} />
                  <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} cursor={CHART_CURSOR} />
                  <Bar dataKey="altas" name="Altas" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
                  <Bar dataKey="cancelaciones" name="Cancelaciones" fill={CHART_COLORS.negative} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[
                  { id: 'altas', label: 'Altas', color: CHART_COLORS.primary },
                  { id: 'cancelaciones', label: 'Cancelaciones', color: CHART_COLORS.negative },
                ]}
              />
            </div>
          </ChartCard>
        </div>
      </div>

      <div className="page-section">
        <TransactionsSection />
      </div>

      <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#F8F9FC', border: '1.5px dashed #E9ECEF', padding: '20px' }}>
        <Settings size={24} style={{ color: '#6025d2', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span className="panel-card-title" style={{ margin: 0, fontSize: '15px', color: '#1A1A2E' }}>Gestión de planes de suscripción</span>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6C757D' }}>
            La configuración de precios, límites y características de los planes se ha trasladado al módulo de configuraciones generales.
          </p>
        </div>
        <Link href="/admin/configuracion" className="confirm-dialog-btn-confirm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          Configurar planes
        </Link>
      </div>
    </div>
  );
}
