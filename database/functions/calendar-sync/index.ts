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
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encode(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

async function cryptoKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(Deno.env.get("INTEGRATION_TOKEN_KEY") ?? ""),
  );
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
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: request.headers.get("Authorization") || "" } } },
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
  const microsoft = row.provider === "microsoft";
  const response = await fetch(
    microsoft
      ? "https://login.microsoftonline.com/common/oauth2/v2.0/token"
      : "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: microsoft
          ? Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID") ?? ""
          : Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "",
        client_secret: microsoft
          ? Deno.env.get("MICROSOFT_OAUTH_CLIENT_SECRET") ?? ""
          : Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "",
        refresh_token: refresh,
        grant_type: "refresh_token",
      }),
    },
  );
  const token = await response.json().catch(() => ({}));
  if (!response.ok || !token.access_token) return null;

  await admin.from("integrations").update({
    access_token_ciphertext: await encryptToken(String(token.access_token)),
    refresh_token_ciphertext: token.refresh_token
      ? await encryptToken(String(token.refresh_token))
      : row.refresh_token_ciphertext,
    token_expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
  }).eq("id", row.id);
  return String(token.access_token);
}

async function discoverGoogle(admin: SupabaseClient, row: Json, token: string) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("No fue posible leer los calendarios de Google.");
  const items = Array.isArray(payload.items) ? payload.items : [];
  for (const item of items) {
    await admin.from("calendars").upsert({
      owner_id: row.user_id,
      integration_id: row.id,
      external_id: String(item.id),
      name: item.summary || "Calendario",
      description: item.description ?? null,
      color: item.backgroundColor || "#6025D2",
      timezone: item.timeZone || "America/Bogota",
      is_default: item.primary === true,
      visibility: "private",
    }, { onConflict: "owner_id,integration_id,external_id" });
  }
  return items.length;
}

async function discoverMicrosoft(admin: SupabaseClient, row: Json, token: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars?$top=50", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("No fue posible leer los calendarios de Microsoft.");
  const items = Array.isArray(payload.value) ? payload.value : [];
  for (const item of items) {
    await admin.from("calendars").upsert({
      owner_id: row.user_id,
      integration_id: row.id,
      external_id: String(item.id),
      name: item.name || "Calendario",
      color: "#6025D2",
      timezone: "America/Bogota",
      is_default: item.isDefaultCalendar === true,
      visibility: "private",
    }, { onConflict: "owner_id,integration_id,external_id" });
  }
  return items.length;
}

async function syncEvents(admin: SupabaseClient, row: Json, token: string) {
  const calendars = await admin
    .from("calendars")
    .select("id, external_id, is_archived")
    .eq("integration_id", row.id)
    .eq("owner_id", row.user_id);
  const visible = (calendars.data || []).filter((item) => item.is_archived !== true && item.external_id);
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  let fetched = 0;
  let created = 0;
  let updated = 0;

  for (const calendar of visible) {
    const endpoint = row.provider === "microsoft"
      ? `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendar.external_id)}/events?$top=50`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.external_id)}/events?maxResults=50&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}`;
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) continue;
    const items = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.value)
        ? payload.value
        : [];

    for (const item of items) {
      fetched += 1;
      const existing = await admin
        .from("events")
        .select("id")
        .eq("calendar_id", calendar.id)
        .eq("external_id", String(item.id))
        .maybeSingle();
      const allDay = Boolean(item.start?.date && !item.start?.dateTime) || item.isAllDay === true;
      const startsAt = item.start?.dateTime || item.start?.date || null;
      const endsAt = item.end?.dateTime || item.end?.date || null;
      const write = {
        calendar_id: calendar.id,
        organizer_id: row.user_id,
        title: item.summary || item.subject || "Evento",
        description: item.description || item.bodyPreview || null,
        kind: "in_person",
        status: item.status === "cancelled" ? "cancelled" : "confirmed",
        starts_at: allDay ? null : startsAt,
        ends_at: allDay ? null : endsAt,
        starts_on: allDay ? String(item.start?.date || item.start?.dateTime || "").slice(0, 10) : null,
        ends_on: allDay ? String(item.end?.date || item.end?.dateTime || "").slice(0, 10) : null,
        is_all_day: allDay,
        timezone: item.start?.timeZone || "America/Bogota",
        location_name: item.location?.displayName || (typeof item.location === "string" ? item.location : null),
        external_id: String(item.id),
        metadata: { source: row.provider },
      };
      const saved = existing.data
        ? await admin.from("events").update(write).eq("id", existing.data.id)
        : await admin.from("events").insert(write);
      if (!saved.error) {
        if (existing.data) updated += 1;
        else created += 1;
      }
    }
  }

  return { fetched, created, updated, calendars: visible.length };
}

Deno.serve(async (request: Request) => {
  const owner = await userId(request);
  if (!owner) return json({ message: "Inicia sesión para sincronizar la agenda." }, 401);

  const body = await request.json().catch(() => ({}));
  const admin = service();
  const integration = await admin
    .from("integrations")
    .select("*")
    .eq("id", body.integration_id)
    .eq("user_id", owner)
    .maybeSingle();
  const token = integration.data ? await accessToken(admin, integration.data) : null;
  if (!integration.data || !token) {
    return json({
      discovered_count: 0,
      synced_external_calendar_count: 0,
      fetched_event_count: 0,
      created_event_count: 0,
      updated_event_count: 0,
      skipped_event_count: 0,
      synced_events_count: 0,
      message: "Conexión no configurada. Vuelve a conectar la cuenta.",
    });
  }

  try {
    if (body.action === "discover") {
      const discovered = integration.data.provider === "microsoft"
        ? await discoverMicrosoft(admin, integration.data, token)
        : await discoverGoogle(admin, integration.data, token);
      return json({ discovered_count: discovered, message: null });
    }

    const totals = await syncEvents(admin, integration.data, token);
    return json({
      synced_external_calendar_count: totals.calendars,
      fetched_event_count: totals.fetched,
      created_event_count: totals.created,
      updated_event_count: totals.updated,
      skipped_event_count: Math.max(totals.fetched - totals.created - totals.updated, 0),
      synced_events_count: totals.created + totals.updated,
      message: null,
    });
  } catch (error) {
    return json({
      discovered_count: 0,
      synced_external_calendar_count: 0,
      fetched_event_count: 0,
      created_event_count: 0,
      updated_event_count: 0,
      skipped_event_count: 0,
      synced_events_count: 0,
      message: error instanceof Error ? error.message : "No fue posible sincronizar la agenda.",
    });
  }
});
