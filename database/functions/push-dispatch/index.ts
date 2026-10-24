import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type PushRow = {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  kind: string | null;
  data: Record<string, unknown> | null;
};

const INCOMING_CALL_CHANNEL_ID = "incoming-calls";
const DEFAULT_CHANNEL_ID = "default";

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function isIncomingCall(row: PushRow): boolean {
  const data = asRecord(row.data);
  const kind = String(row.kind || "").trim();

  return (
    kind === "call"
    || String(data.module || "").trim() === "calls"
    || String(data.type || "").trim() === "incoming_call"
  );
}

function outcome(
  responseOk: boolean,
  body: Record<string, unknown>,
): "sent" | "failed" | "skipped" {
  const errorText = JSON.stringify(body.errors ?? "").toLowerCase();
  const notificationId = String(body.id || "").trim();

  if (
    errorText.includes("not subscribed")
    || errorText.includes("invalid_aliases")
    || errorText.includes("no subscribed")
  ) {
    return "skipped";
  }

  if (!responseOk || (body.errors && !notificationId)) {
    return "failed";
  }

  if (!notificationId) {
    return "skipped";
  }

  return "sent";
}

Deno.serve(async () => {
  const appId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const claimed = await supabase.rpc("claim_pending_push_notifications", {
    p_limit: 20,
  });

  if (claimed.error) {
    return Response.json({ error: claimed.error.message }, { status: 400 });
  }

  const rows = (claimed.data ?? []) as PushRow[];

  if (!appId || !apiKey) {
    if (rows.length > 0) {
      await supabase
        .from("notifications")
        .update({ push_status: "pending" })
        .in("id", rows.map((row) => row.id));
    }

    return Response.json({
      dispatched: 0,
      queued: rows.length,
      message: "Define ONESIGNAL_APP_ID y ONESIGNAL_REST_API_KEY en los secretos para enviar push.",
    });
  }

  if (rows.length === 0) {
    return Response.json({
      dispatched: 0,
      queued: 0,
      message: "No hay notificaciones pendientes.",
    });
  }

  let dispatched = 0;

  for (const row of rows) {
    const incomingCall = isIncomingCall(row);
    const title = String(row.title || "Buddy AI").trim() || "Buddy AI";
    const body = String(row.body || title).trim() || title;
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: "push",
        include_aliases: {
          external_id: [row.user_id],
        },
        headings: { en: title, es: title },
        contents: { en: body, es: body },
        data: asRecord(row.data),
        android_channel_id: incomingCall
          ? INCOMING_CALL_CHANNEL_ID
          : DEFAULT_CHANNEL_ID,
        ios_sound: incomingCall ? "incoming_call.mp3" : undefined,
      }),
    });
    const payload = asRecord(await response.json().catch(() => ({})));
    const status = outcome(response.ok, payload);

    await supabase
      .from("notifications")
      .update({ push_status: status })
      .eq("id", row.id);

    if (status === "sent") {
      dispatched += 1;
    }
  }

  return Response.json({ dispatched, queued: rows.length });
});
