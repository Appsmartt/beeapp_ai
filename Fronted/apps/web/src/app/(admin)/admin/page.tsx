'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, UserPlus, CreditCard, Wallet, HardDrive } from 'lucide-react';
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
import {
  getAdminActivityFeed,
  getAdminDashboardKpis,
  getAdminModuleUsage,
  getAdminPlanDistribution,
  getAdminRevenueSeries,
  getAdminUserGrowth,
  listAdminUsers,
  type AdminDashboardKpis,
  type AdminPlanSlice,
  type AdminSeriesPoint,
} from '@beeapp/api-client';
import KpiGrid, { type KpiItem } from '@/components/admin/KpiGrid';
import ChartCard from '@/components/admin/ChartCard';
import ChartTooltip from '@/components/admin/ChartTooltip';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import ActivityFeed from '@/components/admin/ActivityFeed';
import ChartLegend from '@/components/admin/ChartLegend';
import PlanBadge from '@/components/admin/PlanBadge';
import StatusBadge from '@/components/admin/StatusBadge';
import VerifiedBadge from '@/components/admin/VerifiedBadge';
import type { Activity, AdminUser, PlanId, UserStatus } from '@/lib/admin/types';
import { formatCurrencyCOP, formatNumber, formatDate } from '@/lib/admin/format';
import { CHART_COLORS, CHART_GRID_STROKE, CHART_AXIS_TICK, CHART_AXIS_LINE, CHART_CURSOR } from '@/lib/admin/chart';

const RANGE_OPTIONS = [
  { value: '3', label: 'Últimos 3 meses' },
  { value: '6', label: 'Últimos 6 meses' },
  { value: '7', label: 'Últimos 7 meses' },
];

const EMPTY_KPIS: AdminDashboardKpis = {
  usuariosTotales: 0,
  usuariosActivos: 0,
  nuevosRegistros: 0,
  suscripcionesActivas: 0,
  ingresosMes: 0,
  almacenamientoConsumidoGB: 0,
};

type RecentUser = Pick<
  AdminUser,
  'id' | 'iniciales' | 'nombreCompleto' | 'verificacionRed' | 'email' | 'planId' | 'estado' | 'fechaRegistro'
>;

function asRecentUser(row: Record<string, unknown>): RecentUser {
  return {
    id: String(row.id || ''),
    iniciales: String(row.iniciales || '?'),
    nombreCompleto: String(row.nombreCompleto || ''),
    verificacionRed: (row.verificacionRed || 'no_solicitado') as RecentUser['verificacionRed'],
    email: String(row.email || ''),
    planId: String(row.planId || 'free') as PlanId,
    estado: String(row.estado || 'activo') as UserStatus,
    fechaRegistro: row.fechaRegistro ? String(row.fechaRegistro) : '',
  };
}

const RECENT_USERS_COLUMNS: DataTableColumn<RecentUser>[] = [
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
  {
    key: 'fecha',
    header: 'Registro',
    render: (row) => (row.fechaRegistro ? formatDate(row.fechaRegistro) : '—'),
    align: 'right',
  },
];

export default function DashboardPage() {
  const [range, setRange] = useState('7');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState<AdminDashboardKpis>(EMPTY_KPIS);
  const [growth, setGrowth] = useState<AdminSeriesPoint[]>([]);
  const [revenue, setRevenue] = useState<AdminSeriesPoint[]>([]);
  const [plans, setPlans] = useState<AdminPlanSlice[]>([]);
  const [modules, setModules] = useState<AdminSeriesPoint[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const months = Number(range);
        const [kpiData, growthData, revenueData, planData, moduleData, usersPage, activityData] = await Promise.all([
          getAdminDashboardKpis(),
          getAdminUserGrowth(months),
          getAdminRevenueSeries(months),
          getAdminPlanDistribution(),
          getAdminModuleUsage(),
          listAdminUsers({ page: 1, pageSize: 5 }),
          getAdminActivityFeed(),
        ]);

        if (!active) return;
        setKpis(kpiData);
        setGrowth(growthData);
        setRevenue(revenueData);
        setPlans(planData);
        setModules(moduleData);
        setRecentUsers(usersPage.items.map(asRecentUser));
        setActivities(activityData.map((item) => ({
          ...item,
          id: String(item.id),
          fecha: String(item.fecha),
        })));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el panel.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [range]);

  const kpiItems: KpiItem[] = [
    { id: 'total', icon: Users, label: 'Usuarios totales', value: formatNumber(kpis.usuariosTotales) },
    { id: 'activos', icon: UserCheck, label: 'Usuarios activos', value: formatNumber(kpis.usuariosActivos) },
    { id: 'nuevos', icon: UserPlus, label: 'Nuevos registros (30 días)', value: formatNumber(kpis.nuevosRegistros) },
    { id: 'subs', icon: CreditCard, label: 'Suscripciones de pago', value: formatNumber(kpis.suscripcionesActivas) },
    { id: 'ingresos', icon: Wallet, label: 'Ingresos del mes', value: formatCurrencyCOP(kpis.ingresosMes) },
    { id: 'storage', icon: HardDrive, label: 'Almacenamiento total', value: `${kpis.almacenamientoConsumidoGB.toFixed(1)} GB` },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <div className="page-toolbar-heading">
          <span className="page-toolbar-title">Resumen general</span>
          <span className="page-toolbar-subtitle">
            {loading ? 'Cargando datos...' : 'Cifras tomadas de Supabase'}
          </span>
        </div>
        <select className="page-select" value={range} onChange={(event) => setRange(event.target.value)}>
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}

      <div className="page-section">
        <KpiGrid items={kpiItems} />
      </div>

      <div className="page-section">
        <div className="charts-grid">
          <ChartCard title="Crecimiento de usuarios" subtitle="Registros por mes">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={false} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip valueFormatter={formatNumber} />} />
                <Line type="monotone" dataKey="value" name="Usuarios" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.primary, stroke: CHART_COLORS.surface, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Ingresos por mes" subtitle="Pagos registrados">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={CHART_AXIS_LINE} tickLine={false} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip valueFormatter={formatCurrencyCOP} />} cursor={CHART_CURSOR} />
                <Bar dataKey="value" name="Ingresos" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución por plan" subtitle="Suscripciones activas">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              {plans.length === 0 ? (
                <p className="page-toolbar-subtitle">Sin planes activos.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={plans} dataKey="valor" nameKey="nombre" innerRadius={54} outerRadius={82} paddingAngle={2} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} isAnimationActive={false}>
                        {plans.map((entry) => (
                          <Cell key={entry.planId} fill={entry.color} stroke={CHART_COLORS.surface} strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormatter={formatNumber} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ChartLegend
                    items={plans.map((entry) => ({
                      id: entry.planId,
                      label: entry.nombre,
                      color: entry.color,
                      value: formatNumber(entry.valor),
                    }))}
                  />
                </>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Uso de módulos" subtitle="Registros de los últimos 30 días">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modules} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={CHART_GRID_STROKE} />
                <XAxis type="number" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11.5, fill: '#495057', fontWeight: 400 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip valueFormatter={formatNumber} />} cursor={CHART_CURSOR} />
                <Bar dataKey="value" name="Registros" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
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
          <DataTable columns={RECENT_USERS_COLUMNS} data={recentUsers} keyExtractor={(row) => row.id} emptyMessage="Todavía no hay usuarios." />
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <span className="panel-card-title">Actividad reciente</span>
          </div>
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  );
}
