/**
 * Secure API Client
 *
 * Centralized fetch wrapper with:
 * 1. Automatic CSRF token injection (double-submit cookie pattern)
 * 2. Auth state checking (401 → redirect to login)
 * 3. Input validation via zod schemas (pre-request)
 * 4. Rate limiting headers parsing
 * 5. Request ID tracking
 * 6. Error normalization
 */

import { getCSRFToken } from "./csrf";
import { validateInput } from "./api-validation";
import type { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface APIResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  requestId: string | null;
}

export interface APIError {
  status: number;
  message: string;
  errors?: string[];
  requestId?: string;
}

// ─── Secure Fetch ─────────────────────────────────────────────────────────────

interface SecureFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Zod schema to validate the request body before sending */
  schema?: z.ZodSchema;
  /** Skip auth check (for public endpoints) */
  public?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Secure fetch wrapper. Use this for all API calls.
 *
 * @example
 * ```ts
 * const result = await secureFetch<Reservation[]>("/api/reservations", {
 *   method: "POST",
 *   body: { status: "confirmed" },
 *   schema: reservationStatusUpdateSchema,
 * });
 * ```
 */
export async function secureFetch<T = unknown>(
  url: string,
  options: SecureFetchOptions = {}
): Promise<APIResponse<T>> {
  const { body, schema, public: isPublic, timeout = 30000, ...fetchOptions } = options;

  // ── Validate body against schema (pre-request) ───────────────────────
  if (body && schema) {
    const validation = validateInput(schema, body);
    if (!validation.success) {
      return {
        ok: false,
        status: 400,
        data: null,
        error: `Validation failed: ${validation.errors.join(", ")}`,
        requestId: null,
      };
    }
  }

  // ── Build headers ────────────────────────────────────────────────────
  const headers = new Headers(fetchOptions.headers || {});

  // Auto-inject CSRF token for state-changing requests
  const method = (fetchOptions.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  // Auto-set Content-Type for JSON bodies
  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Request tracking
  headers.set("X-Requested-With", "XMLHttpRequest");
  headers.set("Accept", "application/json");

  // ── Execute fetch with timeout ───────────────────────────────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: "include", // Always include cookies for auth
    });

    clearTimeout(timeoutId);

    const requestId = response.headers.get("X-Request-ID");

    // ── Handle 401 Unauthorized ──────────────────────────────────────
    if (response.status === 401 && !isPublic) {
      // Only redirect if we're in the browser and not already on the login page
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        const redirectUrl = `/login?reason=session_expired&redirect=${encodeURIComponent(window.location.pathname)}`;
        window.location.href = redirectUrl;
      }
      return {
        ok: false,
        status: 401,
        data: null,
        error: "Oturum sona erdi. Lütfen tekrar giriş yapın.",
        requestId,
      };
    }

    // ── Handle 429 Rate Limited ──────────────────────────────────────
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      return {
        ok: false,
        status: 429,
        data: null,
        error: `Çok fazla istek. ${retryAfter ? `${retryAfter} saniye sonra tekrar deneyin.` : "Lütfen daha sonra tekrar deneyin."}`,
        requestId,
      };
    }

    // ── Handle 403 Forbidden (CSRF failure) ──────────────────────────
    if (response.status === 403) {
      return {
        ok: false,
        status: 403,
        data: null,
        error: "Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyin.",
        requestId,
      };
    }

    // ── Parse response body ──────────────────────────────────────────
    let data: T | null = null;
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        // Non-JSON response body
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: (data as { error?: string } | null)?.error || `Request failed (${response.status})`,
        requestId,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
      error: null,
      requestId,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        data: null,
        error: "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.",
        requestId: null,
      };
    }

    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.",
      requestId: null,
    };
  }
}

// ─── Convenience Methods ──────────────────────────────────────────────────────

export const api = {
  get: <T = unknown>(url: string, options?: Omit<SecureFetchOptions, "method" | "body">) =>
    secureFetch<T>(url, { ...options, method: "GET" }),

  post: <T = unknown>(url: string, body?: unknown, options?: Omit<SecureFetchOptions, "method">) =>
    secureFetch<T>(url, { ...options, method: "POST", body }),

  put: <T = unknown>(url: string, body?: unknown, options?: Omit<SecureFetchOptions, "method">) =>
    secureFetch<T>(url, { ...options, method: "PUT", body }),

  patch: <T = unknown>(url: string, body?: unknown, options?: Omit<SecureFetchOptions, "method">) =>
    secureFetch<T>(url, { ...options, method: "PATCH", body }),

  delete: <T = unknown>(url: string, options?: Omit<SecureFetchOptions, "method" | "body">) =>
    secureFetch<T>(url, { ...options, method: "DELETE" }),
};
