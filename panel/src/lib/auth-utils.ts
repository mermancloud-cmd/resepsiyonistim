/**
 * Auth Hardening Utilities
 * Ported from Flask auth hardening to Next.js + TypeScript.
 */

// Timing-Safe String Comparison (equivalent to hmac.compare_digest)
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still iterate to maintain constant-time behavior
    let result = 0;
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const aCode = i < a.length ? a.charCodeAt(i) : 0;
      const bCode = i < b.length ? b.charCodeAt(i) : 0;
      result |= aCode ^ bCode;
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Input Validation
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && /^5\d{9}$/.test(digits);
}

export function isValidE164Phone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export function isValidOTP(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function capLength(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export function isNonEmpty(str: string): boolean {
  return str.trim().length > 0;
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 15);
}

export function sanitizeOTP(code: string): string {
  return code.replace(/\D/g, "").slice(0, 6);
}

// Security Constants
export const AUTH_CONSTANTS = {
  MAX_PHONE_LENGTH: 15,
  OTP_LENGTH: 6,
  LOGIN_RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  LOGIN_RATE_LIMIT_MAX: 5,
  OTP_RATE_LIMIT_WINDOW_MS: 5 * 60 * 1000,
  OTP_RATE_LIMIT_MAX: 5,
  SESSION_INACTIVITY_TIMEOUT_MS: 60 * 60 * 1000,
  CSRF_MAX_AGE_SECONDS: 24 * 60 * 60,
  MAX_AUTH_BODY_SIZE: 1024,
} as const;
