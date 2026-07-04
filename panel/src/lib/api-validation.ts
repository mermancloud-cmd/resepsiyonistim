/**
 * Zod validation schemas for all API inputs.
 * 
 * Used for:
 * 1. Client-side validation before sending requests
 * 2. Server-side validation on API route handlers (when enabled)
 * 3. Type inference for TypeScript
 */

import { z } from "zod";

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

/** Phone login request (Step 1: send OTP) */
export const authPhoneLoginSchema = z.object({
  phone: z
    .string()
    .min(10, "Telefon numarası gereklidir")
    .max(15, "Telefon numarası çok uzun")
    .regex(
      /^(\+90)?5\d{9}$|^\d{10}$/,
      "Geçerli bir Türk telefon numarası giriniz (5XX XXX XX XX)"
    ),
});

/** OTP verification request (Step 2: verify code) */
export const authOTPVerifySchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z
    .string()
    .length(6, "Doğrulama kodu 6 haneli olmalıdır")
    .regex(/^\d{6}$/, "Kod sadece rakamlardan oluşmalıdır"),
});

/** Logout request */
export const authLogoutSchema = z.object({
  scope: z.enum(["local", "global"]).default("local"),
});

// ─── Reservation Schemas ──────────────────────────────────────────────────────

/** Update reservation status */
export const reservationStatusUpdateSchema = z.object({
  status: z.enum(["confirmed", "rejected", "cancelled"], {
    error: "Geçerli bir durum seçiniz (confirmed, rejected, cancelled)",
  }),
  notes: z.string().max(500, "Notlar en fazla 500 karakter olabilir").optional(),
});

/** Create new reservation */
export const reservationCreateSchema = z.object({
  guest_name: z.string().min(2, "Misafir adı en az 2 karakter olmalıdır").max(100),
  guest_email: z.email("Geçerli bir e-posta adresi giriniz").optional().or(z.literal("")),
  guest_phone: z.string().min(10, "Geçerli bir telefon numarası giriniz").optional().or(z.literal("")),
  room_id: z.string().uuid("Geçerli bir oda ID giriniz"),
  check_in_date: z.string().min(1, "Giriş tarihi gereklidir"),
  check_out_date: z.string().min(1, "Çıkış tarihi gereklidir"),
  total_amount: z.number().min(0, "Tutar negatif olamaz"),
  payment_method: z.string().optional(),
}).refine(
  (data) => {
    if (data.check_in_date && data.check_out_date) {
      return new Date(data.check_out_date) > new Date(data.check_in_date);
    }
    return true;
  },
  { message: "Çıkış tarihi giriş tarihinden sonra olmalıdır" }
);

/** Reservation list filters */
export const reservationFiltersSchema = z.object({
  status: z.enum(["all", "pending", "confirmed", "rejected", "cancelled"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().max(100).optional(),
});

// ─── Payment Schemas ──────────────────────────────────────────────────────────

/** Payment action (approve/reject IBAN payment) */
export const paymentActionSchema = z.object({
  action: z.enum(["approved", "rejected"], {
    error: "Onaylama veya reddetme seçiniz",
  }),
  notes: z.string().max(500, "Notlar en fazla 500 karakter olabilir").optional(),
  payment_id: z.string().uuid("Geçerli bir ödeme ID giriniz"),
});

/** Add owner IBAN */
export const ownerIBANCreateSchema = z.object({
  bank_name: z.string().min(2, "Banka adı en az 2 karakter olmalıdır").max(100),
  account_holder: z.string().min(2, "Hesap sahibi adı en az 2 karakter olmalıdır").max(100),
  iban: z
    .string()
    .min(15, "IBAN en az 15 karakter olmalıdır")
    .max(34, "IBAN en fazla 34 karakter olabilir")
    .regex(
      /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/,
      "Geçerli bir IBAN giriniz (örn: TR330001009000000000123456)"
    ),
  currency: z.enum(["TRY", "EUR", "USD"], {
    error: "Geçerli bir para birimi seçiniz",
  }),
});

/** IBAN payment filters */
export const ibanPaymentFiltersSchema = z.object({
  status: z.enum(["all", "pending", "approved", "rejected"]).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih formatı (YYYY-MM-DD)").optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih formatı (YYYY-MM-DD)").optional(),
  search: z.string().max(100).optional(),
});

// ─── Conversation Schemas ─────────────────────────────────────────────────────

/** Handoff conversation from AI to human agent */
export const conversationHandoffSchema = z.object({
  conversation_id: z.string().uuid("Geçerli bir konuşma ID giriniz"),
  reason: z.string().min(5, "Devir nedeni en az 5 karakter olmalıdır").max(500),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

/** Conversation search/filter */
export const conversationSearchSchema = z.object({
  search: z.string().max(200).optional(),
  state: z.enum(["active", "closed", "pending"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ─── Push Notification Schemas ────────────────────────────────────────────────

/** Push subscription endpoint */
export const pushSubscribeSchema = z.object({
  endpoint: z.string().url("Geçerli bir push endpoint URL gereklidir"),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh anahtarı gereklidir"),
    auth: z.string().min(1, "Auth anahtarı gereklidir"),
  }),
});

/** Push send request */
export const pushSendSchema = z.object({
  title: z.string().min(1, "Başlık gereklidir").max(100),
  body: z.string().min(1, "Mesaj içeriği gereklidir").max(500),
  icon: z.string().url().optional(),
  data: z.record(z.unknown()).optional(),
});

// ─── Subscription Schemas ─────────────────────────────────────────────────────

/** Initialize subscription checkout */
export const subscriptionInitSchema = z.object({
  plan_id: z.enum(["basic", "professional", "enterprise"], {
    error: "Geçerli bir plan seçiniz",
  }),
  callback_url: z.string().url("Geçerli bir callback URL gereklidir"),
});

/** Subscription status check */
export const subscriptionStatusSchema = z.object({
  tenant_id: z.string().uuid("Geçerli bir tenant ID gereklidir"),
});

// ─── AI Configuration Schemas ─────────────────────────────────────────────────

/** AI persona settings */
export const aiPersonaSchema = z.object({
  name: z.string().min(1, "Asistan adı gereklidir").max(50),
  tone: z.enum(["formal", "friendly", "warm"]),
  greeting_message: z.string().min(10, "Karşılama mesajı en az 10 karakter olmalıdır").max(1000),
  auto_reply: z.boolean(),
  enabled_conversations: z.array(z.string().uuid()).optional(),
});

/** AI toggle for a conversation */
export const aiToggleSchema = z.object({
  conversation_id: z.string().uuid("Geçerli bir konuşma ID gereklidir"),
  ai_enabled: z.boolean(),
});

// ─── Dashboard Query Schemas ──────────────────────────────────────────────────

/** Dashboard stats date range */
export const dashboardStatsSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ─── Utility: Safe Parse Helper ───────────────────────────────────────────────

/**
 * Validate data against a zod schema.
 * Returns typed data on success, or formatted errors on failure.
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => i.message),
  };
}

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type AuthPhoneLogin = z.infer<typeof authPhoneLoginSchema>;
export type AuthOTPVerify = z.infer<typeof authOTPVerifySchema>;
export type ReservationStatusUpdate = z.infer<typeof reservationStatusUpdateSchema>;
export type ReservationCreate = z.infer<typeof reservationCreateSchema>;
export type ReservationFilters = z.infer<typeof reservationFiltersSchema>;
export type PaymentAction = z.infer<typeof paymentActionSchema>;
export type OwnerIBANCreate = z.infer<typeof ownerIBANCreateSchema>;
export type IBANPaymentFilters = z.infer<typeof ibanPaymentFiltersSchema>;
export type ConversationHandoff = z.infer<typeof conversationHandoffSchema>;
export type ConversationSearch = z.infer<typeof conversationSearchSchema>;
export type PushSubscribe = z.infer<typeof pushSubscribeSchema>;
export type PushSend = z.infer<typeof pushSendSchema>;
export type SubscriptionInit = z.infer<typeof subscriptionInitSchema>;
export type AIPersona = z.infer<typeof aiPersonaSchema>;
export type AIToggle = z.infer<typeof aiToggleSchema>;
export type DashboardStatsQuery = z.infer<typeof dashboardStatsSchema>;
