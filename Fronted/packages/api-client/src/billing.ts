import { getSupabase } from './supabase';

export type BillingCheckout = {
  url: string;
  reference: string;
  amountInCents: number;
  currency: string;
  planName: string;
  billingPeriod: 'monthly' | 'yearly';
};

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
  redirectUrl: string;
}): Promise<BillingCheckout> {
  const invoked = await getSupabase().functions.invoke('billing-checkout', {
    body: {
      plan_id: input.planId,
      billing_period: input.billingPeriod,
      redirect_url: input.redirectUrl,
    },
  });
  if (invoked.error || !invoked.data?.url) {
    throw new Error(await invokeMessage(invoked.error, invoked.data));
  }
  const data = invoked.data as Record<string, unknown>;
  return {
    url: String(data.url),
    reference: String(data.reference || ''),
    amountInCents: Number(data.amount_in_cents || 0),
    currency: String(data.currency || 'COP'),
    planName: String(data.plan_name || ''),
    billingPeriod: data.billing_period === 'yearly' ? 'yearly' : 'monthly',
  };
}
