/**
 * IYZICO Payment Gateway Client (Server-Side Only)
 *
 * Handles checkout form creation and payment result verification
 * for SaaS subscription payments. NOT used for guest reservations.
 *
 * @see https://dev.iyzipay.com/tr/odeme-formu
 */

import type {
  IyzicoConfig,
  IyzicoCheckoutFormRequest,
  IyzicoCheckoutFormResponse,
  IyzicoCheckoutFormResultRequest,
  IyzicoPaymentResult,
} from "./types";

// ─── Configuration ─────────────────────────────────────────────────────────────

export function getIyzicoConfig(): IyzicoConfig {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com";

  if (!apiKey || !secretKey) {
    throw new Error(
      "IYZICO_API_KEY and IYZICO_SECRET_KEY must be set. " +
      "Get sandbox keys from https://sandbox-merchant.iyzipay.com"
    );
  }

  return { apiKey, secretKey, baseUrl };
}

// ─── Request Signing ───────────────────────────────────────────────────────────

import crypto from "crypto";

function generateHash(
  apiKey: string,
  secretKey: string,
  randomString: string,
  body: string
): string {
  const input = apiKey + randomString + body;
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("base64");
}

function generateRandomString(): string {
  return crypto.randomBytes(8).toString("hex");
}

// ─── API Client ────────────────────────────────────────────────────────────────

async function iyzicoPost<TResponse>(
  path: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const config = getIyzicoConfig();
  const bodyStr = JSON.stringify(body);
  const randomString = generateRandomString();
  const hash = generateHash(config.apiKey, config.secretKey, randomString, bodyStr);

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-iyzi-client-id": config.apiKey,
      "x-iyzi-signature": hash,
      "x-iyzi-random-string": randomString,
      "x-iyzi-client-version": "bungalow-panel-1.0",
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IYZICO API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<TResponse>;
}

// ─── Public Methods ────────────────────────────────────────────────────────────

/**
 * Initialize a checkout form for subscription payment.
 * Returns HTML content that should be rendered in the page.
 */
export async function initializeCheckoutForm(
  request: IyzicoCheckoutFormRequest
): Promise<IyzicoCheckoutFormResponse> {
  return iyzicoPost<IyzicoCheckoutFormResponse>(
    "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    request
  );
}

/**
 * Retrieve the result of a checkout form payment.
 * Called after the user completes the payment and IYZICO redirects back.
 */
export async function retrieveCheckoutFormResult(
  request: IyzicoCheckoutFormResultRequest
): Promise<IyzicoPaymentResult> {
  return iyzicoPost<IyzicoPaymentResult>(
    "/payment/iyzipos/checkoutform/auth/ecom/detail",
    request
  );
}

/**
 * Check if IYZICO is properly configured (for health checks).
 */
export function isIyzicoConfigured(): boolean {
  try {
    getIyzicoConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the environment (sandbox or production) for display purposes.
 */
export function getIyzicoEnvironment(): "sandbox" | "production" {
  const baseUrl = process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com";
  return baseUrl.includes("sandbox") ? "sandbox" : "production";
}
