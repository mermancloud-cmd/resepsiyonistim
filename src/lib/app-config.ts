/**
 * Application Configuration
 *
 * To rebrand: set NEXT_PUBLIC_APP_NAME env var at build time.
 * During Next.js static export, NEXT_PUBLIC_* vars are inlined
 * into the JS bundle at build time.
 */

/** Primary brand name — override via NEXT_PUBLIC_APP_NAME env */
export const APP_NAME: string =
  (process.env as Record<string, string | undefined>).NEXT_PUBLIC_APP_NAME || "Panel";

export const APP_TAGLINE = "İşletme Yönetim Paneli";

export const APP_DESCRIPTION =
  "İşletmeniz için rezervasyon yönetim paneli.";

/** Logo letter (first letter of name) */
export const LOGO_LETTER = APP_NAME.charAt(0).toUpperCase();

/** Unit type label (shown in onboarding forms) */
export const UNIT_TYPE_LABEL = "Oda / Birim";

/** Business type options for onboarding */
export const BUSINESS_TYPES = [
  { value: "bungalow", label: "Bungalov" },
  { value: "tinyhouse", label: "Tiny House" },
  { value: "glamping", label: "Glamping" },
  { value: "boutique_hotel", label: "Butik Otel" },
  { value: "villa", label: "Villa" },
  { value: "camping", label: "Kamp Alanı" },
  { value: "other", label: "Diğer" },
] as const;
