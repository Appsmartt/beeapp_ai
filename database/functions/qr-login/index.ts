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

Deno.serve(async (request: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const url = new URL(request.url);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const action = url.searchParams.get("action") || String(body.action || "create");

  if (action === "create") {
    const token = crypto.randomUUID() + crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const { error } = await supabase.from("qr_logins").insert({
      token_hash: await sha256(token),
      browser_nonce_hash: await sha256(nonce),
      status: "pending",
      expires_at: expiresAt,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ challenge_token: token, browser_nonce: nonce, expires_at: expiresAt });
  }

  if (action === "status") {
    const token = url.searchParams.get("token") || String(body.challenge_token || "");
    const { data, error } = await supabase
      .from("qr_logins")
      .select("status, expires_at")
      .eq("token_hash", await sha256(token))
      .maybeSingle();
    if (error || !data) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    return Response.json({ status: upperStatus(String(data.status)), expires_at: data.expires_at });
  }

  if (action === "scan") {
    const authHeader = request.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const user = await userClient.auth.getUser();
    if (user.error || !user.data.user) return Response.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    const token = String(body.challenge_token || "");
    const { data, error } = await supabase
      .from("qr_logins")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.data.user.id,
      })
      .eq("token_hash", await sha256(token))
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();
    if (error || !data) return Response.json({ error: "CHALLENGE_NOT_PENDING" }, { status: 400 });
    return Response.json({ message: "Acceso aprobado.", device: data });
  }

  if (action === "activate") {
    const token = String(body.challenge_token || "");
    const found = await supabase
      .from("qr_logins")
      .select("id, status, expires_at, approved_by, consumed_at")
      .eq("token_hash", await sha256(token))
      .maybeSingle();
    const row = found.data;
    if (found.error || !row) return Response.json({ error: "NOT_FOUND", message: "El código no existe." }, { status: 404 });
    if (row.consumed_at) return Response.json({ error: "CONSUMED", message: "Este código ya se usó." }, { status: 400 });
    if (row.status !== "approved" || !row.approved_by) {
      return Response.json({ error: "NOT_APPROVED", message: "Todavía no se aprobó el acceso." }, { status: 400 });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return Response.json({ error: "EXPIRED", message: "El código venció." }, { status: 400 });
    }

    const account = await supabase.auth.admin.getUserById(row.approved_by);
    const email = account.data.user?.email;
    if (!email) return Response.json({ error: "NO_EMAIL", message: "La cuenta no tiene correo para abrir la sesión." }, { status: 400 });

    const link = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link.data.properties?.hashed_token;
    if (link.error || !tokenHash) {
      return Response.json({ error: "SESSION_FAILED", message: "No fue posible abrir la sesión web." }, { status: 400 });
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const verified = await anon.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
    if (verified.error || !verified.data.session) {
      return Response.json({ error: "SESSION_FAILED", message: "No fue posible abrir la sesión web." }, { status: 400 });
    }

    await supabase.from("qr_logins").update({
      status: "consumed",
      consumed_at: new Date().toISOString(),
    }).eq("id", row.id);

    return Response.json({
      session: {
        access_token: verified.data.session.access_token,
        refresh_token: verified.data.session.refresh_token,
      },
    });
  }

  return Response.json({ error: "UNSUPPORTED" }, { status: 400 });
});
