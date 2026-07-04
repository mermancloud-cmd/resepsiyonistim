/**
 * HMAC Utilities — Client-Side Token Validation & Signing
 *
 * Used by the reservation-action confirmation page to:
 * 1. Validate HMAC-signed URLs from Telegram notifications (client-side pre-check)
 * 2. Sign POST request bodies for the n8n owner-action-confirm webhook
 *
 * Ported from the n8n WF08 HMAC validator (task t_0710181a).
 *
 * SECURITY NOTE: The HMAC secret is NOT stored client-side.
 * Client-side validation is a UX pre-check only — the server (n8n) always
 * re-validates the HMAC independently. The secret is stored in n8n credential store.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnerActionParams {
  action: "approve" | "reject" | "hold" | "info";
  reservation_id: string;
  ts: string;
  token: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_ACTIONS = ["approve", "reject", "hold", "info"] as const;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 24-hour window for approval links (matches n8n validator)
const MAX_LINK_AGE_SECONDS = 86400;

// Action labels (Turkish)
export const ACTION_LABELS: Record<string, string> = {
  approve: "Onayla",
  reject: "Reddet",
  hold: "Beklet",
  info: "Bilgi İste",
};

export const ACTION_ICONS: Record<string, string> = {
  approve: "✅",
  reject: "❌",
  hold: "⏸",
  info: "ℹ️",
};

export const ACTION_COLORS: Record<string, string> = {
  approve: "bg-emerald-600 hover:bg-emerald-700",
  reject: "bg-red-600 hover:bg-red-700",
  hold: "bg-amber-600 hover:bg-amber-700",
  info: "bg-blue-600 hover:bg-blue-700",
};

// ─── URL Parameter Parsing ────────────────────────────────────────────────────

/**
 * Parse and validate owner-action URL parameters.
 * Returns null if required params are missing or malformed.
 */
export function parseActionParams(
  searchParams: URLSearchParams
): OwnerActionParams | null {
  const action = (searchParams.get("action") || "").toLowerCase().trim();
  const reservation_id = (searchParams.get("reservation_id") || "").trim();
  const ts = (searchParams.get("ts") || "").trim();
  const token = (searchParams.get("token") || "").trim();

  if (!action || !reservation_id || !ts || !token) {
    return null;
  }

  if (!VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number])) {
    return null;
  }

  if (!UUID_REGEX.test(reservation_id)) {
    return null;
  }

  return {
    action: action as OwnerActionParams["action"],
    reservation_id,
    ts,
    token,
  };
}

// ─── Client-Side Validation (UX pre-check only) ──────────────────────────────

/**
 * Validate owner-action URL parameters client-side.
 * This is a UX pre-check — n8n always re-validates server-side.
 *
 * Checks:
 * 1. All required parameters present
 * 2. Action is valid (approve/reject/hold/info)
 * 3. Reservation ID is a valid UUID
 * 4. Timestamp is within 24-hour window
 */
export function validateActionParams(params: OwnerActionParams): ValidationResult {
  // Validate action
  if (!VALID_ACTIONS.includes(params.action)) {
    return { valid: false, reason: "Geçersiz işlem türü." };
  }

  // Validate reservation_id format
  if (!UUID_REGEX.test(params.reservation_id)) {
    return { valid: false, reason: "Geçersiz rezervasyon numarası." };
  }

  // Validate timestamp freshness
  const ts = parseInt(params.ts, 10);
  if (!Number.isFinite(ts)) {
    return { valid: false, reason: "Geçersiz zaman damgası." };
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > MAX_LINK_AGE_SECONDS) {
    return {
      valid: false,
      reason:
        "Bu bağlantının süresi dolmuş (24 saat). Lütfen yeni bir bildirim isteyin.",
    };
  }

  // Token present (can't validate HMAC without secret — that's server-side)
  if (!params.token || params.token.length < 16) {
    return { valid: false, reason: "Geçersiz güvenlik belirteci." };
  }

  return { valid: true };
}

// ─── HMAC-SHA256 Signing (for POST body) ─────────────────────────────────────

/**
 * Sign a request body using HMAC-SHA256.
 * Used when POSTing the action confirmation to n8n.
 *
 * The secret is fetched from a secure endpoint or provided by the server.
 * In practice, the n8n webhook validates the signature server-side.
 *
 * @param body - The JSON body to sign
 * @param secret - The HMAC secret (from secure store)
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export async function signBody(
  body: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const bodyData = encoder.encode(body);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, bodyData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Build the POST body for owner-action-confirm webhook.
 * Includes the original HMAC token for server-side validation.
 */
export function buildConfirmBody(
  params: OwnerActionParams,
  tenantId?: string
): Record<string, unknown> {
  return {
    action: params.action,
    reservation_id: params.reservation_id,
    original_token: params.token,
    original_ts: params.ts,
    confirmed_at: new Date().toISOString(),
    tenant_id: tenantId || null,
  };
}
