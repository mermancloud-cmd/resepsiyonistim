// Zod validation schemas for all 12 onboarding wizard steps.
// Each step validates required fields before allowing progression.

import { z } from "zod";

// Step 1: İşletme Bilgileri (Business Info)
export const businessInfoSchema = z.object({
  businessName: z.string().min(2, "İşletme adı en az 2 karakter olmalıdır"),
  businessType: z.enum(["bungalow", "tiny_house", "villa", "hotel", "pension", "apartment"], {
    error: "İşletme türü seçiniz",
  }),
  address: z.string().min(5, "Adres en az 5 karakter olmalıdır"),
  city: z.string().min(2, "Şehir adı en az 2 karakter olmalıdır"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  whatsappNumber: z.string().min(10, "Geçerli bir WhatsApp numarası giriniz"),
  email: z.email("Geçerli bir e-posta adresi giriniz"),
});

// Step 2: Konum ve Ulaşım (Location)
export const locationSchema = z.object({
  latitude: z.number().nullable().refine(
    (v) => v !== null && v >= -90 && v <= 90,
    "Geçerli bir enlem giriniz (-90 ile 90 arası)"
  ),
  longitude: z.number().nullable().refine(
    (v) => v !== null && v >= -180 && v <= 180,
    "Geçerli bir boylam giriniz (-180 ile 180 arası)"
  ),
  directions: z.string().min(10, "Yol tarifi en az 10 karakter olmalıdır"),
  parkingInfo: z.string(),
  parkingAvailable: z.boolean(),
});

// Step 3: Birim Tipleri (Room Types / Units)
export const unitSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Birim adı en az 2 karakter olmalıdır. Lütfen birim adını yazın."),
  description: z.string(),
  capacity: z.number().min(1, "Kapasite en az 1 kişi olmalıdır").max(20, "Kapasite en fazla 20 olabilir"),
  count: z.number().min(1, "Birim adedi en az 1 olmalıdır").max(50, "Birim adedi en fazla 50 olabilir"),
  basePrice: z.number().min(0, "Gece ücreti negatif olamaz"),
  weekendPrice: z.number().min(0, "Hafta sonu ücreti negatif olamaz"),
  amenities: z.array(z.string()),
}).refine(
  (data) => data.basePrice > 0,
  { message: "Gece ücreti girilmelidir. Lütfen birim için günlük fiyat yazın." }
);

export const unitsSchema = z.array(unitSchema).min(1, "En az bir birim tipi ekleyin");

// Step 4: Fiyatlandırma (Pricing)
export const pricingSchema = z.object({
  currency: z.enum(["TRY", "EUR", "USD"]),
  seasonalAdjustments: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Sezon adı giriniz"),
    startDate: z.string().min(1, "Başlangıç tarihi giriniz"),
    endDate: z.string().min(1, "Bitiş tarihi giriniz"),
    multiplier: z.number().min(0.1).max(10),
  })),
  minimumStayNights: z.number().min(1, "Minimum konaklama en az 1 gece olmalıdır"),
});

// Step 5: Özel Özellikler (Amenities) — at least one amenity must be selected
export const amenitiesSchema = z.object({
  jacuzzi: z.boolean(),
  pool: z.boolean(),
  bbq: z.boolean(),
  kitchen: z.boolean(),
  wifi: z.boolean(),
  ac: z.boolean(),
  parking: z.boolean(),
  garden: z.boolean(),
  tv: z.boolean(),
  fireplace: z.boolean(),
  washingMachine: z.boolean(),
  petFriendly: z.boolean(),
}).refine(
  (data) => Object.values(data).some(Boolean),
  "En az bir özel özellik seçiniz"
);

// Step 6: Kurallar (House Rules)
export const rulesSchema = z.object({
  checkInTime: z.string().min(1, "Giriş saati giriniz"),
  checkOutTime: z.string().min(1, "Çıkış saati giriniz"),
  petPolicy: z.enum(["allowed", "not_allowed", "on_request"]),
  petDetails: z.string(),
  smokingPolicy: z.enum(["allowed", "not_allowed", "outdoor_only"]),
  smokingDetails: z.string(),
  quietHoursStart: z.string().min(1, "Sessizlik saati başlangıç giriniz"),
  quietHoursEnd: z.string().min(1, "Sessizlik saati bitiş giriniz"),
  additionalRules: z.string(),
});

// Step 7: İptal Politikası (Cancellation)
export const cancellationSchema = z.discriminatedUnion("policyType", [
  z.object({
    policyType: z.literal("flexible"),
    freeCancellationDays: z.number().min(1),
    refundPercentages: z.array(z.object({
      daysBefore: z.number(),
      refundPercentage: z.number().min(0).max(100),
    })),
    customPolicy: z.string(),
  }),
  z.object({
    policyType: z.literal("moderate"),
    freeCancellationDays: z.number().min(1),
    refundPercentages: z.array(z.object({
      daysBefore: z.number(),
      refundPercentage: z.number().min(0).max(100),
    })),
    customPolicy: z.string(),
  }),
  z.object({
    policyType: z.literal("strict"),
    freeCancellationDays: z.number().min(1),
    refundPercentages: z.array(z.object({
      daysBefore: z.number(),
      refundPercentage: z.number().min(0).max(100),
    })),
    customPolicy: z.string(),
  }),
  z.object({
    policyType: z.literal("custom"),
    freeCancellationDays: z.number().min(0),
    refundPercentages: z.array(z.object({
      daysBefore: z.number(),
      refundPercentage: z.number().min(0).max(100),
    })),
    customPolicy: z.string().min(10, "Özel politika en az 10 karakter olmalıdır"),
  }),
]);

// Step 8: Depozito ve Ödeme (Deposit/Payment)
export const depositPaymentSchema = z.object({
  depositPercentage: z.number().min(0).max(100),
  depositType: z.enum(["percentage", "fixed"]),
  depositFixedAmount: z.number().min(0),
  iban: z.string().min(10, "Geçerli bir IBAN giriniz"),
  bankName: z.string().min(2, "Banka adı giriniz"),
  accountHolder: z.string().min(2, "Hesap sahibi adı giriniz"),
  paymentMethods: z.array(z.string()).min(1, "En az bir ödeme yöntemi seçiniz"),
});

// Step 9: Çevre Bilgileri (Surroundings) — soft validation, mostly optional
export const surroundingsSchema = z.object({
  nearbyMarkets: z.string(),
  nearbyRestaurants: z.string(),
  nearbyAttractions: z.string(),
  nearbyTransport: z.string(),
  distanceToBeach: z.string(),
  distanceToAirport: z.string(),
  distanceToCenter: z.string(),
}).refine(
  (data) =>
    data.nearbyMarkets.length > 0 ||
    data.nearbyRestaurants.length > 0 ||
    data.nearbyAttractions.length > 0 ||
    data.nearbyTransport.length > 0 ||
    data.distanceToBeach.length > 0 ||
    data.distanceToAirport.length > 0 ||
    data.distanceToCenter.length > 0,
  "En az bir çevre bilgisi giriniz"
);

// Step 10: Acil Durum (Emergency)
export const emergencySchema = z.object({
  emergencyContactName: z.string().min(2, "Acil durum kişi adı giriniz"),
  emergencyContactPhone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  nearestHospital: z.string().min(2, "En yakın hastane adını giriniz"),
  nearestHospitalPhone: z.string().min(10, "Hastane telefon numarası giriniz"),
  nearestPolice: z.string().min(2, "En yakın karakol adını giriniz"),
  nearestPolicePhone: z.string().min(10, "Karakol telefon numarası giriniz"),
  fireDepartment: z.string().min(3, "İtfaiye numarası giriniz"),
  additionalContacts: z.string(),
});

// Step 11: Kişisel Karşılama (Greeting)
export const greetingSchema = z.object({
  greetingMessage: z.string().min(10, "Karşılama mesajı en az 10 karakter olmalıdır"),
  personaName: z.string().min(1, "AI asistan adı giriniz"),
  personaTone: z.enum(["formal", "friendly", "warm"]),
  welcomeNote: z.string(),
  autoReplyEnabled: z.boolean(),
});

// Step 12: Review — no validation needed, just checks all steps are complete

// Map step number → schema
export const STEP_SCHEMAS: Record<number, z.ZodType> = {
  1: businessInfoSchema,
  2: locationSchema,
  3: unitsSchema,
  4: pricingSchema,
  5: amenitiesSchema,
  6: rulesSchema,
  7: cancellationSchema,
  8: depositPaymentSchema,
  9: surroundingsSchema,
  10: emergencySchema,
  11: greetingSchema,
  // Step 12 (Review) has no validation schema
};

/**
 * Validate step data against the corresponding schema.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 */
export function validateStep(
  stepNumber: number,
  data: unknown
): { valid: true } | { valid: false; errors: string[] } {
  const schema = STEP_SCHEMAS[stepNumber];
  if (!schema) {
    // No schema for this step (e.g., step 12 review) — always valid
    return { valid: true };
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: result.error.issues.map(
      (issue) => issue.message
    ),
  };
}
