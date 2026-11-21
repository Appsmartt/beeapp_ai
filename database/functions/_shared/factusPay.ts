export const DEFAULT_FACTUS_PAY_BASE_URL = "https://pay-api-sandbox.factus.com.co";
export const DEFAULT_FACTUS_PAY_EXPIRATION_SECONDS = 1800;

export type FactusPayConfig = {
  baseUrl: string;
  apiToken: string;
  webhookKey: string;
  accessKey: string;
  expirationSeconds: number;
  sandbox: boolean;
};

export type FactusPayer = {
  name?: string;
  document_type?: string;
  document_number?: string;
};

export type FactusCollectionData = {
  reference_code: string;
  amount: number;
  status: string;
  breb_key: string;
  created_at: string | null;
  qr_expires_at: string | null;
  collected_at: string | null;
  qr: string | null;
  payer?: FactusPayer;
};

export type FactusApiResult = {
  httpStatus: number;
  data: FactusCollectionData;
  message: string;
};

export function readFactusPayConfig(): FactusPayConfig {
  const rawBase = (Deno.env.get("FACTUS_PAY_BASE_URL") || DEFAULT_FACTUS_PAY_BASE_URL).trim();
  const baseUrl = rawBase.replace(/\/+$/, "");
  const apiToken = (Deno.env.get("FACTUS_PAY_API_TOKEN") || "").trim();
  const webhookKey = (Deno.env.get("FACTUS_PAY_WEBHOOK_KEY") || "").trim();
  const accessKey = (Deno.env.get("FACTUS_PAY_ACCESS_KEY") || "").trim();
  const parsedExp = Number(Deno.env.get("FACTUS_PAY_EXPIRATION_SECONDS") || "");
  const expirationSeconds = Number.isFinite(parsedExp) && parsedExp >= 300 && parsedExp <= 86400
    ? Math.round(parsedExp)
    : DEFAULT_FACTUS_PAY_EXPIRATION_SECONDS;

  return {
    baseUrl,
    apiToken,
    webhookKey,
    accessKey,
    expirationSeconds,
    sandbox: baseUrl.toLowerCase().includes("sandbox"),
  };
}

/**
 * Normaliza fechas de Factus Pay a ISO 8601 UTC.
 * Acepta tanto ISO 8601 como "DD-MM-YYYY hh:mm:ss AM/PM" (hora Colombia UTC-5).
 */
export function normalizeFactusDate(value: unknown, fallbackFromNowSeconds?: number): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw) {
    const dmyAmPm = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i.exec(raw);
    if (dmyAmPm) {
      const [, dd, mm, yyyy, hhRaw, min, sec, meridiem] = dmyAmPm;
      let hours = Number(hhRaw);
      const upper = meridiem.toUpperCase();
      if (upper === "PM" && hours < 12) hours += 12;
      if (upper === "AM" && hours === 12) hours = 0;
      const isoLocal = `${yyyy}-${mm}-${dd}T${String(hours).padStart(2, "0")}:${min}:${sec}-05:00`;
      const parsed = new Date(isoLocal);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }

    const dmy24 = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(raw);
    if (dmy24) {
      const [, dd, mm, yyyy, hh, min, sec] = dmy24;
      const parsed = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}-05:00`);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }

    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  }

  if (typeof fallbackFromNowSeconds === "number" && Number.isFinite(fallbackFromNowSeconds)) {
    return new Date(Date.now() + fallbackFromNowSeconds * 1000).toISOString();
  }
  return null;
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  const maxLen = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < maxLen; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function buildFactusHeaders(config: FactusPayConfig, withJsonBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiToken}`,
    Accept: "application/json",
  };
  if (withJsonBody) {
    headers["Content-Type"] = "application/json";
  }
  if (config.accessKey) {
    headers["X-Factus-Access-Key"] = config.accessKey;
  }
  return headers;
}

function normalizeCollectionPayload(raw: Record<string, unknown>): FactusCollectionData {
  const payerRaw = raw.payer && typeof raw.payer === "object"
    ? raw.payer as Record<string, unknown>
    : null;

  const payer: FactusPayer | undefined = payerRaw
    ? {
        name: payerRaw.name ? String(payerRaw.name).trim() : undefined,
        document_type: payerRaw.document_type ? String(payerRaw.document_type).trim() : undefined,
        document_number: payerRaw.document_number ? String(payerRaw.document_number).trim() : undefined,
      }
    : undefined;

  return {
    reference_code: String(raw.reference_code ?? "").trim(),
    amount: Number(raw.amount ?? 0),
    status: String(raw.status ?? "").trim().toLowerCase(),
    breb_key: String(raw.breb_key ?? "").trim(),
    created_at: normalizeFactusDate(raw.created_at),
    qr_expires_at: normalizeFactusDate(raw.qr_expires_at),
    collected_at: normalizeFactusDate(raw.collected_at),
    qr: typeof raw.qr === "string" && raw.qr.trim() ? raw.qr.trim() : null,
    ...(payer ? { payer } : {}),
  };
}

function extractApiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record.errors && typeof record.errors === "object") {
      const firstError = Object.values(record.errors as Record<string, unknown>)
        .flatMap((item) => (Array.isArray(item) ? item : [item]))
        .find((item) => typeof item === "string" && item.trim());
      if (typeof firstError === "string") return firstError;
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
  }
  return fallback;
}

export async function createFactusCollection(
  config: FactusPayConfig,
  input: { referenceCode: string; amount: number; expirationSeconds: number },
): Promise<FactusApiResult> {
  const response = await fetch(`${config.baseUrl}/v1/collections`, {
    method: "POST",
    headers: buildFactusHeaders(config, true),
    body: JSON.stringify({
      reference_code: input.referenceCode,
      amount: Math.round(input.amount * 100) / 100,
      expiration: input.expirationSeconds,
    }),
  });

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload?.data || typeof payload.data !== "object") {
    const detail = extractApiError(payload, `Factus Pay respondió HTTP ${response.status}.`);
    throw new Error(detail);
  }

  return {
    httpStatus: response.status,
    data: normalizeCollectionPayload(payload.data as Record<string, unknown>),
    message: typeof payload.message === "string" ? payload.message : "",
  };
}

export async function getFactusCollection(
  config: FactusPayConfig,
  referenceCode: string,
): Promise<FactusApiResult> {
  const response = await fetch(
    `${config.baseUrl}/v1/collections/${encodeURIComponent(referenceCode)}`,
    {
      method: "GET",
      headers: buildFactusHeaders(config, false),
    },
  );

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload?.data || typeof payload.data !== "object") {
    const detail = extractApiError(payload, `Factus Pay respondió HTTP ${response.status}.`);
    throw new Error(detail);
  }

  return {
    httpStatus: response.status,
    data: normalizeCollectionPayload(payload.data as Record<string, unknown>),
    message: typeof payload.message === "string" ? payload.message : "",
  };
}
