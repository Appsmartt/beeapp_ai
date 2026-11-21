import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getFactusCollection,
  normalizeFactusDate,
  readFactusPayConfig,
} from "../_shared/factusPay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const reference = String(body.reference || "").trim();
  if (!reference) return json({ message: "Falta la referencia del pago." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const paymentLookup = await adminClient
    .from("payments")
    .select("id, user_id, amount, status, subscription_id, provider_reference, provider_metadata")
    .eq("provider_reference", reference)
    .eq("user_id", userId)
    .maybeSingle();

  if (paymentLookup.error || !paymentLookup.data) {
    return json({ message: "No encontramos un pago asociado a esa referencia." }, 404);
  }

  const payment = paymentLookup.data;
  const currentMeta = (payment.provider_metadata && typeof payment.provider_metadata === "object")
    ? payment.provider_metadata as Record<string, unknown>
    : {};

  if (payment.status === "pagado") {
    return json({
      reference,
      status: "paid",
      activated: true,
      subscription_id: payment.subscription_id,
      amount: Number(payment.amount || 0),
      breb_key: String(currentMeta.breb_key || ""),
      expires_at: typeof currentMeta.qr_expires_at === "string" ? currentMeta.qr_expires_at : null,
      collected_at: typeof currentMeta.collected_at === "string" ? currentMeta.collected_at : null,
    });
  }

  let factus;
  try {
    factus = await getFactusCollection(config, reference);
  } catch (error) {
    return json({
      message: error instanceof Error ? error.message : "No fue posible consultar el estado del pago en Factus Pay.",
    }, 502);
  }

  const collection = factus.data;
  const expiresAt = normalizeFactusDate(collection.qr_expires_at);
  const metadata = {
    breb_key: collection.breb_key || currentMeta.breb_key || null,
    qr_expires_at: expiresAt || currentMeta.qr_expires_at || null,
    collected_at: collection.collected_at,
    last_polled_at: new Date().toISOString(),
    verified_via_api: true,
    ...(collection.payer ? { payer: collection.payer } : {}),
  };

  if (collection.status === "paid") {
    const applied = await adminClient.rpc("apply_factus_payment", {
      p_reference: reference,
      p_status: "paid",
      p_amount: collection.amount,
      p_metadata: metadata,
    });
    if (applied.error) {
      return json({ message: applied.error.message }, 400);
    }
    const result = (applied.data && typeof applied.data === "object")
      ? applied.data as Record<string, unknown>
      : {};

    return json({
      reference,
      status: "paid",
      activated: true,
      subscription_id: result.subscription_id ?? null,
      ends_at: result.ends_at ?? null,
      amount: collection.amount,
      breb_key: collection.breb_key,
      expires_at: expiresAt,
      collected_at: collection.collected_at,
    });
  }

  if (collection.status === "failed") {
    await adminClient.rpc("apply_factus_payment", {
      p_reference: reference,
      p_status: "failed",
      p_amount: collection.amount,
      p_metadata: metadata,
    });
  }

  return json({
    reference,
    status: collection.status || "ready",
    activated: false,
    amount: collection.amount || Number(payment.amount || 0),
    qr: collection.qr,
    breb_key: collection.breb_key || String(currentMeta.breb_key || ""),
    expires_at: expiresAt || (typeof currentMeta.qr_expires_at === "string" ? currentMeta.qr_expires_at : null),
    collected_at: collection.collected_at,
  });
});
