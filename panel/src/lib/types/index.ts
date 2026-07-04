// ═══════════════════════════════════════════════════════════════════════════════
// Bungalow Owner Panel — Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

// ─── UI Types (component-facing, camelCase) ─────────────────────────────────

export type ReservationStatus =
  | "bekleyen"
  | "onayli"
  | "iptal"
  | "giris_yapti";

export type PaymentStatus =
  | "odeme_bekleniyor"
  | "odeme_alindi"
  | "depozito_odendi";

export type PaymentTrackingStatus = "bekleyen" | "onaylandi" | "reddedildi";

export interface Guest {
  name: string;
  phone: string;
  email: string;
}

export interface Reservation {
  id: string;
  guest: Guest;
  roomName: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  nightlyRate: number;
  nights: number;
  totalAmount: number;
  depositAmount: number; // 30% of total
  ibanReference: string;
  paymentNotes: string;
  createdAt: string;
}

// ─── AI Types ────────────────────────────────────────────────────────────────

export type AIHandler = "ai" | "human";

export interface Conversation {
  id: string;
  guestPhone: string;
  guestName: string;
  handler: AIHandler;
  lastMessage: string;
  lastMessageAt: string;
  state: string;
  assigned_agent: string | null;
}

export interface AIPersona {
  name: string;
  language: "TR" | "EN" | "AR";
  maxConversationTurns: number;
  handoffTriggerPhrases: string[];
  autoHandoffThreshold: number;
}

export interface AIPerformance {
  messagesHandledToday: number;
  avgResponseTimeSeconds: number;
  handoffRate: number; // percentage
  satisfactionScore: number; // 1-5
}

// ─── Settings Types ──────────────────────────────────────────────────────────

export interface BusinessSettings {
  businessName: string;
  phone: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  minimumStay: number;
  cancellationPolicy: string;
  webPushEnabled: boolean;
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
}

// ─── Calendar Types ──────────────────────────────────────────────────────────

export type CalendarDateStatus = "booked" | "pending" | "available" | "blocked";

export interface CalendarDay {
  date: Date;
  status: CalendarDateStatus;
  reservations: Reservation[];
}

// ─── UI State Types ──────────────────────────────────────────────────────────

export type BottomNavTab =
  | "dashboard"
  | "messages"
  | "reservations"
  | "ai"
  | "settings";

// ═══════════════════════════════════════════════════════════════════════════════
// Supabase Database Row Types (snake_case, DB-layer)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Conversation States ─────────────────────────────────────────────────────

export const CONVERSATION_STATES = [
  "GREETING",
  "QUALIFYING",
  "PRESENTING_ROOMS",
  "HANDLING_OBJECTIONS",
  "COLLECTING_GUEST_INFO",
  "CONFIRMING_RESERVATION",
  "AWAITING_DEPOSIT",
  "RESERVATION_CONFIRMED",
  "END",
  "HUMAN_HANDOFF",
  "FOLLOW_UP",
  "COMPLAINT",
] as const;

export type ConversationState = (typeof CONVERSATION_STATES)[number];

// ─── Message Roles ───────────────────────────────────────────────────────────

export const MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

// ─── DB Reservation Status ───────────────────────────────────────────────────

export const DB_RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
] as const;
export type DbReservationStatus = (typeof DB_RESERVATION_STATUSES)[number];

// ─── DB Payment Status ──────────────────────────────────────────────────────

export const DB_PAYMENT_STATUSES = [
  "unpaid",
  "deposit_paid",
  "partially_paid",
  "fully_paid",
  "refunded",
] as const;
export type DbPaymentStatus = (typeof DB_PAYMENT_STATUSES)[number];

// ─── Database Row Models ─────────────────────────────────────────────────────

export interface ConversationRow {
  id: string;
  tenant_id: string;
  guest_phone: string;
  state: ConversationState;
  message_count: number;
  last_ai_message_at: string | null;
  assigned_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface ReservationRow {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  guest_id_number: string | null;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  deposit_amount: number;
  status: DbReservationStatus;
  payment_status: DbPaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  capacity: number;
  base_price: number;
  weekend_price: number | null;
  peak_price: number | null;
  amenities: string[];
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantSettingsRow {
  id: string;
  tenant_id: string;
  property_name: string;
  ai_persona_name: string;
  ai_persona_tone: string;
  check_in_time: string;
  check_out_time: string;
  min_stay_nights: number;
  max_stay_nights: number;
  deposit_percentage: number;
  cancellation_policy: string;
  welcome_message: string | null;
  currency: string;
  timezone: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecordRow {
  id: string;
  reservation_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_ref: string | null;
  status: "pending" | "completed" | "failed" | "refunded";
  paid_at: string | null;
  created_at: string;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  total_conversations: number;
  active_conversations: number;
  total_reservations: number;
  confirmed_reservations: number;
  upcoming_checkins: number;
  occupancy_rate: number;
  occupancyRate?: number;
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_today?: number;
  ai_conversion_rate: number;
  avg_response_time_seconds: number;
  // Dashboard display fields
  checkInsToday?: number;
  checkOutsToday?: number;
  pending_actions?: number;
  pendingActions?: number;
  aiStatus?: string;
  aiMessagesHandled?: number;
  aiLastActivity?: string;
  weeklyRevenue?: { day: string; revenue: number }[];
}

// ─── IBAN Management Types ─────────────────────────────────────────────────

export interface BusinessIBAN {
  id: string;
  tenant_id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IBANPaymentTracking {
  id: string;
  tenant_id: string;
  reservation_id: string;
  guest_name: string;
  guest_phone: string;
  amount: number;
  currency: string;
  iban_id: string;
  sender_iban_last4: string;
  reference_code: string;
  status: PaymentTrackingStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  room_name: string;
  check_in_date: string;
  check_out_date: string;
}

// ─── Onboarding Types ─────────────────────────────────────────────────────

export type OnboardingStep = 
  | "business_info"
  | "whatsapp_setup"
  | "units_setup"
  | "pricing_setup"
  | "complete";

export interface OnboardingBusinessInfo {
  business_name: string;
  business_type: "bungalow" | "hotel" | "pension" | "apartment";
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface OnboardingWhatsApp {
  phone_number: string;
  instance_name: string;
  webhook_url?: string;
  is_connected: boolean;
}

export interface OnboardingUnit {
  name: string;
  description: string;
  capacity: number;
  base_price: number;
  weekend_price: number | null;
  peak_price: number | null;
  amenities: string[];
  is_active: boolean;
}

export interface OnboardingPricing {
  currency: string;
  deposit_percentage: number;
  cancellation_policy: string;
  min_stay_nights: number;
  check_in_time: string;
  check_out_time: string;
}

export interface OnboardingState {
  step: OnboardingStep;
  tenant_id: string;
  business_info: OnboardingBusinessInfo | null;
  whatsapp: OnboardingWhatsApp | null;
  units: OnboardingUnit[];
  pricing: OnboardingPricing | null;
  completed: boolean;
}

// ─── Database Row Types for Onboarding ────────────────────────────────────

export interface TenantRow {
  id: string;
  business_name: string;
  business_type: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  whatsapp_number: string | null;
  evolution_instance_id: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  capacity: number;
  base_price: number;
  weekend_price: number | null;
  peak_price: number | null;
  amenities: string[];
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRow {
  id: string;
  unit_id: string;
  date: string;
  status: "available" | "booked" | "blocked" | "maintenance";
  price_override: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingRuleRow {
  id: string;
  tenant_id: string;
  name: string;
  rule_type: "seasonal" | "weekday" | "weekend" | "minimum_stay" | "early_bird" | "last_minute";
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  adjustment_type: "percentage" | "fixed";
  adjustment_value: number;
  min_nights: number | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Composite / Join Types ──────────────────────────────────────────────────

export interface ConversationRowWithMessages extends ConversationRow {
  messages: MessageRow[];
}

export interface ReservationRowWithRoom extends ReservationRow {
  room: RoomRow;
}
