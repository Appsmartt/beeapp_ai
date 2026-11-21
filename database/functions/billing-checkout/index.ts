import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createFactusCollection,
  normalizeFactusDate,
  readFactusPayConfig,
} from "../_shared/factusPay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckoutIntent = {
  reference: string;
  amount: number;
  amount_in_cents: number;
  currency: string;
  plan_id: string;
  plan_name: string;
  billing_period: string;
  reused?: boolean;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ message: "Método no permitido." }, 405);

  const config = readFactusPayConfig();
  if (!config.apiToken) {
    return json({
      message: "Factus Pay todavía no está configurado. Agrega FACTUS_PAY_API_TOKEN en los secretos del proyecto.",
    }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: request.headers.get("Authorization") || "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authResult = await userClient.auth.getUser();
  if (authResult.error || !authResult.data.user) {
    return json({ message: "No autorizado." }, 401);
  }
  const userId = authResult.data.user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const planId = String(body.plan_id || "").trim();
  const period = body.billing_period === "yearly" ? "yearly" : "monthly";
  const forceNew = body.force_new === true;
  const renewReference = typeof body.renew_reference === "string" ? body.renew_reference.trim() : "";

  let intentData: CheckoutIntent;

  if (renewReference) {
    const existing = await adminClient
      .from("payments")
      .select("id, user_id, plan_id, amount, currency, billing_period, status, provider, provider_reference")
      .eq("provider_reference", renewReference)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return json({ message: "No encontramos ese cobro pendiente para renovar." }, 404);
    }
    if (existing.data.status === "pagado") {
      return json({ message: "Este cobro ya fue pagado y aplicado a tu suscripción." }, 409);
    }

    const planLookup = await adminClient
      .from("plans")
      .select("id, name")
      .eq("id", existing.data.plan_id)
      .maybeSingle();

    const amount = Number(existing.data.amount || 0);
    intentData = {
      reference: String(existing.data.provider_reference),
      amount,
      amount_in_cents: Math.round(amount * 100),
      currency: String(existing.data.currency || "COP"),
      plan_id: String(existing.data.plan_id || planId),
      plan_name: String(planLookup.data?.name || existing.data.plan_id || "Plan"),
      billing_period: existing.data.billing_period === "yearly" ? "yearly" : "monthly",
      reused: true,
    };
  } else {
    if (!planId) return json({ message: "Debes indicar el plan a pagar." }, 400);
    const intent = await userClient.rpc("create_factus_checkout_intent", {
      p_plan_id: planId,
      p_billing_period: period,
      p_force_new: forceNew,
    });
    if (intent.error || !intent.data) {
      return json({ message: intent.error?.message || "No se pudo preparar el cobro." }, 400);
    }
    intentData = intent.data as CheckoutIntent;
  }

  let factus;
  try {
    factus = await createFactusCollection(config, {
      referenceCode: intentData.reference,
      amount: Number(intentData.amount),
      expirationSeconds: config.expirationSeconds,
    });
  } catch (error) {
    return json({
      message: error instanceof Error ? error.message : "No fue posible crear el cobro en Factus Pay.",
    }, 502);
  }

  const collection = factus.data;
  const expiresAt = normalizeFactusDate(collection.qr_expires_at, config.expirationSeconds);
  const metadata = {
    breb_key: collection.breb_key || null,
    qr_expires_at: expiresAt,
    provider_created_at: collection.created_at,
    collected_at: collection.collected_at,
    sandbox: config.sandbox,
    ...(collection.payer ? { payer: collection.payer } : {}),
  };

  if (collection.status === "paid") {
    await adminClient.rpc("apply_factus_payment", {
      p_reference: intentData.reference,
      p_status: "paid",
      p_amount: collection.amount || intentData.amount,
      p_metadata: { ...metadata, verified_via_api: true },
    });
  } else {
    const existingRow = await adminClient
      .from("payments")
      .select("provider_metadata")
      .eq("provider_reference", intentData.reference)
      .maybeSingle();

    const prevMeta = (existingRow.data?.provider_metadata && typeof existingRow.data.provider_metadata === "object")
      ? existingRow.data.provider_metadata as Record<string, unknown>
      : {};

    await adminClient
      .from("payments")
      .update({
        raw_status: collection.status || "ready",
        provider_transaction_id: collection.breb_key || intentData.reference,
        provider_metadata: { ...prevMeta, ...metadata },
        updated_at: new Date().toISOString(),
      })
      .eq("provider_reference", intentData.reference);
  }

  return json({
    reference: intentData.reference,
    amount: Number(intentData.amount),
    amount_in_cents: Math.round(Number(intentData.amount) * 100),
    currency: intentData.currency || "COP",
    plan_id: intentData.plan_id,
    plan_name: intentData.plan_name,
    billing_period: intentData.billing_period,
    status: collection.status || "ready",
    qr: collection.qr,
    breb_key: collection.breb_key,
    expires_at: expiresAt,
    expiration_seconds: config.expirationSeconds,
    sandbox: config.sandbox,
    reused: Boolean(intentData.reused),
  });
});
