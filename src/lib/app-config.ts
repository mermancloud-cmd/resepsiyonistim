/** Application Configuration */
export const APP_NAME: string =
  (typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>).NEXT_PUBLIC_APP_NAME
    : undefined) || "Resepsiyonistim";

export const APP_TAGLINE = "Resepsiyoniste İhtiyaç Duyulan Her İşletme İçin";
export const APP_DESCRIPTION = "İşletmenize 7/24 çalışan, insan gibi konuşan bir dijital resepsiyonist. WhatsApp üzerinden rezervasyon, bilgi ve iletişim.";
export const LOGO_LETTER = APP_NAME.charAt(0).toUpperCase();
export const UNIT_TYPE_LABEL = "Oda / Birim";

export const BUSINESS_TYPES = [
  { value: "bungalow", label: "Bungalov" },
  { value: "tinyhouse", label: "Tiny House" },
  { value: "glamping", label: "Glamping" },
  { value: "boutique_hotel", label: "Butik Otel" },
  { value: "villa", label: "Villa" },
  { value: "hotel", label: "Otel" },
  { value: "pension", label: "Pansiyon" },
  { value: "apart", label: "Apart" },
  { value: "camping", label: "Kamp Alanı" },
  { value: "other", label: "Diğer" },
] as const;

// Canlı WhatsApp Demo — Evolution API (Merman instance)
// Test işletmesi Merman için bağlı gerçek WhatsApp numarası
export const DEMO_WHATSAPP_NUMBER = "905427450654";
export const DEMO_WHATSAPP_MESSAGE = "Merhaba";
