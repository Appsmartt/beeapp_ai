'use client';

import { useMemo, useState } from 'react';
import { Users, UserCheck, UserPlus, CreditCard, Wallet, HardDrive, Cpu, Phone, Bot, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import KpiGrid, { type KpiItem } from '@/components/KpiGrid';
import ChartCard from '@/components/ChartCard';
import ChartTooltip from '@/components/ChartTooltip';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import ActivityFeed from '@/components/ActivityFeed';
import ChartLegend from '@/components/ChartLegend';
import PlanBadge from '@/components/PlanBadge';
import StatusBadge from '@/components/StatusBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { DASHBOARD_KPIS, USER_GROWTH_SERIES, REVENUE_SERIES, PLAN_DISTRIBUTION, MODULE_USAGE_SERIES } from '@/mocks/metrics';
import { MOCK_USERS } from '@/mocks/users';
import { MOCK_ACTIVITIES } from '@/mocks/activities';
import type { AdminUser } from '@/mocks/types';
import { formatCurrencyCOP, formatNumber, formatDate } from '@/utils/format';
import { CHART_COLORS, CHART_GRID_STROKE, CHART_AXIS_TICK, CHART_AXIS_LINE, CHART_CURSOR, formatMillionsTick } from '@/utils/chart';

const RANGE_OPTIONS = [
  { value: '3', label: 'Últimos 3 meses' },
  { value: '6', label: 'Últimos 6 meses' },
  { value: '7', label: 'Todo el periodo' },
];

const RECENT_USERS_COLUMNS: DataTableColumn<AdminUser>[] = [
  {
    key: 'usuario',
    header: 'Usuario',
    render: (row) => (
      <div className="table-user-cell">
        <div className="table-user-avatar">{row.iniciales}</div>
        <div className="table-user-name-col">
          <div className="table-user-name-row">
            <span className="table-user-name">{row.nombreCompleto}</span>
            {row.verificacionRed === 'verificado' && <VerifiedBadge size={13} />}
          </div>
          <span className="table-user-email">{row.email}</span>
        </div>
      </div>
    ),
  },
  { key: 'plan', header: 'Plan', render: (row) => <PlanBadge planId={row.planId} /> },
  { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} />, hideOnMobile: true },
  { key: 'fecha', header: 'Registro', render: (row) => formatDate(row.fechaRegistro), align: 'right' },
];

// Operational platform cost mock data
const INFRA_COST_HISTORY = [
  { label: 'Ene', almacenamiento: 180, llamadas: 450, ia: 90, integraciones: 110, total: 830 },
  { label: 'Feb', almacenamiento: 195, llamadas: 480, ia: 100, integraciones: 115, total: 890 },
  { label: 'Mar', almacenamiento: 210, llamadas: 520, ia: 110, integraciones: 120, total: 960 },
  { label: 'Abr', almacenamiento: 220, llamadas: 560, ia: 125, integraciones: 130, total: 1035 },
  { label: 'May', almacenamiento: 235, llamadas: 600, ia: 135, integraciones: 138, total: 1108 },
  { label: 'Jun', almacenamiento: 246, llamadas: 622, ia: 142, integraciones: 142, total: 1152 },
];

const COST_BREAKDOWN_DATA = [
  { nombre: 'Llamadas/Vídeo', valor: 622.50, color: '#6025d2' },
  { nombre: 'Almacenamiento', valor: 246.00, color: '#00C49F' },
  { nombre: 'Asistente IA', valor: 142.00, color: '#FFBB28' },
  { nombre: 'Integraciones', valor: 142.00, color: '#FF8042' },
];

const AVG_USER_CONSUMPTION = [
  { label: 'Almacenamiento (GB)', value: 5.8 },
  { label: 'Llamadas (min)', value: 173 },
  { label: 'Cuentas Conectadas', value: 1.97 },
  { label: 'Consultas IA / 10', value: 3.94 },
];

export default function DashboardPage() {
  const [range, setRange] = useState('7');
  const months = Number(range);

  const growthData = useMemo(() => USER_GROWTH_SERIES.slice(-months), [months]);
  const revenueData = useMemo(() => REVENUE_SERIES.slice(-months), [months]);

  const recentUsers = useMemo(
    () =>
      [...MOCK_USERS]
        .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime())
        .slice(0, 5),
    []
  );

  const kpiItems: KpiItem[] = [
    { id: 'total', icon: Users, label: 'Usuarios totales', value: formatNumber(DASHBOARD_KPIS.usuariosTotales), delta: { value: '+5.8% vs mes anterior', trend: 'up' } },
    { id: 'activos', icon: UserCheck, label: 'Usuarios activos', value: formatNumber(DASHBOARD_KPIS.usuariosActivos), delta: { value: '+4.2% vs mes anterior', trend: 'up' } },
    { id: 'nuevos', icon: UserPlus, label: 'Nuevos registros', value: formatNumber(DASHBOARD_KPIS.nuevosRegistros), delta: { value: '+18% vs mes anterior', trend: 'up' } },
    { id: 'subs', icon: CreditCard, label: 'Suscripciones activas', value: formatNumber(DASHBOARD_KPIS.suscripcionesActivas), delta: { value: '+2.4% vs mes anterior', trend: 'up' } },
    { id: 'ingresos', icon: Wallet, label: 'Ingresos del mes', value: formatCurrencyCOP(DASHBOARD_KPIS.ingresosMes), delta: { value: '+6.1% vs mes anterior', trend: 'up' } },
    { id: 'storage', icon: HardDrive, label: 'Almacenamiento total', value: `${DASHBOARD_KPIS.almacenamientoConsumidoGB.toFixed(1)} GB`, delta: { value: 'Estable', trend: 'neutral' } },
  ];

  // Infra operational cost KPIs
  const infraKpiItems: KpiItem[] = [
    { id: 'c_storage', icon: HardDrive, label: 'Almacenamiento (Costos)', value: '8.2 TB', delta: { value: 'Costo: $246.00 USD', trend: 'down' } },
    { id: 'c_integraciones', icon: Cpu, label: 'Cuentas integradas', value: '1,420 acct', delta: { value: 'Costo: $142.00 USD', trend: 'down' } },
    { id: 'c_llamadas', icon: Phone, label: 'Llamadas/Videollamadas', value: '124,500 min', delta: { value: 'Costo: $622.50 USD', trend: 'down' } },
    { id: 'c_ai', icon: Bot, label: 'Consultas Asistente IA', value: '28,400 cons', delta: { value: 'Costo: $142.00 USD', trend: 'down' } },
    { id: 'c_rentabilidad', icon: TrendingUp, label: 'Rentabilidad Operativa', value: '72.3% Margen', delta: { value: 'Costo: $1,198 vs Ingreso: $4,320', trend: 'up' } },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <div className="page-toolbar-heading">
          <span className="page-toolbar-title">Resumen general</span>
          <span className="page-toolbar-subtitle">Datos simulados con fines de maquetación</span>
        </div>
        <select className="page-select" value={range} onChange={(event) => setRange(event.target.value)}>
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="page-section">
        <KpiGrid items={kpiItems} />
      </div>

      <div className="page-section">
        <div className="charts-grid">
          <ChartCard title="Crecimiento de usuarios" subtitle="Usuarios totales por mes">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={false} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip valueFormatter={formatNumber} />} />
                <Line type="monotone" dataKey="value" name="Usuarios" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.primary, stroke: CHART_COLORS.surface, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Ingresos por mes" subtitle="Ingresos totales facturados">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={false} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={40} tickFormatter={formatMillionsTick} />
                <Tooltip content={<ChartTooltip valueFormatter={formatCurrencyCOP} />} cursor={CHART_CURSOR} />
                <Bar dataKey="value" name="Ingresos" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución por plan" subtitle="Usuarios activos por tipo de plan">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PLAN_DISTRIBUTION} dataKey="valor" nameKey="nombre" innerRadius={54} outerRadius={82} paddingAngle={2} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} isAnimationActive={false}>
                    {PLAN_DISTRIBUTION.map((entry) => (
                      <Cell key={entry.planId} fill={entry.color} stroke={CHART_COLORS.surface} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={formatNumber} />} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend
                items={PLAN_DISTRIBUTION.map((entry) => ({
                  id: entry.planId,
                  label: entry.nombre,
                  color: entry.color,
                  value: formatNumber(entry.valor),
                }))}
              />
            </div>
          </ChartCard>

          <ChartCard title="Uso de módulos" subtitle="% de usuarios activos por módulo">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MODULE_USAGE_SERIES} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={CHART_GRID_STROKE} />
                <XAxis type="number" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11.5, fill: '#495057', fontWeight: 400 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} cursor={CHART_CURSOR} />
                <Bar dataKey="value" name="Uso" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── Consumo y Costos de la plataforma Section ── */}
      <div className="page-toolbar" style={{ marginTop: '36px', borderTop: '1px solid #E9ECEF', paddingTop: '24px' }}>
        <div className="page-toolbar-heading">
          <span className="page-toolbar-title" style={{ fontSize: '18px' }}>Consumo y Costos Operativos de la Plataforma</span>
          <span className="page-toolbar-subtitle">Monitoreo de costos de infraestructura y rentabilidad del ecosistema</span>
        </div>
      </div>

      <div className="page-section">
        <KpiGrid items={infraKpiItems} />
      </div>

      <div className="page-section">
        <div className="charts-grid">
          {/* History Cost Chart */}
          <ChartCard title="Evolución de costos mensuales" subtitle="Costo total de operación en USD">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={INFRA_COST_HISTORY} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={false} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<ChartTooltip valueFormatter={(v) => `$${v} USD`} />} />
                <Line type="monotone" dataKey="total" name="Costo Infra" stroke="#6025d2" strokeWidth={2.5} dot={{ r: 4, fill: '#6025d2', stroke: CHART_COLORS.surface, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Cost breakdown pie chart */}
          <ChartCard title="Desglose de costos por servicio" subtitle="Distribución actual de costos ($1,152 USD)">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={COST_BREAKDOWN_DATA} dataKey="valor" nameKey="nombre" innerRadius={54} outerRadius={82} paddingAngle={2} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} isAnimationActive={false}>
                    {COST_BREAKDOWN_DATA.map((entry, index) => (
                      <Cell key={`cost-cell-${index}`} fill={entry.color} stroke={CHART_COLORS.surface} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={(v) => `$${v} USD`} />} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend
                items={COST_BREAKDOWN_DATA.map((entry) => ({
                  id: entry.nombre,
                  label: entry.nombre,
                  color: entry.color,
                  value: `$${entry.valor.toFixed(2)} USD`,
                }))}
              />
            </div>
          </ChartCard>

          {/* Average use per user chart */}
          <ChartCard title="Promedios de consumo por usuario" subtitle="Métricas de uso de recursos promedio">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AVG_USER_CONSUMPTION} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6C757D' }} axisLine={CHART_AXIS_LINE} tickLine={false} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} cursor={CHART_CURSOR} />
                <Bar dataKey="value" name="Consumo Promedio" fill="#00C49F" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="bottom-grid" style={{ marginTop: '36px' }}>
        <div className="panel-card">
          <div className="panel-card-header">
            <span className="panel-card-title">Últimos registros</span>
          </div>
          <DataTable columns={RECENT_USERS_COLUMNS} data={recentUsers} keyExtractor={(row) => row.id} />
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <span className="panel-card-title">Actividad reciente</span>
          </div>
          <ActivityFeed activities={MOCK_ACTIVITIES} />
        </div>
      </div>
    </div>
  );
}
