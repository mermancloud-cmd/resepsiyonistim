/** Application Configuration */
export const APP_NAME: string =
  (typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>).NEXT_PUBLIC_APP_NAME
    : undefined) || "Panel";

export const APP_TAGLINE = "İşletme Yönetim Paneli";
export const APP_DESCRIPTION = "İşletmeniz için rezervasyon yönetim paneli.";
export const LOGO_LETTER = APP_NAME.charAt(0).toUpperCase();
export const UNIT_TYPE_LABEL = "Oda / Birim";

export const BUSINESS_TYPES = [
  { value: "bungalow", label: "Bungalov" },
  { value: "tinyhouse", label: "Tiny House" },
  { value: "glamping", label: "Glamping" },
  { value: "boutique_hotel", label: "Butik Otel" },
  { value: "villa", label: "Villa" },
  { value: "camping", label: "Kamp Alanı" },
  { value: "other", label: "Diğer" },
] as const;

// Canlı WhatsApp Demo — Evolution API (Merman instance)
// Test işletmesi Merman için bağlı gerçek WhatsApp numarası
export const DEMO_WHATSAPP_NUMBER = "905349187234";
export const DEMO_WHATSAPP_MESSAGE = "Merhaba! Merman'da yer ayırtmak istiyorum.";
