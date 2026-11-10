import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readPath(source: unknown, path: string): string {
  let current = source;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return "";
    current = (current as Json)[part];
  }
  return current == null ? "" : String(current);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ message: "Método no permitido." }, 405);

  const secret = Deno.env.get("WOMPI_EVENTS_SECRET") || "";
  if (!secret) return json({ message: "Falta el secreto de eventos de Wompi." }, 503);

  const body = await request.json().catch(() => null) as Json | null;
  if (!body) return json({ message: "Evento vacío." }, 400);

  const eventName = String(body.event || "");
  if (eventName && eventName !== "transaction.updated") {
    return json({ ok: true, ignored: true });
  }

  const signature = (body.signature || {}) as Json;
  const properties = Array.isArray(signature.properties) ? signature.properties.map(String) : [];
  const checksum = String(signature.checksum || "");
  const timestamp = String(body.timestamp ?? "");
  const data = body.data;
  if (!properties.length || !checksum || !timestamp) {
    return json({ message: "El evento no trae firma." }, 401);
  }

  const signed = properties.map((property) => readPath(data, property)).join("");
  const expected = await sha256Hex(`${signed}${timestamp}${secret}`);
  if (expected.toLowerCase() !== checksum.toLowerCase()) {
    return json({ message: "La firma del evento no coincide." }, 401);
  }

  const reference = readPath(data, "transaction.reference");
  const status = readPath(data, "transaction.status");
  const transactionId = readPath(data, "transaction.id");
  const amount = Number(readPath(data, "transaction.amount_in_cents"));
  if (!reference || !Number.isFinite(amount)) {
    return json({ message: "El evento no trae la referencia o el monto." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const applied = await supabase.rpc("apply_wompi_payment", {
    p_reference: reference,
    p_transaction_id: transactionId,
    p_status: status,
    p_amount_in_cents: Math.round(amount),
  });
  if (applied.error) return json({ message: applied.error.message }, 400);
  return json({ ok: true, result: applied.data });
});
