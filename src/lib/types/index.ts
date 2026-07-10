// ═══════════════════════════════════════════════════════════════════════════════
// Bungalow Owner Panel — Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Facility Types (O3) ─────────────────────────────────────────────────────

export type FacilityType = 'hotel' | 'villa' | 'bungalov' | 'apart' | 'pansiyon' | 'glamping' | 'tinyhouse' | 'diger';
export type FacilityStatus = 'active' | 'inactive' | 'maintenance';
export type FacilityUserRole = 'manager' | 'staff' | 'viewer';

export interface Facility {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  type: FacilityType;
  status: FacilityStatus;
  settings: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FacilityUser {
  id: string;
  facility_id: string;
  user_id: string;
  role: FacilityUserRole;
  created_at: string;
}

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
  facilityId?: string;
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
  facility_id: string | null;
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
  facility_id: string | null;
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
  facility_id: string | null;
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

export interface BankAccount {
  id: string;
  tenant_id: string;
  facility_id: string | null;
  bank_name: string;
  branch_name: string | null;
  account_holder: string;
  iban: string;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  swift_code: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BankAccountInput {
  bank_name: string;
  branch_name?: string;
  account_holder: string;
  iban: string;
  currency: string;
  facility_id?: string | null;
  is_default?: boolean;
  swift_code?: string;
  description?: string;
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

// ─── Referral Types ───────────────────────────────────────────────────────────

export type ReferralStatus = "pending" | "converted" | "rewarded" | "expired";
export type RewardType = "discount" | "credit" | "free_night" | "cash";

export interface Referral {
  id: string;
  tenant_id: string;
  referrer_name: string;
  referrer_phone: string;
  referee_name: string | null;
  referee_phone: string | null;
  referee_email: string | null;
  status: ReferralStatus;
  reward_type: RewardType;
  reward_amount: number;
  reward_currency: string;
  reward_claimed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralCode {
  id: string;
  tenant_id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  reward_type: RewardType;
  reward_amount: number;
  reward_currency: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  pending_count: number;
  converted_count: number;
  rewarded_count: number;
  total_reward_amount: number;
  conversion_rate: number;
  active_codes: number;
}

// ─── A/B Test Types ───────────────────────────────────────────────────────────

export type ABTestTargetMetric = 'satisfaction_score' | 'completion_rate' | 'response_time' | 'conversion_rate';

export interface ABTest {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  variant_a_name: string;
  variant_b_name: string;
  target_metric: ABTestTargetMetric;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ABTestResult {
  id: string;
  test_id: string;
  tenant_id: string;
  conversation_id: string | null;
  variant: 'control' | 'treatment';
  satisfaction_score: number | null;
  completion_rate: number | null;
  response_time_seconds: number | null;
  message_count: number | null;
  was_handoff: boolean;
  converted: boolean;
  metadata: Record<string, unknown>;
  recorded_at: string;
}

export interface ABTestSummary {
  variant: string;
  total_count: number;
  avg_satisfaction: number | null;
  avg_completion_rate: number | null;
  avg_response_time: number | null;
  handoff_rate: number | null;
  conversion_rate: number | null;
}

// ─── Composite / Join Types ──────────────────────────────────────────────────

export interface ConversationRowWithMessages extends ConversationRow {
  messages: MessageRow[];
}

export interface ReservationRowWithRoom extends ReservationRow {
  room: RoomRow;
}

// ─── Humanization Evaluation Types ──────────────────────────────────────────

export type HumanizationCategory =
  | 'general' | 'greeting' | 'empathy' | 'objection_handling'
  | 'room_presentation' | 'followup' | 'closing' | 'complaint';

export type EvaluationMethod = 'manual' | 'automated' | 'llm_judge';

export interface HumanizationCriterion {
  name: string;
  weight: number;
  max_score: number;
}

export interface HumanizationScenario {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: HumanizationCategory;
  prompt_template: string | null;
  expected_behaviors: string[];
  evaluation_criteria: HumanizationCriterion[];
  min_target_score: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HumanizationScore {
  id: string;
  tenant_id: string;
  scenario_id: string;
  conversation_id: string | null;
  ai_response_text: string;
  score_naturalness: number | null;
  score_empathy: number | null;
  score_fluency: number | null;
  score_context: number | null;
  score_personalization: number | null;
  score_flow: number | null;
  score_tone: number | null;
  composite_score: number | null;
  evaluation_method: EvaluationMethod;
  evaluator_id: string | null;
  notes: string | null;
  passed: boolean | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HumanizationSummary {
  total_evaluations: number;
  passed_count: number;
  fail_count: number;
  pass_rate: number;
  avg_composite: number;
  avg_naturalness: number;
  avg_empathy: number;
  avg_fluency: number;
  avg_context: number;
  avg_personalization: number;
  avg_flow: number;
  avg_tone: number;
  best_score: number;
  worst_score: number;
  scenario_count: number;
  last_evaluated_at: string | null;
}

export interface HumanizationScenarioStats {
  scenario_id: string;
  scenario_name: string;
  category: HumanizationCategory;
  total_evaluations: number;
  passed_count: number;
  avg_composite: number | null;
  avg_naturalness: number | null;
  avg_empathy: number | null;
  avg_fluency: number | null;
  avg_context: number | null;
  avg_personalization: number | null;
  avg_flow: number | null;
  avg_tone: number | null;
  min_target: number;
  last_score: number | null;
  trend: 'improving' | 'declining' | 'stable';
}

export const HUMANIZATION_CATEGORY_LABELS: Record<HumanizationCategory, string> = {
  general: 'Genel',
  greeting: 'Karşılama',
  empathy: 'Empati',
  objection_handling: 'İtiraz Yönetimi',
  room_presentation: 'Oda Tanıtımı',
  followup: 'Takip',
  closing: 'Kapanış',
  complaint: 'Şikayet',
};

// ─── Müşteri Feedback Types ──────────────────────────────────────────────────

export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

// ─── Müşteri Feedback Types (I3) ─────────────────────────────────────────

// Backward-compat alias for CI (Turbopack strict resolution)
export type FeedbackCategory = MusteriFeedbackCategory;

export type MusteriFeedbackCategory =
  | 'genel' | 'hiz' | 'rezervasyon' | 'oda_bilgisi'
  | 'fiyat' | 'iletisim' | 'insan_kalitesi' | 'diger';

export interface MusteriFeedback {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  rating: FeedbackRating;
  category: MusteriFeedbackCategory;
  comment: string | null;
  metadata: Record<string, unknown>;
  facility_id: string | null;
  submitted_at: string;
  created_at: string;
}

export interface MusteriFeedbackSummary {
  total_feedback: number;
  avg_rating: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  category_breakdown: Record<string, number>;
}

export interface MusteriFeedbackTrend {
  date: string;
  avg_rating: number;
  count: number;
}

export const HUMANIZATION_SCORE_LABELS: Record<string, string> = {
  score_naturalness: 'Doğallık',
  score_empathy: 'Empati',
  score_fluency: 'Akıcılık',
  score_context: 'Bağlam',
  score_personalization: 'Kişiselleştirme',
  score_flow: 'Akış',
  score_tone: 'Ton',
};
export interface FeedbackSummary {
  total_count: number;
  avg_rating: number;
  rating_distribution: { rating: number; count: number }[];
  category_breakdown: { category: string; count: number; avg_rating: number }[];
  weekly_trend: { week: string; count: number; avg_rating: number }[];
  recent_comments: {
    id: string;
    rating: number;
    category: string;
    comment: string | null;
    submitted_at: string;
    conversation_id: string | null;
  }[];
}

export interface FeedbackTrendPoint {
  date: string;
  count: number;
  avg_rating: number;
}

export interface FeedbackWithHumanization {
  feedback_id: string;
  tenant_id: string;
  conversation_id: string | null;
  rating: number;
  category: string;
  comment: string | null;
  submitted_at: string;
  total_score: number | null;
  naturalness: number | null;
  empathy: number | null;
  fluency: number | null;
  context_awareness: number | null;
  personalization: number | null;
  conversation_flow: number | null;
  tone_appropriateness: number | null;
  scored_at: string | null;
}
