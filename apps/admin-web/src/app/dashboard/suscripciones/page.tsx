'use client';

import Link from 'next/link';
import { Wallet, TrendingUp, UserPlus, UserMinus, TrendingDown, Coins, Settings } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import KpiGrid, { type KpiItem } from '@/components/KpiGrid';
import ChartCard from '@/components/ChartCard';
import ChartLegend from '@/components/ChartLegend';
import ChartTooltip from '@/components/ChartTooltip';
import { SUBSCRIPTION_KPIS, REVENUE_SERIES, SUBSCRIPTIONS_FLOW_SERIES } from '@/mocks/metrics';
import { formatCurrencyCOP } from '@/utils/format';
import { CHART_COLORS, CHART_GRID_STROKE, CHART_AXIS_TICK, CHART_AXIS_LINE, CHART_CURSOR, formatMillionsTick } from '@/utils/chart';
import TransactionsSection from './TransactionsSection';

export default function SuscripcionesPage() {
  const kpiItems: KpiItem[] = [
    { id: 'mes', icon: Wallet, label: 'Ingresos del mes', value: formatCurrencyCOP(SUBSCRIPTION_KPIS.ingresosMes), delta: { value: '+6.1% vs mes anterior', trend: 'up' } },
    { id: 'anio', icon: TrendingUp, label: 'Ingresos del año', value: formatCurrencyCOP(SUBSCRIPTION_KPIS.ingresosAnio), delta: { value: '+22% vs año anterior', trend: 'up' } },
    { id: 'altas', icon: UserPlus, label: 'Altas del mes', value: String(SUBSCRIPTION_KPIS.altas), delta: { value: '+9 vs mes anterior', trend: 'up' } },
    { id: 'cancelaciones', icon: UserMinus, label: 'Cancelaciones', value: String(SUBSCRIPTION_KPIS.cancelaciones), delta: { value: '-1 vs mes anterior', trend: 'down' } },
    { id: 'churn', icon: TrendingDown, label: 'Tasa de churn', value: `${SUBSCRIPTION_KPIS.churnRate}%`, delta: { value: '-0.3pp vs mes anterior', trend: 'up' } },
    { id: 'promedio', icon: Coins, label: 'Ingreso promedio', value: formatCurrencyCOP(SUBSCRIPTION_KPIS.ingresoPromedio) },
  ];

  return (
    <div>
      <div className="page-section">
        <KpiGrid items={kpiItems} />
      </div>

      <div className="page-section">
        <div className="charts-grid">
          <ChartCard title="Ingresos por mes" subtitle="Ingresos totales facturados">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_SERIES} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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
                <BarChart data={SUBSCRIPTIONS_FLOW_SERIES} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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

      {/* Migrated plans banner redirecting to configurations */}
      <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#F8F9FC', border: '1.5px dashed #E9ECEF', padding: '20px' }}>
        <Settings size={24} style={{ color: '#6025d2', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span className="panel-card-title" style={{ margin: 0, fontSize: '15px', color: '#1A1A2E' }}>Gestión de planes de suscripción</span>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6C757D' }}>
            La configuración de precios, límites y características de los planes se ha trasladado al módulo de configuraciones generales.
          </p>
        </div>
        <Link href="/dashboard/configuracion" className="confirm-dialog-btn-confirm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          Configurar planes
        </Link>
      </div>
    </div>
  );
}
