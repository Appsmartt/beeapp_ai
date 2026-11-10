import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Intent = {
  reference: string;
  amount_in_cents: number;
  currency: string;
  plan_name: string;
  billing_period: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function allowedRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "beeapp:" || url.protocol === "exp:") return true;
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return true;
    return url.protocol === "https:" && url.pathname.includes("subscription");
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ message: "Método no permitido." }, 405);

  const publicKey = Deno.env.get("WOMPI_PUBLIC_KEY") || "";
  const integrity = Deno.env.get("WOMPI_INTEGRITY_SECRET") || "";
  if (!publicKey || !integrity) {
    return json({
      message: "Wompi todavía no está configurado. Agrega las llaves de pruebas en los secretos del proyecto.",
    }, 503);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_ANON_KEY") || "",
    {
      global: { headers: { Authorization: request.headers.get("Authorization") || "" } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user) return json({ message: "No autorizado." }, 401);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const planId = String(body.plan_id || "");
  const period = body.billing_period === "yearly" ? "yearly" : "monthly";
  const redirect = String(body.redirect_url || "");
  if (!allowedRedirect(redirect)) {
    return json({ message: "La dirección de regreso del pago no es válida." }, 400);
  }

  const intent = await supabase.rpc("create_checkout_intent", {
    p_plan_id: planId,
    p_billing_period: period,
  });
  if (intent.error || !intent.data) {
    return json({ message: intent.error?.message || "No se pudo preparar el pago." }, 400);
  }

  const data = intent.data as Intent;
  const signature = await sha256Hex(`${data.reference}${data.amount_in_cents}${data.currency}${integrity}`);
  const url = "https://checkout.wompi.co/p/"
    + `?public-key=${encodeURIComponent(publicKey)}`
    + `&currency=${encodeURIComponent(data.currency)}`
    + `&amount-in-cents=${data.amount_in_cents}`
    + `&reference=${encodeURIComponent(data.reference)}`
    + `&signature%3Aintegrity=${signature}`
    + `&redirect-url=${encodeURIComponent(redirect)}`;

  return json({
    url,
    reference: data.reference,
    amount_in_cents: data.amount_in_cents,
    currency: data.currency,
    plan_name: data.plan_name,
    billing_period: data.billing_period,
  });
});
