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

function asPlanRows(value: unknown): Record<string, unknown>[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return asPlanRows(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => (
      Boolean(item) && typeof item === 'object'
    ));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['items', 'plans', 'data']) {
      if (key in record) return asPlanRows(record[key]);
    }
  }

  return [];
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

export async function listAdminPlans(): Promise<Record<string, unknown>[]> {
  const rows = asPlanRows(await callAdmin<unknown>('admin_list_plans'));
  if (rows.length > 0) return rows;

  const { data, error } = await getSupabase().rpc('list_public_plans');
  if (error) throw new AdminRequestError(error.message);
  return asPlanRows(data);
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
  entitlements?: object;
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
    p_entitlements: input.entitlements ?? null,
  });
}

export function setAdminSubscription(input: {
  userId: string;
  planId: string;
  startsAt: string;
  endsAt: string | null;
  reason: string;
  overrides?: Record<string, unknown>;
}) {
  return callAdmin<Record<string, unknown>>('admin_set_subscription', {
    p_user_id: input.userId,
    p_plan_id: input.planId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_reason: input.reason,
    p_overrides: input.overrides ?? {},
  });
}

export function listAdminSubscriptionEvents(userId: string) {
  return callAdmin<Array<Record<string, unknown>>>('admin_list_subscription_events', {
    p_user_id: userId,
  }).then(asArray);
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

export type AdminBusinessVerificationDecision =
  | 'approve'
  | 'reject'
  | 'request_correction'
  | 'revoke';

export type AdminBusinessVerificationRequest = {
  id: string;
  display_name: string;
  city: string | null;
  owner_id: string;
  owner_name: string;
  owner_email: string | null;
  verification_status: string;
  verification_badge_visible: boolean;
  applicant_type: string | null;
  legal_name: string | null;
  tax_id: string | null;
  business_address: string | null;
  review_note: string | null;
  review_reason_text: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  document_file_id: string | null;
  document_name: string | null;
  document_bucket: string | null;
  document_path: string | null;
};

function textOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function asVerificationRequest(
  value: Record<string, unknown>,
): AdminBusinessVerificationRequest {
  return {
    id: String(value.id || ''),
    display_name: String(value.display_name || 'Negocio'),
    city: textOrNull(value.city),
    owner_id: String(value.owner_id || ''),
    owner_name: String(value.owner_name || 'Sin nombre'),
    owner_email: textOrNull(value.owner_email),
    verification_status: String(value.verification_status || ''),
    verification_badge_visible: value.verification_badge_visible === true,
    applicant_type: textOrNull(value.applicant_type),
    legal_name: textOrNull(value.legal_name),
    tax_id: textOrNull(value.tax_id),
    business_address: textOrNull(value.business_address),
    review_note: textOrNull(value.review_note),
    review_reason_text: textOrNull(value.review_reason_text),
    submitted_at: textOrNull(value.submitted_at),
    reviewed_at: textOrNull(value.reviewed_at),
    document_file_id: textOrNull(value.document_file_id),
    document_name: textOrNull(value.document_name),
    document_bucket: textOrNull(value.document_bucket),
    document_path: textOrNull(value.document_path),
  };
}

export function listAdminBusinessVerifications(status = '') {
  return callAdmin<Array<Record<string, unknown>>>(
    'admin_list_business_verifications',
    { p_status: status },
  ).then((rows) => asArray(rows).map(asVerificationRequest));
}

export function reviewAdminBusinessVerification(input: {
  businessId: string;
  decision: AdminBusinessVerificationDecision;
  reason?: string | null;
}) {
  return callAdmin<Record<string, unknown>>('admin_review_business_verification', {
    p_business_id: input.businessId,
    p_decision: input.decision,
    p_reason: input.reason ?? null,
  });
}

export async function getAdminVerificationDocumentUrl(
  bucket: string,
  path: string,
): Promise<string> {
  const { data, error } = await getSupabase()
    .storage
    .from(bucket)
    .createSignedUrl(path, 300);

  if (error || !data?.signedUrl) {
    throw new AdminRequestError(
      error?.message || 'No fue posible abrir el PDF.',
    );
  }

  return data.signedUrl;
}

export type AdminCostPlan = {
  planId: string;
  activeUsers: number;
  aiCost: number;
  callCost: number;
  storageCost: number;
  totalCost: number;
  costPerActiveUser: number;
  overThreshold: boolean;
};

export type AdminCostReport = {
  unitPrices: {
    aiCredit: number;
    callMinute: number;
    storageGb: number;
    egressGb: number;
    realtimeMinute: number;
    backendUser: number;
    otp: number;
    copPerUsd: number;
  };
  thresholds: { free: number; plus: number; pro: number };
  plans: AdminCostPlan[];
  totals: {
    ai: number;
    calls: number;
    storage: number;
    egress: number;
    realtime: number;
    backend: number;
    otp: number;
    total: number;
  };
  conversion: { freeUsers: number; paidUsers: number; rate: number };
  cohorts: Array<{
    month: string;
    users: number;
    revenueUsd: number;
    costUsd: number;
    marginUsd: number;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function getAdminCostReport() {
  return callAdmin<Record<string, unknown>>('admin_cost_report').then((row) => {
    const prices = asRecord(row.unitPrices);
    const thresholds = asRecord(row.thresholds);
    const totals = asRecord(row.totals);
    const conversion = asRecord(row.conversion);
    return {
      unitPrices: {
        aiCredit: asNumber(prices.aiCredit),
        callMinute: asNumber(prices.callMinute),
        storageGb: asNumber(prices.storageGb),
        egressGb: asNumber(prices.egressGb),
        realtimeMinute: asNumber(prices.realtimeMinute),
        backendUser: asNumber(prices.backendUser),
        otp: asNumber(prices.otp),
        copPerUsd: asNumber(prices.copPerUsd),
      },
      thresholds: {
        free: asNumber(thresholds.free),
        plus: asNumber(thresholds.plus),
        pro: asNumber(thresholds.pro),
      },
      plans: asArray(row.plans as AdminCostPlan[]).map((plan) => ({
        planId: String(plan.planId || ''),
        activeUsers: asNumber(plan.activeUsers),
        aiCost: asNumber(plan.aiCost),
        callCost: asNumber(plan.callCost),
        storageCost: asNumber(plan.storageCost),
        totalCost: asNumber(plan.totalCost),
        costPerActiveUser: asNumber(plan.costPerActiveUser),
        overThreshold: Boolean(plan.overThreshold),
      })),
      totals: {
        ai: asNumber(totals.ai),
        calls: asNumber(totals.calls),
        storage: asNumber(totals.storage),
        egress: asNumber(totals.egress),
        realtime: asNumber(totals.realtime),
        backend: asNumber(totals.backend),
        otp: asNumber(totals.otp),
        total: asNumber(totals.total),
      },
      conversion: {
        freeUsers: asNumber(conversion.freeUsers),
        paidUsers: asNumber(conversion.paidUsers),
        rate: asNumber(conversion.rate),
      },
      cohorts: asArray(row.cohorts as AdminCostReport['cohorts']).map((cohort) => ({
        month: String(cohort.month || ''),
        users: asNumber(cohort.users),
        revenueUsd: asNumber(cohort.revenueUsd),
        costUsd: asNumber(cohort.costUsd),
        marginUsd: asNumber(cohort.marginUsd),
      })),
    } satisfies AdminCostReport;
  });
}

export function markAdminRefund(paymentId: string, reason: string) {
  return callAdmin<Record<string, unknown>>('admin_mark_refund', {
    p_payment_id: paymentId,
    p_reason: reason,
  });
}

export type AdminPromotedOffer = {
  id: string;
  title: string;
  businessName: string;
  status: string;
  promotionStatus: string;
  isPromoted: boolean;
  requests: number;
};

export function listAdminPromotedOffers() {
  return callAdmin<AdminPromotedOffer[]>('admin_list_promoted_offers').then((rows) =>
    asArray(rows).map((row) => ({
      id: String(row.id || ''),
      title: String(row.title || ''),
      businessName: String(row.businessName || ''),
      status: String(row.status || ''),
      promotionStatus: String(row.promotionStatus || 'none'),
      isPromoted: Boolean(row.isPromoted),
      requests: asNumber(row.requests),
    })),
  );
}

export function setAdminOfferPromotion(offerId: string, status: string) {
  return callAdmin('admin_set_offer_promotion', {
    p_offer_id: offerId,
    p_status: status,
  });
}

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  offerType: string;
  isActive: boolean;
  sortOrder: number;
};

export function listAdminCategories() {
  return callAdmin<AdminCategory[]>('admin_list_categories').then((rows) =>
    asArray(rows).map((row) => ({
      id: String(row.id || ''),
      name: String(row.name || ''),
      slug: String(row.slug || ''),
      offerType: String(row.offerType || 'mixed'),
      isActive: Boolean(row.isActive),
      sortOrder: asNumber(row.sortOrder),
    })),
  );
}

export function saveAdminCategory(input: {
  id?: string | null;
  name: string;
  offerType: string;
  sortOrder: number;
  active: boolean;
}) {
  return callAdmin('admin_save_category', {
    p_id: input.id ?? null,
    p_name: input.name,
    p_offer_type: input.offerType,
    p_sort_order: input.sortOrder,
    p_active: input.active,
  });
}

export type AdminModerationQueue = {
  reports: Array<Record<string, unknown>>;
  statuses: Array<Record<string, unknown>>;
  businesses: Array<Record<string, unknown>>;
  offers: Array<Record<string, unknown>>;
};

export function getAdminModerationQueue() {
  return callAdmin<AdminModerationQueue>('admin_moderation_queue').then((row) => ({
    reports: asArray(row?.reports),
    statuses: asArray(row?.statuses),
    businesses: asArray(row?.businesses),
    offers: asArray(row?.offers),
  }));
}

export function hideAdminStatus(statusId: string) {
  return callAdmin('admin_hide_status', { p_status_id: statusId });
}

export function setAdminBusinessPublication(businessId: string, status: string) {
  return callAdmin('admin_set_business_publication', {
    p_business_id: businessId,
    p_status: status,
  });
}

export function setAdminOfferVisibility(offerId: string, status: string) {
  return callAdmin('admin_set_offer_visibility', {
    p_offer_id: offerId,
    p_status: status,
  });
}

export type AdminStaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
};

export function listAdminStaff() {
  return callAdmin<Array<Record<string, unknown>>>('admin_list_staff').then((rows) =>
    asArray(rows).map((row) => ({
      id: String(row.id || ''),
      name: String(row.name || ''),
      email: String(row.email || ''),
      role: String(row.role || ''),
      permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : [],
    })),
  );
}

export function setAdminStaff(input: {
  userId: string;
  role: string;
  permissions: string[];
}) {
  return callAdmin('admin_set_staff', {
    p_user_id: input.userId,
    p_role: input.role,
    p_permissions: input.permissions,
  });
}

export type AdminAuditEntry = {
  id: string;
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export function listAdminAudit(limit = 80) {
  return callAdmin<Array<Record<string, unknown>>>('admin_list_audit', { p_limit: limit }).then((rows) =>
    asArray(rows).map((row) => ({
      id: String(row.id || ''),
      actor: String(row.actor || '').trim() || 'Sistema',
      entity: String(row.entity || ''),
      entityId: String(row.entityId || ''),
      action: String(row.action || ''),
      payload: asRecord(row.payload),
      createdAt: String(row.createdAt || ''),
    })),
  );
}
