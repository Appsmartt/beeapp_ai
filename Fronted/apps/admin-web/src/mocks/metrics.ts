import type { DashboardKpis, SubscriptionKpis, SeriesPoint, PlanDistributionPoint, SubscriptionFlowPoint } from './types';

export const DASHBOARD_KPIS: DashboardKpis = {
  usuariosTotales: 1130,
  usuariosActivos: 842,
  nuevosRegistros: 58,
  suscripcionesActivas: 618,
  ingresosMes: 42350000,
  almacenamientoConsumidoGB: 318.4,
};

export const SUBSCRIPTION_KPIS: SubscriptionKpis = {
  ingresosMes: 42350000,
  ingresosAnio: 268400000,
  altas: 46,
  cancelaciones: 9,
  churnRate: 1.9,
  ingresoPromedio: 68500,
};

export const USER_GROWTH_SERIES: SeriesPoint[] = [
  { label: 'Ene', value: 780 },
  { label: 'Feb', value: 820 },
  { label: 'Mar', value: 860 },
  { label: 'Abr', value: 905 },
  { label: 'May', value: 960 },
  { label: 'Jun', value: 1040 },
  { label: 'Jul', value: 1130 },
];

export const REVENUE_SERIES: SeriesPoint[] = [
  { label: 'Ene', value: 28500000 },
  { label: 'Feb', value: 30200000 },
  { label: 'Mar', value: 31800000 },
  { label: 'Abr', value: 34100000 },
  { label: 'May', value: 37600000 },
  { label: 'Jun', value: 39900000 },
  { label: 'Jul', value: 42350000 },
];

export const PLAN_DISTRIBUTION: PlanDistributionPoint[] = [
  { planId: 'free', nombre: 'Free', valor: 512, color: '#ADB5BD' },
  { planId: 'plus', nombre: 'Plus', valor: 348, color: '#6025D2' },
  { planId: 'pro', nombre: 'Pro', valor: 196, color: '#EB6834' },
  { planId: 'enterprise', nombre: 'Enterprise', valor: 74, color: '#1BAF7A' },
];

export const SUBSCRIPTIONS_FLOW_SERIES: SubscriptionFlowPoint[] = [
  { label: 'Ene', altas: 38, cancelaciones: 6 },
  { label: 'Feb', altas: 41, cancelaciones: 5 },
  { label: 'Mar', altas: 35, cancelaciones: 8 },
  { label: 'Abr', altas: 44, cancelaciones: 7 },
  { label: 'May', altas: 50, cancelaciones: 9 },
  { label: 'Jun', altas: 47, cancelaciones: 10 },
  { label: 'Jul', altas: 46, cancelaciones: 9 },
];

export const MODULE_USAGE_SERIES: SeriesPoint[] = [
  { label: 'Mensajería', value: 92 },
  { label: 'Llamadas', value: 47 },
  { label: 'Calendario', value: 38 },
  { label: 'Notas', value: 29 },
  { label: 'Asistente IA', value: 21 },
];
