import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

class MailSyncError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

function service(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encode(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

async function cryptoKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const secret = Deno.env.get("INTEGRATION_TOKEN_KEY") ?? "";
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [usage]);
}

async function encryptToken(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await cryptoKey("encrypt"),
    new TextEncoder().encode(value),
  ));
  return `${encode(iv)}.${encode(cipher)}`;
}

async function decryptToken(payload: string): Promise<string> {
  const [iv, data] = payload.split(".");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(iv) },
    await cryptoKey("decrypt"),
    decode(data),
  );
  return new TextDecoder().decode(plain);
}

async function userId(request: Request): Promise<string | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await client.auth.getUser(bearer);
  return error ? null : data.user?.id ?? null;
}

async function accessToken(admin: SupabaseClient, row: Json, forceRefresh = false): Promise<string> {
  if (!Deno.env.get("INTEGRATION_TOKEN_KEY")) {
    throw new MailSyncError("MAIL_CONFIG_ERROR", "Falta configurar el servicio de correo de Buddy.");
  }
  const expires = new Date(String(row.token_expires_at || "")).getTime();
  if (!forceRefresh && row.access_token_ciphertext && expires > Date.now() + 60_000) {
    return decryptToken(String(row.access_token_ciphertext));
  }
  const microsoft = row.provider === "microsoft";
  const provider = microsoft ? "Outlook" : "Gmail";
  const reconnect = async (): Promise<never> => {
    // Do not disable a connection that was already renewed by calendar or by a new authorization.
    const changed = await admin.from("integrations").update({ status: "error" })
      .eq("id", row.id).eq("status", row.status).eq("updated_at", row.updated_at).select("id");
    if (changed.error || !changed.data?.length) {
      throw new MailSyncError("MAIL_SYNC_RETRY", "La conexión cambió. Buddy volverá a intentarlo.");
    }
    throw new MailSyncError("RECONNECT_REQUIRED", `Vuelve a conectar ${provider} desde Integraciones.`);
  };
  if (!row.refresh_token_ciphertext) return reconnect();
  const prefix = microsoft ? "MICROSOFT" : "GOOGLE";
  const clientId = Deno.env.get(`${prefix}_OAUTH_CLIENT_ID`);
  const clientSecret = Deno.env.get(`${prefix}_OAUTH_CLIENT_SECRET`);
  if (!clientId || !clientSecret) {
    throw new MailSyncError("MAIL_CONFIG_ERROR", `Falta configurar la conexión de Buddy con ${provider}.`);
  }
  const endpoint = microsoft
    ? "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    : "https://oauth2.googleapis.com/token";
  const response = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: await decryptToken(String(row.refresh_token_ciphertext)),
      grant_type: "refresh_token",
    }),
  });
  const token = await response.json().catch(() => ({}));
  if (!response.ok || !token.access_token) {
    if (response.status === 400 && token.error === "invalid_grant") return reconnect();
    throw new MailSyncError("TOKEN_REFRESH_FAILED", `No se pudo renovar la conexión con ${provider}. Buddy volverá a intentarlo.`);
  }
  const refreshCiphertext = token.refresh_token
    ? await encryptToken(String(token.refresh_token)) : row.refresh_token_ciphertext;
  const saved = await admin.from("integrations").update({
    access_token_ciphertext: await encryptToken(String(token.access_token)),
    refresh_token_ciphertext: refreshCiphertext,
    token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
  }).eq("id", row.id).eq("status", row.status).eq("updated_at", row.updated_at).select("updated_at");
  if (saved.error || !saved.data?.length) {
    throw new MailSyncError("TOKEN_REFRESH_FAILED", "No se pudo guardar la renovación. Buddy volverá a intentarlo.");
  }
  row.updated_at = saved.data[0].updated_at;
  row.refresh_token_ciphertext = refreshCiphertext;
  return String(token.access_token);
}

function gmailDecodeBody(data: string): string {
  return new TextDecoder().decode(decode(data));
}

function gmailCollectBodies(part: Json): { plain: string; html: string } {
  const plainParts: string[] = [];
  const htmlParts: string[] = [];

  function walk(node: Json): void {
    const body = node.body && typeof node.body === "object" ? node.body as Json : {};
    if (node.mimeType === "text/plain" && typeof body.data === "string") {
      plainParts.push(gmailDecodeBody(body.data));
    }
    if (node.mimeType === "text/html" && typeof body.data === "string") {
      htmlParts.push(gmailDecodeBody(body.data));
    }
    const children = Array.isArray(node.parts) ? node.parts : [];
    for (const child of children) walk(child as Json);
  }

  walk(part);
  return {
    plain: plainParts.join("\n\n").trim(),
    html: htmlParts.join("\n").trim(),
  };
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeMarketingPlainText(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(\.|#|[\w-]+\s*\{|[\w-]+\s*:|@media)/i.test(line));

  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped[deduped.length - 1] === line) continue;
    deduped.push(line);
  }

  return deduped.join("\n\n").slice(0, 20000);
}

interface MailWindow {
  since: string;
  end: string;
  cursor: string | null;
  lease: string;
}

async function providerJson(url: URL, token: string, options: { cursor?: boolean; allowMissing?: boolean } = {}) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (options.allowMissing && response.status === 404) return null;
  if (response.status === 401) {
    throw new MailSyncError("ACCESS_TOKEN_EXPIRED", "El proveedor solicitó renovar el acceso.");
  }
  if (options.cursor && (response.status === 400 || response.status === 410)) {
    throw new MailSyncError("CURSOR_EXPIRED", "Buddy retomará la importación de los correos pendientes.");
  }
  if (!response.ok) {
    throw new MailSyncError("PROVIDER_UNAVAILABLE", "El proveedor no respondió a la sincronización. Buddy volverá a intentarlo.");
  }
  return response.json();
}

async function saveNewMessages(admin: SupabaseClient, integrationId: unknown, lease: string, messages: Json[]): Promise<number> {
  let created = 0;
  for (let offset = 0; offset < messages.length; offset += 5) {
    const saved = await admin.rpc("store_imported_mail", {
      p_integration_id: integrationId, p_lease_id: lease, p_messages: messages.slice(offset, offset + 5),
    });
    if (saved.error) throw new Error("No se pudo guardar el correo.");
    created += Number(saved.data);
  }
  return created;
}

function addressOf(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

interface GmailMessage {
  id: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: Json;
}

interface OutlookMessage {
  id: string;
  subject?: string;
  body?: { content?: string; contentType?: string };
  bodyPreview?: string;
  from?: { emailAddress?: { address?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  receivedDateTime?: string;
  isRead?: boolean;
  isDraft?: boolean;
  flag?: { flagStatus?: string };
  parentFolderId?: string;
}

function googleMailRow(row: Json, message: GmailMessage): Json {
  const headers = Array.isArray(message.payload?.headers) ? message.payload.headers : [];
  const header = (name: string) => String(
    headers.find((entry: Json) => String(entry.name).toLowerCase() === name)?.value || "",
  );
  const { plain, html } = gmailCollectBodies(message.payload || {});
  const htmlBody = html.slice(0, 500_000);
  const plainBody = normalizeMarketingPlainText(
    plain
    || (htmlBody ? htmlToPlainText(htmlBody) : "")
    || String(message.snippet || ""),
  );
  const labels = Array.isArray(message.labelIds) ? message.labelIds : [];
  const folders = { TRASH: "trash", SPAM: "spam", DRAFT: "drafts", SENT: "sent", INBOX: "inbox" };
  const folder = Object.entries(folders).find(([label]) => labels.includes(label))?.[1] ?? "archived";
  return {
    user_id: row.user_id,
    integration_id: row.id,
    folder,
    subject: header("subject").slice(0, 500) || null,
    body: plainBody,
    actions: htmlBody ? { body_html: htmlBody } : {},
    snippet: String(message.snippet || plainBody).slice(0, 160),
    from_address: addressOf(header("from")),
    recipients: { to: header("to") ? [addressOf(header("to"))] : [] },
    is_read: !labels.includes("UNREAD"),
    is_starred: labels.includes("STARRED"),
    is_draft: labels.includes("DRAFT"),
    external_id: String(message.id),
    received_at: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date().toISOString(),
  };
}

async function syncGoogle(admin: SupabaseClient, row: Json, token: string, window: MailWindow) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("q", `after:${Math.floor(Date.parse(window.since) / 1000) - 1} before:${Math.ceil(Date.parse(window.end) / 1000)}`);
  if (window.cursor) url.searchParams.set("pageToken", window.cursor);
  const list = await providerJson(url, token, { cursor: !!window.cursor });
  const ids: string[] = (list.messages || []).map((message: { id: string }) => message.id);
  let created = 0;
  if (ids.length) {
    const existing = await admin.from("mail_messages").select("external_id")
      .eq("user_id", row.user_id).eq("integration_id", row.id).in("external_id", ids);
    if (existing.error) throw new Error("No se pudo consultar el correo importado.");
    const known = new Set(existing.data.map(message => message.external_id));
    const missing = ids.filter(id => !known.has(id));
    for (let i = 0; i < missing.length; i += 4) {
      const batch = await Promise.all(missing.slice(i, i + 4).map(id =>
        providerJson(new URL(`${url.origin}${url.pathname}/${encodeURIComponent(id)}?format=full`), token, { allowMissing: true })
      ));
      created += await saveNewMessages(admin, row.id, window.lease, batch.filter(Boolean).map(message => googleMailRow(row, message)));
    }
  }
  return { created, next: list.nextPageToken || null };
}

function microsoftMailRow(row: Json, message: OutlookMessage, folders: Map<string, string>): Json {
  const to = (message.toRecipients || []).map(item => item.emailAddress?.address).filter(Boolean);
  const from = message.from?.emailAddress?.address || null;
  const rawBody = String(message.body?.content || "");
  const contentType = String(message.body?.contentType || "").toLowerCase();
  const isHtml = contentType === "html" || /<\s*(html|body|table|div|p|!doctype)\b/i.test(rawBody);
  const htmlBody = isHtml ? rawBody.slice(0, 500_000) : "";
  const plainBody = normalizeMarketingPlainText(
    isHtml ? htmlToPlainText(rawBody) : rawBody,
  );
  return {
    user_id: row.user_id,
    integration_id: row.id,
    folder: message.isDraft ? "drafts" : folders.get(message.parentFolderId || "") ?? "archived",
    subject: message.subject ?? null,
    body: plainBody,
    actions: htmlBody ? { body_html: htmlBody } : {},
    snippet: String(message.bodyPreview || plainBody).slice(0, 160),
    from_address: from,
    recipients: { to },
    is_read: message.isRead === true,
    is_starred: message.flag?.flagStatus === "flagged",
    is_draft: message.isDraft === true,
    external_id: String(message.id),
    received_at: message.receivedDateTime || new Date().toISOString(),
  };
}

async function syncMicrosoft(admin: SupabaseClient, row: Json, token: string, window: MailWindow) {
  const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
  if (window.cursor) {
    // Only reuse Graph's pagination query on the trusted mailbox endpoint.
    url.search = window.cursor;
  } else {
    url.searchParams.set("$top", "20");
    url.searchParams.set("$select", "id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,isDraft,flag,parentFolderId");
    url.searchParams.set("$orderby", "receivedDateTime desc");
    url.searchParams.set("$filter", `receivedDateTime ge ${window.since} and receivedDateTime lt ${window.end}`);
  }
  const list = await providerJson(url, token, { cursor: !!window.cursor });
  const items: OutlookMessage[] = list.value || [];
  const folders = new Map<string, string>();
  if (items.length) {
    const names = { inbox: "inbox", sentitems: "sent", junkemail: "spam", deleteditems: "trash" };
    const response = await fetch("https://graph.microsoft.com/v1.0/$batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ requests: Object.entries(names).map(([name, id]) => ({
        id, method: "GET", url: `/me/mailFolders/${name}?$select=id`,
      })) }),
    });
    if (!response.ok) throw new Error("No se pudieron consultar las carpetas de Outlook.");
    const { responses } = await response.json();
    for (const folder of responses) {
      if (folder.status === 404) continue;
      if (folder.status !== 200 || !folder.body?.id) throw new Error("No se pudo consultar una carpeta de Outlook.");
      folders.set(folder.body.id, folder.id);
    }
  }
  const messages = items.map(message => microsoftMailRow(row, message, folders));
  const created = await saveNewMessages(admin, row.id, window.lease, messages);
  const next = list["@odata.nextLink"] ? new URL(list["@odata.nextLink"]).search : null;
  return { created, next };
}

function emailList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "email" in item) return String((item as Json).email || "");
    return "";
  }).map((item) => item.trim()).filter(Boolean);
}

function rawMessage(message: Json): string {
  const recipients = message.recipients && typeof message.recipients === "object"
    ? message.recipients as Json
    : {};
  const lines = [
    `To: ${emailList(recipients.to).join(", ")}`,
    `Cc: ${emailList(recipients.cc).join(", ")}`,
    `Subject: ${String(message.subject || "")}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    String(message.body || ""),
  ];
  return encode(new TextEncoder().encode(lines.join("\r\n")))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sendMessage(admin: SupabaseClient, row: Json, token: string, message: Json) {
  if (row.provider === "microsoft") {
    const recipients = message.recipients && typeof message.recipients === "object"
      ? message.recipients as Json
      : {};
    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: message.subject || "",
          body: { contentType: "Text", content: message.body || "" },
          toRecipients: emailList(recipients.to).map((address) => ({ emailAddress: { address } })),
          ccRecipients: emailList(recipients.cc).map((address) => ({ emailAddress: { address } })),
        },
      }),
    });
    if (!response.ok) throw new Error("No fue posible enviar el correo.");
    return;
  }

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw: rawMessage(message) }),
  });
  if (!response.ok) throw new Error("No fue posible enviar el correo.");
}

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

async function claimMailbox(admin: SupabaseClient, id: string, lease: string, ticket?: string) {
  if (!ticket) {
    const initialized = await admin.from("mail_sync_state")
      .upsert({ integration_id: id }, { onConflict: "integration_id", ignoreDuplicates: true });
    if (initialized.error) throw new Error("No se pudo preparar la sincronización.");
  }
  const now = new Date();
  let request = admin.from("mail_sync_state").update({
    dispatch_ticket: null, lease_id: lease, lease_until: new Date(now.getTime() + 180_000).toISOString(),
  }).eq("integration_id", id).or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`);
  if (ticket) request = request.eq("dispatch_ticket", ticket).gt("next_attempt_at", now.toISOString());
  const claimed = await request.select("connection_started_at,synced_through,window_end,page_cursor").maybeSingle();
  if (claimed.error) throw new Error("No se pudo iniciar la sincronización.");
  return claimed.data;
}

async function syncPage(admin: SupabaseClient, row: Json, state: Json, lease: string) {
  if (state.connection_started_at !== row.connected_at) state = {};
  let through = state.synced_through ? String(state.synced_through) : null;
  const end = state.window_end ? String(state.window_end) : new Date().toISOString();
  if (!through) {
    const latest = await admin.from("mail_messages").select("received_at")
      .eq("user_id", row.user_id).eq("integration_id", row.id).not("external_id", "is", null)
      .not("received_at", "is", null).order("received_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.error) throw new Error("No se pudo consultar la última importación.");
    // Existing mailboxes catch up from their newest imported message; new ones start with a month.
    const initial = latest.data?.received_at ? Date.parse(latest.data.received_at)
      : Math.min(Date.parse(String(row.connected_at || end)), Date.parse(end) - 30 * 86_400_000);
    through = new Date(Math.min(initial, Date.parse(end))).toISOString();
  }
  if (!state.window_end) {
    const checkpoint = await admin.from("mail_sync_state").update({
      connection_started_at: row.connected_at, synced_through: through, window_end: end, page_cursor: null,
    })
      .eq("integration_id", row.id).eq("lease_id", lease).select("integration_id").maybeSingle();
    if (checkpoint.error || !checkpoint.data) throw new Error("No se pudo guardar el inicio de la importación.");
  }
  const window: MailWindow = {
    since: new Date(Date.parse(through) - 60_000).toISOString(),
    end: new Date(end).toISOString(),
    cursor: state.page_cursor ? String(state.page_cursor) : null,
    lease,
  };
  const read = row.provider === "microsoft" ? syncMicrosoft : syncGoogle;
  let page;
  const token = await accessToken(admin, row);
  try {
    page = await read(admin, row, token, window);
  } catch (error) {
    if (!(error instanceof MailSyncError) || error.code !== "ACCESS_TOKEN_EXPIRED") throw error;
    page = await read(admin, row, await accessToken(admin, row, true), window);
  }
  return { created: page.created, through: page.next ? through : end, end: page.next ? end : null, cursor: page.next };
}

async function importMailbox(admin: SupabaseClient, row: Json, state: Json, lease: string) {
  let page = null;
  let failure: MailSyncError | null = null;
  try {
    page = await syncPage(admin, row, state, lease);
  } catch (error) {
    failure = error instanceof MailSyncError ? error
      : new MailSyncError("MAIL_SYNC_FAILED", "La importación se interrumpió. Buddy volverá a intentarlo.");
  }
  const finished = await admin.rpc("finish_mail_sync", {
    p_integration_id: row.id, p_lease_id: lease,
    p_synced_through: page?.through ?? null, p_window_end: page?.end ?? null,
    p_page_cursor: page?.cursor ?? null, p_error_code: failure?.code ?? null,
  });
  if (finished.error || !finished.data) throw new Error("No se pudo guardar el progreso de la sincronización.");
  if (failure) throw failure;
  return { integration_id: row.id, provider: row.provider, created_message_count: page!.created,
    updated_message_count: 0, synced_count: page!.created, has_more: !!page!.cursor };
}

function activeMailboxes(admin: SupabaseClient) {
  return admin.from("integrations").select("*").in("status", ["active", "connected"])
    .in("provider", ["google", "microsoft"]).contains("capabilities", ["mail"]);
}

async function handleMail(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ message: "Método no permitido." }, 405);
  const body = await request.json().catch(() => ({}));
  const action = body?.action ?? "sync";
  const admin = service();

  if (action === "scheduled") {
    const { integration_id: id, ticket } = body;
    if (typeof id !== "string" || !uuid.test(id) || typeof ticket !== "string" || !uuid.test(ticket)) {
      return json({ error: "INVALID_DISPATCH" }, 403);
    }
    const lease = crypto.randomUUID();
    const state = await claimMailbox(admin, id, lease, ticket);
    if (!state) return json({ error: "INVALID_DISPATCH" }, 403);
    // Only the mailbox named in the one-time ticket can be imported. This path cannot send mail.
    const row = await activeMailboxes(admin).eq("id", id).maybeSingle();
    if (row.error) throw new Error("No se pudo consultar la cuenta.");
    if (!row.data) return json({ status: "inactive" });
    try {
      const result = await importMailbox(admin, row.data, state, lease);
      return json({ created_message_count: result.created_message_count, has_more: result.has_more });
    } catch (error) {
      return json({ error: error instanceof MailSyncError ? error.code : "MAIL_SYNC_FAILED" }, 502);
    }
  }

  const owner = await userId(request);
  if (!owner) return json({ error: "NOT_AUTHENTICATED", message: "Inicia sesión para sincronizar el correo." }, 401);

  if (action === "send") {
    const message = await admin.from("mail_messages").select("*")
      .eq("id", body.message_id).eq("user_id", owner).maybeSingle();
    const integration = await activeMailboxes(admin)
      .eq("id", message.data?.integration_id || body.integration_id).eq("user_id", owner).maybeSingle();
    if (!message.data || !integration.data) {
      return json({ status: "reconnect_required", message: "Conexión no configurada. Vuelve a conectar la cuenta." });
    }
    try {
      const token = await accessToken(admin, integration.data);
      await sendMessage(admin, integration.data, token, message.data);
      return json({ status: "sent" });
    } catch (error) {
      return json({ status: "reconnect_required", message: error instanceof Error ? error.message : "No fue posible enviar el correo." });
    }
  }

  if (action !== "sync") return json({ message: "Acción no válida." }, 400);
  const requestedIds = [
    ...(Array.isArray(body?.integration_ids) ? body.integration_ids : []),
    ...(body?.integration_id ? [body.integration_id] : []),
  ];
  if (requestedIds.some(id => typeof id !== "string" || !uuid.test(id))) return json({ message: "Cuenta no válida." }, 400);
  let query = activeMailboxes(admin).eq("user_id", owner);
  if (requestedIds.length) query = query.in("id", requestedIds);
  const rows = await query;
  if (rows.error) throw new Error("No se pudieron consultar las cuentas.");
  const results = [];
  const failures = [];
  for (const row of rows.data) {
    try {
      const lease = crypto.randomUUID();
      const state = await claimMailbox(admin, row.id, lease);
      if (state) results.push(await importMailbox(admin, row, state, lease));
      else results.push({ integration_id: row.id, provider: row.provider, created_message_count: 0,
        updated_message_count: 0, in_progress: true });
    } catch (error) {
      failures.push({ integration_id: row.id, provider: row.provider,
        error_code: error instanceof MailSyncError ? error.code : "MAIL_SYNC_FAILED",
        detail: error instanceof MailSyncError ? error.message : "La importación se interrumpió. Buddy volverá a intentarlo." });
    }
  }

  return json({ requested_integration_count: rows.data.length, synced_integration_count: results.length,
    failed_integration_count: failures.length, results, failures });
}

Deno.serve(async request => {
  try {
    return await handleMail(request);
  } catch {
    return json({ error: "MAIL_SYNC_FAILED", message: "El servicio de correo no pudo completar la solicitud." }, 503);
  }
});
