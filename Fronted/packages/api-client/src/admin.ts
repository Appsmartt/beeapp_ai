import { getSupabase } from './supabase';

export class AdminRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminRequestError';
  }
}

async function callAdmin<T>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, args);

  if (error) {
    throw new AdminRequestError(error.message);
  }

  return data as T;
}

export type AdminSeriesPoint = {
  label: string;
  value: number;
};

export type AdminFlowPoint = {
  label: string;
  altas: number;
  cancelaciones: number;
};

export type AdminPlanSlice = {
  planId: string;
  nombre: string;
  valor: number;
  color: string;
};

export type AdminDashboardKpis = {
  usuariosTotales: number;
  usuariosActivos: number;
  nuevosRegistros: number;
  suscripcionesActivas: number;
  ingresosMes: number;
  almacenamientoConsumidoGB: number;
};

export type AdminSubscriptionKpis = {
  ingresosMes: number;
  ingresosAnio: number;
  altas: number;
  cancelaciones: number;
  churnRate: number;
  ingresoPromedio: number;
};

export type AdminPage<T> = {
  items: T[];
  total: number;
};

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function getAdminDashboardKpis(): Promise<AdminDashboardKpis> {
  return callAdmin<AdminDashboardKpis>('admin_dashboard_kpis').then((kpis) => ({
    usuariosTotales: asNumber(kpis.usuariosTotales),
    usuariosActivos: asNumber(kpis.usuariosActivos),
    nuevosRegistros: asNumber(kpis.nuevosRegistros),
    suscripcionesActivas: asNumber(kpis.suscripcionesActivas),
    ingresosMes: asNumber(kpis.ingresosMes),
    almacenamientoConsumidoGB: asNumber(kpis.almacenamientoConsumidoGB),
  }));
}

export function getAdminUserGrowth(months = 7): Promise<AdminSeriesPoint[]> {
  return callAdmin<AdminSeriesPoint[]>('admin_user_growth', {
    p_months: months,
  }).then((rows) => asArray(rows).map((row) => ({
    label: row.label,
    value: asNumber(row.value),
  })));
}

export function getAdminRevenueSeries(months = 7): Promise<AdminSeriesPoint[]> {
  return callAdmin<AdminSeriesPoint[]>('admin_revenue_series', {
    p_months: months,
  }).then((rows) => asArray(rows).map((row) => ({
    label: row.label,
    value: asNumber(row.value),
  })));
}

export function getAdminPlanDistribution(): Promise<AdminPlanSlice[]> {
  return callAdmin<AdminPlanSlice[]>('admin_plan_distribution').then((rows) => (
    asArray(rows).map((row) => ({
      ...row,
      valor: asNumber(row.valor),
    }))
  ));
}

export function getAdminModuleUsage(): Promise<AdminSeriesPoint[]> {
  return callAdmin<AdminSeriesPoint[]>('admin_module_usage').then((rows) => (
    asArray(rows).map((row) => ({
      label: row.label,
      value: asNumber(row.value),
    }))
  ));
}

export function getAdminSubscriptionKpis(): Promise<AdminSubscriptionKpis> {
  return callAdmin<AdminSubscriptionKpis>('admin_subscription_kpis').then((kpis) => ({
    ingresosMes: asNumber(kpis.ingresosMes),
    ingresosAnio: asNumber(kpis.ingresosAnio),
    altas: asNumber(kpis.altas),
    cancelaciones: asNumber(kpis.cancelaciones),
    churnRate: asNumber(kpis.churnRate),
    ingresoPromedio: asNumber(kpis.ingresoPromedio),
  }));
}

export function getAdminSubscriptionFlow(months = 7): Promise<AdminFlowPoint[]> {
  return callAdmin<AdminFlowPoint[]>('admin_subscription_flow', {
    p_months: months,
  }).then((rows) => asArray(rows).map((row) => ({
    label: row.label,
    altas: asNumber(row.altas),
    cancelaciones: asNumber(row.cancelaciones),
  })));
}

export function getAdminActivityFeed() {
  return callAdmin<Array<{
    id: string;
    tipo: 'registro' | 'suscripcion' | 'cancelacion' | 'alerta' | 'actualizacion';
    descripcion: string;
    fecha: string;
    usuarioNombre?: string;
  }>>('admin_activity_feed', { p_limit: 20 }).then(asArray);
}

export function listAdminUsers(params: {
  search?: string;
  status?: string;
  plan?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  return callAdmin<AdminPage<Record<string, unknown>>>('admin_list_users', {
    p_search: params.search ?? '',
    p_status: params.status ?? '',
    p_plan: params.plan ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 10,
  }).then((page) => ({
    total: asNumber(page?.total),
    items: asArray(page?.items),
  }));
}

export function getAdminUserDetail(userId: string) {
  return callAdmin<Record<string, unknown>>('admin_user_detail', {
    p_user_id: userId,
  });
}

export function setAdminUserStatus(input: {
  userId: string;
  status?: string | null;
  visibility?: string | null;
  verification?: string | null;
}) {
  return callAdmin<Record<string, unknown>>('admin_set_user_status', {
    p_user_id: input.userId,
    p_status: input.status ?? null,
    p_visibility: input.visibility ?? null,
    p_verification: input.verification ?? null,
  });
}

export function applyAdminSanction(input: {
  userId: string;
  type: string;
  reason: string;
}) {
  return callAdmin<Record<string, unknown>>('admin_apply_sanction', {
    p_user_id: input.userId,
    p_type: input.type,
    p_reason: input.reason,
  });
}

export function setAdminReportStatus(reportId: string, status: string) {
  return callAdmin<Record<string, unknown>>('admin_set_report_status', {
    p_report_id: reportId,
    p_status: status,
  });
}

export function listAdminPlans() {
  return callAdmin<Array<Record<string, unknown>>>('admin_list_plans').then(asArray);
}

export function updateAdminPlan(input: {
  planId: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  storageGb: number;
  deviceLimit: number;
  offerLimit: number;
  features: Record<string, boolean>;
  highlights: string[];
}) {
  return callAdmin<Record<string, unknown>>('admin_update_plan', {
    p_plan_id: input.planId,
    p_name: input.name,
    p_description: input.description,
    p_monthly_price: input.monthlyPrice,
    p_yearly_price: input.yearlyPrice,
    p_storage_gb: input.storageGb,
    p_device_limit: input.deviceLimit,
    p_offer_limit: input.offerLimit,
    p_features: input.features,
    p_highlights: input.highlights,
  });
}

export function listAdminTransactions(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  return callAdmin<AdminPage<Record<string, unknown>>>('admin_list_transactions', {
    p_search: params.search ?? '',
    p_status: params.status ?? '',
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 10,
  }).then((page) => ({
    total: asNumber(page?.total),
    items: asArray(page?.items),
  }));
}

export function sendAdminNotificationCampaign(input: {
  title: string;
  body: string;
  mode: 'todos' | 'segmento' | 'especificos';
  segment?: Record<string, unknown>;
  userIds?: string[];
  scheduledFor?: string | null;
}) {
  return callAdmin<{
    id: string;
    cantidadDestinatarios: number;
    estado: string;
  }>('admin_send_notification_campaign', {
    p_title: input.title,
    p_body: input.body,
    p_mode: input.mode,
    p_segment: input.segment ?? {},
    p_user_ids: input.userIds ?? [],
    p_scheduled_for: input.scheduledFor ?? null,
  }).then(async (result) => {
    if (!input.scheduledFor) {
      try {
        await getSupabase().functions.invoke('push-dispatch', { body: {} });
      } catch {
        // Las filas quedan pending y el cron de push-dispatch las reintenta.
      }
    }

    return result;
  });
}

export function listAdminCampaigns() {
  return callAdmin<Array<Record<string, unknown>>>('admin_list_campaigns').then(asArray);
}

export function getAdminSettings() {
  return callAdmin<Record<string, string>>('admin_get_settings');
}

export function setAdminSetting(key: string, value: string) {
  return callAdmin<Record<string, string>>('admin_set_setting', {
    p_key: key,
    p_value: value,
  });
}
