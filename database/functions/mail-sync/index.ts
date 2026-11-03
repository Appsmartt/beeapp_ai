import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown>;

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function service(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function decode(value: string): Uint8Array {
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
  const authorization = request.headers.get("Authorization") || "";
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
  const user = await client.auth.getUser();
  return user.data.user?.id ?? null;
}

async function accessToken(admin: SupabaseClient, row: Json): Promise<string | null> {
  if (!Deno.env.get("INTEGRATION_TOKEN_KEY") || !row.access_token_ciphertext) return null;
  const expires = row.token_expires_at ? new Date(String(row.token_expires_at)).getTime() : 0;
  if (expires > Date.now() + 60_000) return decryptToken(String(row.access_token_ciphertext));
  if (!row.refresh_token_ciphertext) return null;

  const refresh = await decryptToken(String(row.refresh_token_ciphertext));
  const provider = String(row.provider);
  const body = new URLSearchParams({
    client_id: provider === "microsoft"
      ? Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID") ?? ""
      : Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "",
    client_secret: provider === "microsoft"
      ? Deno.env.get("MICROSOFT_OAUTH_CLIENT_SECRET") ?? ""
      : Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "",
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const endpoint = provider === "microsoft"
    ? "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    : "https://oauth2.googleapis.com/token";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = await response.json().catch(() => ({}));
  if (!response.ok || !token.access_token) {
    await admin.from("integrations").update({
      status: "error",
      sync_state: {
        ...(row.sync_state && typeof row.sync_state === "object" ? row.sync_state as Json : {}),
        reauth_required_at: new Date().toISOString(),
        message: "Conexión no configurada",
      },
    }).eq("id", row.id);
    return null;
  }

  await admin.from("integrations").update({
    status: "active",
    access_token_ciphertext: await encryptToken(String(token.access_token)),
    refresh_token_ciphertext: token.refresh_token
      ? await encryptToken(String(token.refresh_token))
      : row.refresh_token_ciphertext,
    token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    sync_state: {
      ...(row.sync_state && typeof row.sync_state === "object" ? row.sync_state as Json : {}),
      last_token_refresh_at: new Date().toISOString(),
      configured: true,
    },
  }).eq("id", row.id);

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

async function readExternalIds(
  admin: SupabaseClient,
  ownerId: string,
  integrationId: string,
  externalIds: string[],
): Promise<Set<string>> {
  const ids = externalIds.filter(Boolean);
  if (!ids.length) return new Set();

  const existing = await admin
    .from("mail_messages")
    .select("external_id,is_read")
    .eq("user_id", ownerId)
    .eq("integration_id", integrationId)
    .in("external_id", ids);
  const read = new Set<string>();

  for (const item of existing.data || []) {
    if (item.is_read) read.add(String(item.external_id));
  }

  return read;
}

function addressOf(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

async function syncGoogle(admin: SupabaseClient, row: Json, token: string) {
  const listed = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await listed.json().catch(() => ({}));
  if (!listed.ok) throw new Error("No fue posible leer Gmail.");
  const ids = Array.isArray(list.messages) ? list.messages : [];
  const alreadyRead = await readExternalIds(
    admin,
    String(row.user_id),
    String(row.id),
    ids.map((item: Json) => String(item.id || "")),
  );
  let saved = 0;

  for (const item of ids) {
    const loaded = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const message = await loaded.json().catch(() => ({}));
    if (!loaded.ok) continue;
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
    const folder = labels.includes("SENT")
      ? "sent"
      : labels.includes("TRASH")
        ? "trash"
        : labels.includes("SPAM")
          ? "spam"
          : "inbox";
    const savedRow = await admin.from("mail_messages").upsert({
      user_id: row.user_id,
      integration_id: row.id,
      folder,
      subject: header("subject").slice(0, 500) || null,
      body: plainBody,
      actions: htmlBody ? { body_html: htmlBody } : {},
      snippet: String(message.snippet || plainBody).slice(0, 160),
      from_address: addressOf(header("from")),
      recipients: { to: header("to") ? [addressOf(header("to"))] : [] },
      is_read: !labels.includes("UNREAD") || alreadyRead.has(String(message.id)),
      is_starred: labels.includes("STARRED"),
      is_draft: labels.includes("DRAFT"),
      external_id: String(message.id),
      received_at: message.internalDate
        ? new Date(Number(message.internalDate)).toISOString()
        : new Date().toISOString(),
    }, { onConflict: "user_id,integration_id,external_id" });
    if (!savedRow.error) saved += 1;
  }

  return saved;
}

async function syncMicrosoft(admin: SupabaseClient, row: Json, token: string) {
  const listed = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=20&$select=id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,flag", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await listed.json().catch(() => ({}));
  if (!listed.ok) throw new Error("No fue posible leer Outlook.");
  const messages = Array.isArray(list.value) ? list.value : [];
  const alreadyRead = await readExternalIds(
    admin,
    String(row.user_id),
    String(row.id),
    messages.map((item: Json) => String(item.id || "")),
  );
  let saved = 0;

  for (const message of messages) {
    const to = Array.isArray(message.toRecipients)
      ? message.toRecipients.map((item: Json) => {
        const email = item.emailAddress && typeof item.emailAddress === "object"
          ? (item.emailAddress as Json).address
          : null;
        return email;
      }).filter(Boolean)
      : [];
    const from = message.from?.emailAddress?.address || null;
    const rawBody = String(message.body?.content || "");
    const contentType = String(message.body?.contentType || "").toLowerCase();
    const isHtml = contentType === "html" || /<\s*(html|body|table|div|p|!doctype)\b/i.test(rawBody);
    const htmlBody = isHtml ? rawBody.slice(0, 500_000) : "";
    const plainBody = normalizeMarketingPlainText(
      isHtml ? htmlToPlainText(rawBody) : rawBody,
    );
    const savedRow = await admin.from("mail_messages").upsert({
      user_id: row.user_id,
      integration_id: row.id,
      folder: "inbox",
      subject: message.subject ?? null,
      body: plainBody,
      actions: htmlBody ? { body_html: htmlBody } : {},
      snippet: String(message.bodyPreview || plainBody).slice(0, 160),
      from_address: from,
      recipients: { to },
      is_read: message.isRead === true || alreadyRead.has(String(message.id)),
      is_starred: message.flag?.flagStatus === "flagged",
      is_draft: false,
      external_id: String(message.id),
      received_at: message.receivedDateTime || new Date().toISOString(),
    }, { onConflict: "user_id,integration_id,external_id" });
    if (!savedRow.error) saved += 1;
  }

  return saved;
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

Deno.serve(async (request: Request) => {
  const owner = await userId(request);
  if (!owner) return json({ error: "NOT_AUTHENTICATED", message: "Inicia sesión para sincronizar el correo." }, 401);

  const body = await request.json().catch(() => ({}));
  const admin = service();
  const action = String(body.action || "sync");

  if (action === "send") {
    const message = await admin
      .from("mail_messages")
      .select("*")
      .eq("id", body.message_id)
      .eq("user_id", owner)
      .maybeSingle();
    const integration = await admin
      .from("integrations")
      .select("*")
      .eq("id", message.data?.integration_id || body.integration_id)
      .eq("user_id", owner)
      .maybeSingle();
    const token = integration.data ? await accessToken(admin, integration.data) : null;
    if (!message.data || !token) {
      return json({
        status: "reconnect_required",
        message: "Conexión no configurada. Vuelve a conectar la cuenta.",
      });
    }
    try {
      await sendMessage(admin, integration.data, token, message.data);
      return json({ status: "sent" });
    } catch (error) {
      return json({
        status: "reconnect_required",
        message: error instanceof Error ? error.message : "No fue posible enviar el correo.",
      });
    }
  }

  const requestedIds = [
    ...(Array.isArray(body.integration_ids) ? body.integration_ids : []),
    ...(body.integration_id ? [body.integration_id] : []),
  ].map((id) => String(id || "").trim()).filter(Boolean);
  let query = admin
    .from("integrations")
    .select("*")
    .eq("user_id", owner)
    .eq("status", "active")
    .contains("capabilities", ["mail"]);
  if (requestedIds.length > 0) query = query.in("id", requestedIds);
  const rows = await query;
  const integrations = rows.data || [];
  const results = [];
  const failures = [];

  for (const row of integrations) {
    const token = await accessToken(admin, row);
    if (!token) {
      failures.push({
        integration_id: row.id,
        detail: "Conexión no configurada",
        error_code: "RECONNECT_REQUIRED",
      });
      continue;
    }
    try {
      const saved = row.provider === "microsoft"
        ? await syncMicrosoft(admin, row, token)
        : await syncGoogle(admin, row, token);
      await admin.from("integrations").update({
        sync_state: {
          ...(row.sync_state || {}),
          last_successful_sync_at: new Date().toISOString(),
          last_attempted_sync_at: new Date().toISOString(),
          configured: true,
        },
      }).eq("id", row.id);
      results.push({ integration_id: row.id, synced_count: saved });
    } catch (error) {
      failures.push({
        integration_id: row.id,
        detail: error instanceof Error ? error.message : "No fue posible sincronizar.",
        error_code: "MAIL_SYNC_FAILED",
      });
    }
  }

  if (!integrations.length) {
    failures.push({
      detail: "Conexión no configurada",
      error_code: "RECONNECT_REQUIRED",
    });
  }

  return json({
    requested_integration_count: integrations.length,
    synced_integration_count: results.length,
    failed_integration_count: failures.length,
    results,
    failures,
  });
});
