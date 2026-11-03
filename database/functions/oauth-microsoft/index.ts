import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SCOPES = [
  "offline_access",
  "openid",
  "email",
  "profile",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
  "Calendars.ReadWrite",
].join(" ");

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function notConfigured(): Response {
  return json({
    error: "MICROSOFT_OAUTH_NOT_CONFIGURED",
    message: "Conexión no configurada. Carga las credenciales del proveedor en Supabase.",
  });
}

// Supabase reescribe las respuestas text/html a text/plain en el dominio por
// defecto, así que el callback devuelve un 302 al deep link de la app. Esto
// cierra el navegador de WebBrowser.openAuthSessionAsync y devuelve al usuario.
const APP_RETURN_URL = "beeapp://integrations/result";

function finish(outcome: "success" | "failure", detail?: string): Response {
  const query = new URLSearchParams({ outcome });
  if (detail) query.set("detail", detail.slice(0, 200));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${APP_RETURN_URL}?${query.toString()}`,
      "cache-control": "no-store",
    },
  });
}

function configured(): boolean {
  return Boolean(
    Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID")
    && Deno.env.get("MICROSOFT_OAUTH_CLIENT_SECRET")
    && Deno.env.get("INTEGRATION_TOKEN_KEY"),
  );
}

function redirectUri(): string {
  return Deno.env.get("MICROSOFT_OAUTH_REDIRECT_URI")
    || `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-microsoft`;
}

function service(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function encode(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

async function encryptToken(value: string): Promise<string> {
  const secret = Deno.env.get("INTEGRATION_TOKEN_KEY") ?? "";
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
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
  if (String(body.action || "start") !== "start") {
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
    tenant_id: "common",
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
      provider: "microsoft",
      capabilities,
      status: "pending",
      sync_state: syncState,
    }).select("id").single();
    if (inserted.error) return json({ error: "SAVE_FAILED", message: inserted.error.message }, 400);
  }

  const params = new URLSearchParams({
    client_id: Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID") ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    response_mode: "query",
    scope: SCOPES,
    prompt: "select_account",
    state,
  });

  return json({
    authorization_url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`,
    state,
    request_id: state,
    expires_at: expiresAt,
  });
});

async function handleCallback(url: URL): Promise<Response> {
  if (!configured()) return finish("failure", "Microsoft: conexión no configurada.");

  const state = url.searchParams.get("state") || "";
  const providerError = url.searchParams.get("error");
  const admin = service();
  const found = await admin
    .from("integrations")
    .select("id, refresh_token_ciphertext, sync_state")
    .filter("sync_state->>oauth_state", "eq", state)
    .maybeSingle();

  if (found.error || !found.data) return finish("failure", "Microsoft: el enlace venció.");
  const expires = String(found.data.sync_state?.oauth_state_expires_at || "");
  if (expires && new Date(expires).getTime() < Date.now()) {
    return finish("failure", "Microsoft: el enlace venció.");
  }
  if (providerError) {
    await admin.from("integrations").update({
      status: "error",
      sync_state: { last_error_code: providerError, message: "Conexión no configurada" },
    }).eq("id", found.data.id);
    return finish("failure", "Microsoft: no se autorizó el acceso.");
  }

  const exchanged = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: url.searchParams.get("code") || "",
      client_id: Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("MICROSOFT_OAUTH_CLIENT_SECRET") ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      scope: SCOPES,
    }),
  });
  const token = await exchanged.json().catch(() => ({}));
  if (!exchanged.ok || !token.access_token) {
    await admin.from("integrations").update({
      status: "error",
      sync_state: { last_error_code: "TOKEN_EXCHANGE_FAILED", message: "No fue posible conectar la cuenta." },
    }).eq("id", found.data.id);
    return finish("failure", "Microsoft: no fue posible completar la conexión.");
  }

  const profile = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const identity = await profile.json().catch(() => ({}));
  const email = identity.mail || identity.userPrincipalName || null;
  const access = await encryptToken(String(token.access_token));
  const refresh = token.refresh_token
    ? await encryptToken(String(token.refresh_token))
    : found.data.refresh_token_ciphertext;

  await admin.from("integrations").update({
    status: "active",
    provider_email: email,
    provider_account_id: identity.id ?? email,
    provider_display_name: identity.displayName ?? email,
    granted_scopes: String(token.scope || SCOPES).split(" ").filter(Boolean),
    access_token_ciphertext: access,
    refresh_token_ciphertext: refresh,
    token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    connected_at: new Date().toISOString(),
    sync_state: {
      configured: true,
      tenant_id: "common",
      last_successful_auth_at: new Date().toISOString(),
    },
  }).eq("id", found.data.id);

  return finish("success");
}
