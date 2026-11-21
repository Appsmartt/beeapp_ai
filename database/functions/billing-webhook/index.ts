import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getFactusCollection,
  normalizeFactusDate,
  readFactusPayConfig,
  timingSafeEqualStrings,
} from "../_shared/factusPay.ts";

type Json = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ message: "Método no permitido." }, 405);

  const config = readFactusPayConfig();
  if (!config.webhookKey) {
    return json({ message: "Falta FACTUS_PAY_WEBHOOK_KEY en los secretos del proyecto." }, 503);
  }

  const incomingKey = new URL(request.url).searchParams.get("key") || "";
  if (!incomingKey || !timingSafeEqualStrings(incomingKey, config.webhookKey)) {
    return json({ message: "Llave de webhook inválida." }, 401);
  }

  const body = await request.json().catch(() => null) as Json | null;
  const data = (body?.data && typeof body.data === "object")
    ? body.data as Json
    : null;
  if (!data) return json({ message: "Notificación vacía o inválida." }, 400);

  const reference = String(data.reference_code ?? "").trim();
  const webhookStatus = String(data.status ?? "").trim().toLowerCase();
  const webhookAmount = Number(data.amount);

  if (!reference || !Number.isFinite(webhookAmount)) {
    return json({ received: true, ignored: true, reason: "missing_reference_or_amount" }, 200);
  }

  if (webhookStatus !== "paid") {
    return json({ received: true, ignored: true, status: webhookStatus }, 200);
  }

  const webhookPayer = (data.payer && typeof data.payer === "object")
    ? data.payer as Json
    : undefined;

  let confirmedStatus = webhookStatus;
  let confirmedAmount = webhookAmount;
  let confirmedBrebKey = String(data.breb_key ?? "").trim() || null;
  let confirmedCollectedAt = normalizeFactusDate(data.collected_at);
  let confirmedExpiresAt = normalizeFactusDate(data.qr_expires_at);
  let confirmedPayer = webhookPayer;
  let verifiedViaApi = false;

  // Verificación adicional recomendada por Factus Pay contra GET /v1/collections/{reference_code}.
  if (config.apiToken) {
    try {
      const apiCheck = await getFactusCollection(config, reference);
      verifiedViaApi = true;
      confirmedStatus = apiCheck.data.status;
      confirmedAmount = apiCheck.data.amount;
      confirmedBrebKey = apiCheck.data.breb_key || confirmedBrebKey;
      confirmedCollectedAt = apiCheck.data.collected_at || confirmedCollectedAt;
      confirmedExpiresAt = apiCheck.data.qr_expires_at || confirmedExpiresAt;
      confirmedPayer = (apiCheck.data.payer as Json | undefined) || confirmedPayer;

      if (confirmedStatus !== "paid") {
        console.warn("[billing-webhook] Factus Pay API no confirma estado paid aún:", {
          reference,
          webhookStatus,
          confirmedStatus,
        });
        return json({ message: "Recaudo aún no confirmado como paid en la API." }, 502);
      }

      if (Math.abs(confirmedAmount - webhookAmount) > 0.01) {
        console.error("[billing-webhook] Diferencia de monto entre webhook y API:", {
          reference,
          webhookAmount,
          confirmedAmount,
        });
        return json({ received: true, flagged: true, reason: "amount_mismatch_webhook_vs_api" }, 200);
      }
    } catch (error) {
      console.error("[billing-webhook] Error al verificar recaudo contra Factus Pay API:", {
        reference,
        error: error instanceof Error ? error.message : String(error),
      });
      return json({ message: "Error temporal verificando recaudo en Factus Pay." }, 502);
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const metadata = {
    breb_key: confirmedBrebKey,
    qr_expires_at: confirmedExpiresAt,
    collected_at: confirmedCollectedAt,
    webhook_received_at: new Date().toISOString(),
    verified_via_api: verifiedViaApi,
    ...(confirmedPayer ? { payer: confirmedPayer } : {}),
  };

  const applied = await supabase.rpc("apply_factus_payment", {
    p_reference: reference,
    p_status: confirmedStatus,
    p_amount: confirmedAmount,
    p_metadata: metadata,
  });

  if (applied.error) {
    const errMsg = applied.error.message || "";
    console.error("[billing-webhook] No se pudo aplicar el pago:", { reference, errMsg });
    // Según documentación de Factus Pay: si la referencia no existe o el monto no coincide,
    // registrar para revisión manual y responder 200 para detener reintentos inútiles.
    if (
      errMsg.includes("No existe un pago con esa referencia")
      || errMsg.includes("El monto pagado no coincide")
    ) {
      return json({ received: true, flagged: true, message: errMsg }, 200);
    }
    return json({ message: errMsg }, 500);
  }

  return json({ received: true, ok: true, result: applied.data }, 200);
});
