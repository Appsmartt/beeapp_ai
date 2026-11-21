import { getSupabase } from './supabase';

export type FactusPaymentStatus = 'ready' | 'paid' | 'failed';

export type BillingCheckout = {
  reference: string;
  amount: number;
  amountInCents: number;
  currency: string;
  planId: string;
  planName: string;
  billingPeriod: 'monthly' | 'yearly';
  status: FactusPaymentStatus;
  qr: string | null;
  brebKey: string;
  expiresAt: string | null;
  expirationSeconds: number;
  sandbox: boolean;
  reused: boolean;
};

export type BillingStatus = {
  reference: string;
  status: FactusPaymentStatus;
  activated: boolean;
  subscriptionId?: string | null;
  endsAt?: string | null;
  amount: number;
  qr?: string | null;
  brebKey?: string;
  expiresAt?: string | null;
  collectedAt?: string | null;
};

export type MyPaymentRecord = {
  id: string;
  planId: string | null;
  billingPeriod: 'monthly' | 'yearly' | null;
  transactionType: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  provider: string | null;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseStatus(value: unknown): FactusPaymentStatus {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'paid' || normalized === 'approved') return 'paid';
  if (normalized === 'failed' || normalized === 'declined' || normalized === 'expired') return 'failed';
  return 'ready';
}

async function invokeMessage(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
        return body.message;
      }
    } catch {
      // El cuerpo del error no siempre es JSON.
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudo iniciar el pago.';
}

export async function startBillingCheckout(input: {
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  forceNew?: boolean;
  renewReference?: string;
}): Promise<BillingCheckout> {
  const invoked = await getSupabase().functions.invoke('billing-checkout', {
    body: {
      plan_id: input.planId,
      billing_period: input.billingPeriod,
      force_new: input.forceNew === true,
      ...(input.renewReference ? { renew_reference: input.renewReference } : {}),
    },
  });
  if (invoked.error || !invoked.data?.reference) {
    throw new Error(await invokeMessage(invoked.error, invoked.data));
  }
  const data = invoked.data as Record<string, unknown>;
  const amount = Number(data.amount ?? (Number(data.amount_in_cents || 0) / 100));
  return {
    reference: String(data.reference || ''),
    amount,
    amountInCents: Number(data.amount_in_cents || Math.round(amount * 100)),
    currency: String(data.currency || 'COP'),
    planId: String(data.plan_id || input.planId),
    planName: String(data.plan_name || ''),
    billingPeriod: data.billing_period === 'yearly' ? 'yearly' : 'monthly',
    status: parseStatus(data.status),
    qr: typeof data.qr === 'string' && data.qr.trim() ? data.qr.trim() : null,
    brebKey: String(data.breb_key || ''),
    expiresAt: typeof data.expires_at === 'string' && data.expires_at.trim() ? data.expires_at : null,
    expirationSeconds: Number(data.expiration_seconds || 1800),
    sandbox: Boolean(data.sandbox),
    reused: Boolean(data.reused),
  };
}

export async function checkBillingStatus(reference: string): Promise<BillingStatus> {
  const invoked = await getSupabase().functions.invoke('billing-status', {
    body: { reference },
  });
  if (invoked.error || !invoked.data?.reference) {
    throw new Error(await invokeMessage(invoked.error, invoked.data));
  }
  const data = invoked.data as Record<string, unknown>;
  return {
    reference: String(data.reference || reference),
    status: parseStatus(data.status),
    activated: Boolean(data.activated),
    subscriptionId: typeof data.subscription_id === 'string' ? data.subscription_id : null,
    endsAt: typeof data.ends_at === 'string' ? data.ends_at : null,
    amount: Number(data.amount || 0),
    qr: typeof data.qr === 'string' && data.qr.trim() ? data.qr.trim() : null,
    brebKey: typeof data.breb_key === 'string' ? data.breb_key : undefined,
    expiresAt: typeof data.expires_at === 'string' && data.expires_at.trim() ? data.expires_at : null,
    collectedAt: typeof data.collected_at === 'string' && data.collected_at.trim() ? data.collected_at : null,
  };
}

export async function listMyPayments(limit = 10): Promise<MyPaymentRecord[]> {
  const supabase = getSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('id, plan_id, billing_period, transaction_type, status, amount, currency, payment_method, provider, provider_reference, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ''),
    planId: typeof row.plan_id === 'string' ? row.plan_id : null,
    billingPeriod: row.billing_period === 'yearly' ? 'yearly' : row.billing_period === 'monthly' ? 'monthly' : null,
    transactionType: String(row.transaction_type ?? ''),
    status: String(row.status ?? ''),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'COP'),
    paymentMethod: typeof row.payment_method === 'string' ? row.payment_method : null,
    provider: typeof row.provider === 'string' ? row.provider : null,
    reference: typeof row.provider_reference === 'string' ? row.provider_reference : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? row.created_at ?? ''),
  }));
}
