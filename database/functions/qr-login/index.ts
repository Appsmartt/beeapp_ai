import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function upperStatus(status: string): string {
  return status.toUpperCase();
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const url = new URL(request.url);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const action = url.searchParams.get("action") || String(body.action || "create");

  if (action === "create") {
    const token = crypto.randomUUID() + crypto.randomUUID();
    const nonce = String(body.browser_nonce || "").trim() || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const { error } = await supabase.from("qr_logins").insert({
      token_hash: await sha256(token),
      browser_nonce_hash: await sha256(nonce),
      status: "pending",
      expires_at: expiresAt,
    });
    if (error) return json({ error: error.message }, 400);
    return json({ challenge_token: token, browser_nonce: nonce, expires_at: expiresAt });
  }

  if (action === "status") {
    const token = url.searchParams.get("token") || String(body.challenge_token || "");
    const { data, error } = await supabase
      .from("qr_logins")
      .select("status, expires_at")
      .eq("token_hash", await sha256(token))
      .maybeSingle();
    if (error || !data) return json({ error: "NOT_FOUND", message: "No encontramos el código." }, 404);
    if (data.status === "pending" && new Date(String(data.expires_at)).getTime() < Date.now()) {
      return json({ status: "EXPIRED", expires_at: data.expires_at });
    }
    return json({ status: upperStatus(String(data.status)), expires_at: data.expires_at });
  }

  if (action === "scan") {
    const authHeader = request.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const user = await userClient.auth.getUser();
    if (user.error || !user.data.user) return json({ error: "NOT_AUTHENTICATED", message: "Inicia sesión en la app para escanear el código." }, 401);
    const token = String(body.challenge_token || "");
    const pending = await supabase
      .from("qr_logins")
      .select("id, status, expires_at")
      .eq("token_hash", await sha256(token))
      .maybeSingle();
    if (pending.error || !pending.data) {
      return json({ error: "CHALLENGE_NOT_PENDING", message: "El código QR no es válido." }, 400);
    }
    if (new Date(String(pending.data.expires_at)).getTime() < Date.now() || pending.data.status === "expired") {
      await supabase.from("qr_logins").update({ status: "expired" }).eq("id", pending.data.id).eq("status", "pending");
      return json({ error: "EXPIRED", message: "El código QR venció." }, 400);
    }
    if (pending.data.status !== "pending") {
      return json({ error: "CHALLENGE_NOT_PENDING", message: "Este código ya se usó." }, 400);
    }
    const { data, error } = await supabase
      .from("qr_logins")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.data.user.id,
      })
      .eq("id", pending.data.id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();
    if (error || !data) return json({ error: "CHALLENGE_NOT_PENDING", message: "El código QR no es válido." }, 400);
    return json({
      message: "El acceso quedó autorizado en Buddy Web.",
      device: data,
    });
  }

  if (action === "activate") {
    const token = String(body.challenge_token || "");
    const found = await supabase
      .from("qr_logins")
      .select("id, status, expires_at, approved_by, consumed_at")
      .eq("token_hash", await sha256(token))
      .maybeSingle();
    const row = found.data;
    if (found.error || !row) return json({ error: "NOT_FOUND", message: "El código no existe." }, 404);
    if (row.consumed_at) return json({ error: "CONSUMED", message: "Este código ya se usó." }, 400);
    if (row.status !== "approved" || !row.approved_by) {
      return json({ error: "NOT_APPROVED", message: "Todavía no se aprobó el acceso." }, 400);
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: "EXPIRED", message: "El código venció." }, 400);
    }

    const account = await supabase.auth.admin.getUserById(row.approved_by);
    const email = account.data.user?.email;
    if (!email) return json({ error: "NO_EMAIL", message: "La cuenta no tiene correo para abrir la sesión." }, 400);

    const link = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link.data.properties?.hashed_token;
    if (link.error || !tokenHash) {
      return json({ error: "SESSION_FAILED", message: "No fue posible abrir la sesión web." }, 400);
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const verified = await anon.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
    if (verified.error || !verified.data.session) {
      return json({ error: "SESSION_FAILED", message: "No fue posible abrir la sesión web." }, 400);
    }

    await supabase.from("qr_logins").update({
      status: "consumed",
      consumed_at: new Date().toISOString(),
    }).eq("id", row.id);

    return json({
      session: {
        access_token: verified.data.session.access_token,
        refresh_token: verified.data.session.refresh_token,
      },
    });
  }

  return json({ error: "UNSUPPORTED" }, 400);
});
