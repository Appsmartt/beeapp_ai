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

async function visibleCalendars(admin: SupabaseClient, row: Json) {
  const calendars = await admin
    .from("calendars")
    .select("id, external_id, is_archived")
    .eq("integration_id", row.id)
    .eq("owner_id", row.user_id);
  return (calendars.data || []).filter((item) => item.is_archived !== true && item.external_id);
}

function providerError(payload: Json): string {
  const error = payload.error;
  if (error && typeof error === "object") {
    const record = error as Json;
    if (typeof record.message === "string" && record.message) return record.message;
  }
  return "No fue posible leer los eventos del calendario.";
}

async function listProviderEvents(
  provider: string,
  calendarId: string,
  token: string,
  start: string,
  end: string,
): Promise<{ items: Json[]; failure: string }> {
  const items: Json[] = [];
  let pageToken = "";
  let nextLink = "";

  for (let page = 0; page < 5; page += 1) {
    const endpoint = nextLink || (provider === "microsoft"
      ? `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=100`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=100&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`);
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => ({})) as Json;
    if (!response.ok) return { items, failure: providerError(payload) };

    const batch = Array.isArray(payload.items)
      ? payload.items as Json[]
      : Array.isArray(payload.value)
        ? payload.value as Json[]
        : [];
    items.push(...batch);
    pageToken = typeof payload.nextPageToken === "string" ? payload.nextPageToken : "";
    nextLink = typeof payload["@odata.nextLink"] === "string" ? String(payload["@odata.nextLink"]) : "";
    if (!pageToken && !nextLink) break;
  }

  return { items, failure: "" };
}

function dateOnly(value: unknown): string | null {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function deletedExternalIdMap(syncState: unknown): Json {
  const state = syncState && typeof syncState === "object" && !Array.isArray(syncState)
    ? syncState as Json
    : {};
  const deleted = state.deleted_external_ids;
  return deleted && typeof deleted === "object" && !Array.isArray(deleted)
    ? { ...(deleted as Json) }
    : {};
}

function freshDeletedExternalIdSet(syncState: unknown): Set<string> {
  const cutoff = Date.now() - 15 * 60 * 1000;
  const ids = new Set<string>();
  for (const [externalId, deletedAt] of Object.entries(deletedExternalIdMap(syncState))) {
    if (new Date(String(deletedAt)).getTime() >= cutoff) ids.add(externalId);
  }
  return ids;
}

async function freshDeletedExternalIds(admin: SupabaseClient, integrationId: string): Promise<Set<string>> {
  const current = await admin.from("integrations").select("sync_state").eq("id", integrationId).maybeSingle();
  return freshDeletedExternalIdSet(current.data?.sync_state);
}

async function rememberDeletedExternalId(admin: SupabaseClient, integration: Json, externalId: string) {
  const state = integration.sync_state && typeof integration.sync_state === "object" && !Array.isArray(integration.sync_state)
    ? { ...(integration.sync_state as Json) }
    : {};
  const deleted = deletedExternalIdMap(state);
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, value] of Object.entries(deleted)) {
    if (new Date(String(value)).getTime() < cutoff) delete deleted[key];
  }
  deleted[externalId] = new Date().toISOString();
  state.deleted_external_ids = deleted;
  await admin.from("integrations").update({ sync_state: state }).eq("id", integration.id);
}

async function syncEvents(admin: SupabaseClient, row: Json, token: string) {
  let visible = await visibleCalendars(admin, row);
  if (!visible.length) {
    if (row.provider === "microsoft") await discoverMicrosoft(admin, row, token);
    else await discoverGoogle(admin, row, token);
    visible = await visibleCalendars(admin, row);
  }

  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  let fetched = 0;
  let created = 0;
  let updated = 0;
  let failure = "";
  let readableCalendars = 0;

  for (const calendar of visible) {
    const listed = await listProviderEvents(
      String(row.provider || ""),
      String(calendar.external_id),
      token,
      start,
      end,
    );
    if (listed.failure) {
      if (!failure) failure = listed.failure;
      continue;
    }
    readableCalendars += 1;
    const deletedIds = await freshDeletedExternalIds(admin, String(row.id));

    for (const item of listed.items) {
      if (!item.id || item.status === "cancelled") continue;
      if (deletedIds.has(String(item.id))) {
        await admin
          .from("events")
          .delete()
          .eq("calendar_id", calendar.id)
          .eq("external_id", String(item.id));
        continue;
      }
      fetched += 1;
      const existing = await admin
        .from("events")
        .select("id, metadata, color, kind")
        .eq("calendar_id", calendar.id)
        .eq("external_id", String(item.id))
        .maybeSingle();
      const existingMetadata = existing.data?.metadata
        && typeof existing.data.metadata === "object"
        && !Array.isArray(existing.data.metadata)
        ? existing.data.metadata as Json
        : {};
      const localEditAt = existingMetadata.local_edit_at
        ? new Date(String(existingMetadata.local_edit_at)).getTime()
        : 0;
      const providerUpdated = new Date(String(item.updated || item.lastModifiedDateTime || "")).getTime();
      if (
        existing.data
        && localEditAt
        && (!providerUpdated || localEditAt > providerUpdated + 1500)
      ) {
        continue;
      }
      const startRecord = (item.start && typeof item.start === "object") ? item.start as Json : {};
      const endRecord = (item.end && typeof item.end === "object") ? item.end as Json : {};
      const allDay = Boolean(startRecord.date && !startRecord.dateTime) || item.isAllDay === true;
      const startsOn = allDay ? dateOnly(startRecord.date || startRecord.dateTime) : null;
      const endsOn = allDay ? dateOnly(endRecord.date || endRecord.dateTime) : null;
      if (allDay && !startsOn) continue;
      const description = item.description || item.bodyPreview || null;
      const write = {
        calendar_id: calendar.id,
        organizer_id: row.user_id,
        title: item.summary || item.subject || "Evento",
        description: typeof description === "string" ? description.slice(0, 4000) : null,
        kind: existing.data?.kind || "in_person",
        ...(existing.data?.color ? { color: existing.data.color } : {}),
        status: "confirmed",
        starts_at: allDay ? null : (startRecord.dateTime || null),
        ends_at: allDay ? null : (endRecord.dateTime || null),
        starts_on: startsOn,
        ends_on: endsOn,
        is_all_day: allDay,
        timezone: startRecord.timeZone || "America/Bogota",
        location_name: (item.location && typeof item.location === "object")
          ? (item.location as Json).displayName || null
          : (typeof item.location === "string" ? item.location : null),
        external_id: String(item.id),
        metadata: {
          ...existingMetadata,
          source: row.provider,
        },
      };
      const saved = existing.data
        ? await admin.from("events").update(write).eq("id", existing.data.id)
        : await admin.from("events").insert(write);
      if (saved.error) {
        if (!failure) failure = saved.error.message;
        continue;
      }
      if (existing.data) updated += 1;
      else created += 1;
    }
  }

  if (readableCalendars === 0 && failure) throw new Error(failure);
  if (fetched > 0 && created + updated === 0 && failure) throw new Error(failure);
  return { fetched, created, updated, calendars: visible.length };
}

function eventDescription(event: Json): string {
  const description = typeof event.description === "string" ? event.description : "";
  const conference = Array.isArray(event.conference) ? event.conference : [];
  const links = conference
    .map((item) => (item && typeof item === "object" ? String((item as Json).join_url || "") : ""))
    .filter((link) => link && !description.includes(link));
  return [description, ...links].filter(Boolean).join("\n");
}

function rfc3339(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("El evento no tiene un horario válido.");
  return parsed.toISOString();
}

function googleBounds(event: Json) {
  if (event.is_all_day === true) {
    const start = dateOnly(event.starts_on);
    const end = dateOnly(event.ends_on) || start;
    if (!start || !end) throw new Error("El evento no tiene una fecha válida.");
    return { start: { date: start }, end: { date: end } };
  }
  const start = event.starts_at ? rfc3339(String(event.starts_at)) : "";
  const end = event.ends_at ? rfc3339(String(event.ends_at)) : "";
  if (!start || !end) throw new Error("El evento no tiene un horario válido.");
  return {
    start: { dateTime: start, timeZone: String(event.timezone || "America/Bogota") },
    end: { dateTime: end, timeZone: String(event.timezone || "America/Bogota") },
  };
}

function microsoftBounds(event: Json) {
  const timeZone = String(event.timezone || "America/Bogota");
  if (event.is_all_day === true) {
    const start = dateOnly(event.starts_on);
    const end = dateOnly(event.ends_on) || start;
    if (!start || !end) throw new Error("El evento no tiene una fecha válida.");
    return {
      start: { dateTime: `${start}T00:00:00`, timeZone },
      end: { dateTime: `${end}T00:00:00`, timeZone },
    };
  }
  const start = event.starts_at ? rfc3339(String(event.starts_at)) : "";
  const end = event.ends_at ? rfc3339(String(event.ends_at)) : "";
  if (!start || !end) throw new Error("El evento no tiene un horario válido.");
  return {
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
  };
}

async function syncOwnedEvent(
  admin: SupabaseClient,
  owner: string,
  eventId: string,
  action: "push" | "remove",
) {
  if (!eventId) throw new Error("No se encontró el evento.");
  const eventResult = await admin.from("events").select("*").eq("id", eventId).maybeSingle();
  const event = eventResult.data as Json | null;
  if (!event) throw new Error("No se encontró el evento.");
  const calendarResult = await admin
    .from("calendars")
    .select("id, owner_id, integration_id, external_id")
    .eq("id", event.calendar_id)
    .maybeSingle();
  const calendar = calendarResult.data;
  if (!calendar || calendar.owner_id !== owner) {
    throw new Error("No puedes modificar este evento.");
  }
  if (!calendar.integration_id || !calendar.external_id) return json({ message: null });

  const integration = await admin
    .from("integrations")
    .select("*")
    .eq("id", calendar.integration_id)
    .eq("user_id", owner)
    .maybeSingle();
  const token = integration.data ? await accessToken(admin, integration.data) : null;
  if (!integration.data || !token) {
    throw new Error("Conexión no configurada. Vuelve a conectar la cuenta.");
  }

  const provider = String(integration.data.provider || "");
  const calendarExternal = String(calendar.external_id);
  const eventExternal = event.external_id ? String(event.external_id) : "";
  const remoteBase = provider === "microsoft"
    ? `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarExternal)}/events`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarExternal)}/events`;

  if (action === "remove") {
    if (!eventExternal) return json({ message: null });
    const response = await fetch(`${remoteBase}/${encodeURIComponent(eventExternal)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      const payload = await response.json().catch(() => ({})) as Json;
      throw new Error(providerError(payload));
    }
    await rememberDeletedExternalId(admin, integration.data, eventExternal);
    return json({ message: null });
  }

  const description = eventDescription(event);
  const body = provider === "microsoft"
    ? {
      subject: event.title || "Evento",
      body: { contentType: "text", content: description },
      location: { displayName: String(event.location_name || "") },
      isAllDay: event.is_all_day === true,
      ...microsoftBounds(event),
    }
    : {
      summary: event.title || "Evento",
      description,
      location: String(event.location_name || ""),
      ...googleBounds(event),
    };
  const response = await fetch(
    eventExternal ? `${remoteBase}/${encodeURIComponent(eventExternal)}` : remoteBase,
    {
      method: eventExternal ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const payload = await response.json().catch(() => ({})) as Json;
  if (!response.ok) throw new Error(providerError(payload));
  const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
    ? { ...(event.metadata as Json), source: provider }
    : { source: provider };
  await admin.from("events").update({
    external_id: String(payload.id || eventExternal),
    metadata,
  }).eq("id", event.id);
  return json({ message: null, external_id: String(payload.id || eventExternal) });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const owner = await userId(request);
  if (!owner) return json({ message: "Inicia sesión para sincronizar la agenda." }, 401);

  const body = await request.json().catch(() => ({}));
  const admin = service();
  if (body.action === "push" || body.action === "remove") {
    try {
      const action = body.action === "remove" ? "remove" : "push";
      return await syncOwnedEvent(
        admin,
        owner,
        String(body.event_id || ""),
        action,
      );
    } catch (error) {
      return json({
        message: error instanceof Error
          ? error.message
          : "No fue posible guardar el evento en la cuenta.",
      });
    }
  }

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
