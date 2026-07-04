/**
 * CSRF Protection - Client Utilities
 * 
 * Double-submit cookie pattern:
 * 1. Server sets `__csrf_token` cookie (non-httpOnly, readable by JS)
 * 2. Client reads the cookie and sends it as `X-CSRF-Token` header
 * 3. Server compares cookie value with header value
 */

export function getCSRFToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)__csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Wrapper around fetch that automatically includes the CSRF token.
 * Use this for all state-changing requests (POST, PUT, DELETE, PATCH).
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfToken = getCSRFToken();
  const headers = new Headers(options.headers || {});

  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
