import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function notConfigured(): Response {
  return json({
    error: "GOOGLE_OAUTH_NOT_CONFIGURED",
    message: "Conexión no configurada. Carga las credenciales del proveedor en Supabase.",
  });
}

function page(title: string, text: string): Response {
  const safeTitle = title.replace(/[<>]/g, "");
  const safeText = text.replace(/[<>]/g, "");
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>${safeTitle}</title><body style="font-family:sans-serif;padding:32px"><h1>${safeTitle}</h1><p>${safeText}</p></body>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function configured(): boolean {
  return Boolean(
    Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")
    && Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")
    && Deno.env.get("INTEGRATION_TOKEN_KEY"),
  );
}

function redirectUri(): string {
  return Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI")
    || `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-google`;
}

function service(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function aesKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("INTEGRATION_TOKEN_KEY") ?? "";
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
}

function encode(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

async function encryptToken(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await aesKey(),
    new TextEncoder().encode(value),
  ));
  return `${encode(iv)}.${encode(cipher)}`;
}

async function currentUser(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
  const user = await client.auth.getUser();
  return user.data.user;
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);

  if (request.method === "GET" && (url.searchParams.has("code") || url.searchParams.has("error"))) {
    return handleCallback(url);
  }

  if (!configured()) return notConfigured();

  const body = request.method === "POST"
    ? await request.json().catch(() => ({}))
    : {};
  const action = String(body.action || "start");
  if (action !== "start") {
    return json({ error: "UNSUPPORTED", message: "Acción no disponible." }, 400);
  }

  const user = await currentUser(request);
  if (!user) return json({ error: "NOT_AUTHENTICATED", message: "Inicia sesión para conectar la cuenta." }, 401);

  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const capabilities = Array.isArray(body.capabilities) && body.capabilities.length
    ? body.capabilities.filter((item: unknown) => item === "mail" || item === "calendar")
    : ["mail", "calendar"];
  const admin = service();
  const syncState = {
    oauth_state: state,
    oauth_state_expires_at: expiresAt,
    configured: true,
  };

  if (body.connection_id) {
    const updated = await admin
      .from("integrations")
      .update({ status: "pending", capabilities, sync_state: syncState })
      .eq("id", body.connection_id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (updated.error || !updated.data) {
      return json({ error: "NOT_FOUND", message: "No encontramos esa conexión." }, 404);
    }
  } else {
    const inserted = await admin.from("integrations").insert({
      user_id: user.id,
      provider: "google",
      capabilities,
      status: "pending",
      sync_state: syncState,
    }).select("id").single();
    if (inserted.error) return json({ error: "SAVE_FAILED", message: inserted.error.message }, 400);
  }

  const params = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return json({
    authorization_url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state,
    request_id: state,
    expires_at: expiresAt,
  });
});

async function handleCallback(url: URL): Promise<Response> {
  if (!configured()) return page("Conexión no configurada", "Faltan las credenciales de Google en Supabase.");

  const state = url.searchParams.get("state") || "";
  const providerError = url.searchParams.get("error");
  const admin = service();
  const found = await admin
    .from("integrations")
    .select("id, refresh_token_ciphertext, sync_state")
    .filter("sync_state->>oauth_state", "eq", state)
    .maybeSingle();

  if (found.error || !found.data) return page("Conexión no encontrada", "El enlace venció. Vuelve a intentarlo desde Buddy AI.");
  const expires = String(found.data.sync_state?.oauth_state_expires_at || "");
  if (expires && new Date(expires).getTime() < Date.now()) {
    return page("Enlace vencido", "Vuelve a iniciar la conexión desde Buddy AI.");
  }
  if (providerError) {
    await admin.from("integrations").update({
      status: "error",
      sync_state: { last_error_code: providerError, message: "Conexión no configurada" },
    }).eq("id", found.data.id);
    return page("No se conectó la cuenta", "Google no autorizó el acceso. Puedes volver a Buddy AI.");
  }

  const exchanged = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: url.searchParams.get("code") || "",
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const token = await exchanged.json().catch(() => ({}));
  if (!exchanged.ok || !token.access_token) {
    await admin.from("integrations").update({
      status: "error",
      sync_state: { last_error_code: "TOKEN_EXCHANGE_FAILED", message: "No fue posible conectar la cuenta." },
    }).eq("id", found.data.id);
    return page("No se conectó la cuenta", "No fue posible completar la conexión. Vuelve a Buddy AI e inténtalo de nuevo.");
  }

  const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const identity = await profile.json().catch(() => ({}));
  const access = await encryptToken(String(token.access_token));
  const refresh = token.refresh_token
    ? await encryptToken(String(token.refresh_token))
    : found.data.refresh_token_ciphertext;

  await admin.from("integrations").update({
    status: "active",
    provider_email: identity.email ?? null,
    provider_account_id: identity.id ?? identity.email ?? null,
    provider_display_name: identity.name ?? identity.email ?? null,
    granted_scopes: String(token.scope || SCOPES).split(" ").filter(Boolean),
    access_token_ciphertext: access,
    refresh_token_ciphertext: refresh,
    token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    connected_at: new Date().toISOString(),
    sync_state: {
      configured: true,
      avatar_url: identity.picture ?? null,
      last_successful_auth_at: new Date().toISOString(),
    },
  }).eq("id", found.data.id);

  return page("Cuenta conectada", "Google quedó conectado. Puedes volver a Buddy AI.");
}
