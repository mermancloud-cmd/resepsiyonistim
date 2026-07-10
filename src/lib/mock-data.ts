/**
 * Mock data for graceful degradation when API calls fail.
 * These are used as fallbacks in the hooks.
 */

import type { Reservation } from "@/lib/types";

// ─── A/B Test Mock Data ───────────────────────────────────────────────────────

export const mockABTests = [
  {
    id: 'ab-test-1',
    tenant_id: 'default',
    name: 'Persona Tonu A/B Testi',
    description: 'Resmi vs samimi dil kullanımının memnuniyet üzerindeki etkisi',
    variant_a_name: 'Resmi',
    variant_b_name: 'Samimi',
    target_metric: 'satisfaction_score' as const,
    is_active: true,
    start_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    end_at: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ab-test-2',
    tenant_id: 'default',
    name: 'Açılış Mesajı Testi',
    description: 'Kısa vs detaylı açılış mesajının dönüşüme etkisi',
    variant_a_name: 'Kısa',
    variant_b_name: 'Detaylı',
    target_metric: 'conversion_rate' as const,
    is_active: false,
    start_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    end_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
]

export const mockABTestSummaries = [
  { variant: 'control', total_count: 45, avg_satisfaction: 3.8, avg_completion_rate: 72.4, avg_response_time: 145, handoff_rate: 18.5, conversion_rate: 22.3 },
  { variant: 'treatment', total_count: 48, avg_satisfaction: 4.2, avg_completion_rate: 81.6, avg_response_time: 112, handoff_rate: 12.8, conversion_rate: 31.5 },
]

export const mockABTestResults = [
  { id: 'res-1', test_id: 'ab-test-1', tenant_id: 'default', conversation_id: 'conv-001', variant: 'control' as const, satisfaction_score: 3.5, completion_rate: 70.0, response_time_seconds: 180, message_count: 12, was_handoff: false, converted: true, metadata: {}, recorded_at: new Date().toISOString() },
  { id: 'res-2', test_id: 'ab-test-1', tenant_id: 'default', conversation_id: 'conv-002', variant: 'treatment' as const, satisfaction_score: 4.5, completion_rate: 90.0, response_time_seconds: 90, message_count: 15, was_handoff: false, converted: true, metadata: {}, recorded_at: new Date().toISOString() },
  { id: 'res-3', test_id: 'ab-test-1', tenant_id: 'default', conversation_id: 'conv-003', variant: 'control' as const, satisfaction_score: 2.5, completion_rate: 45.0, response_time_seconds: 300, message_count: 6, was_handoff: true, converted: false, metadata: {}, recorded_at: new Date().toISOString() },
]

// ─── Dashboard Mock Data ──────────────────────────────────────────────────────

export const mockDashboardStats = {
  check_ins_today: 3,
  check_outs_today: 2,
  occupancy_rate: 78,
  pending_actions: 5,
  revenue_today: 1250,
  active_conversations: 8,
  ai_enabled: true,
  messages_today: 47,
}

export const mockConversations = [
  {
    id: 'conv-001',
    guest_name: 'John Smith',
    guest_phone: '***1234',
    state: 'active' as const,
    assigned_agent: null,
    ai_enabled: true,
    message_count: 12,
    last_message_at: new Date().toISOString(),
    language: 'en',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'conv-002',
    guest_name: 'Maria García',
    guest_phone: '***5678',
    state: 'active' as const,
    assigned_agent: 'agent-001',
    ai_enabled: false,
    message_count: 8,
    last_message_at: new Date(Date.now() - 3600000).toISOString(),
    language: 'es',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'conv-003',
    guest_name: 'Pierre Dupont',
    guest_phone: '***9012',
    state: 'closed' as const,
    assigned_agent: null,
    ai_enabled: true,
    message_count: 5,
    last_message_at: new Date(Date.now() - 7200000).toISOString(),
    language: 'fr',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
]

export const mockMessages = [
  {
    id: 'msg-001',
    conversation_id: 'conv-001',
    sender: 'guest' as const,
    content: 'Hello, I would like to know if late check-in is possible?',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    metadata: null,
  },
  {
    id: 'msg-002',
    conversation_id: 'conv-001',
    sender: 'ai' as const,
    content: 'Hello! Yes, late check-in is possible. Our reception is available 24/7. What time are you expecting to arrive?',
    created_at: new Date(Date.now() - 3500000).toISOString(),
    metadata: null,
  },
  {
    id: 'msg-003',
    conversation_id: 'conv-001',
    sender: 'guest' as const,
    content: 'Around 11 PM. Is there anything I need to do?',
    created_at: new Date(Date.now() - 3400000).toISOString(),
    metadata: null,
  },
  {
    id: 'msg-004',
    conversation_id: 'conv-001',
    sender: 'ai' as const,
    content: 'No special action needed! Just come to the reception when you arrive. Have your ID ready and we\'ll take care of the rest.',
    created_at: new Date(Date.now() - 3300000).toISOString(),
    metadata: null,
  },
]

export const mockReservations: Reservation[] = [
  {
    id: 'res-001',
    guest: { name: 'John Smith', phone: '+123****7890', email: 'john@example.com' },
    roomName: '101 - Deluxe Oda',
    checkIn: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    status: 'onayli',
    paymentStatus: 'odeme_alindi',
    nightlyRate: 150,
    nights: 3,
    totalAmount: 450,
    depositAmount: 135,
    ibanReference: '',
    paymentNotes: '',
    createdAt: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: 'res-002',
    guest: { name: 'Maria García', phone: '+346****5678', email: 'maria@example.com' },
    roomName: '205 - Suite',
    checkIn: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 432000000).toISOString().split('T')[0],
    status: 'bekleyen',
    paymentStatus: 'odeme_bekleniyor',
    nightlyRate: 200,
    nights: 3,
    totalAmount: 600,
    depositAmount: 180,
    ibanReference: '4321',
    paymentNotes: '',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'res-003',
    guest: { name: 'Pierre Dupont', phone: '+336****5678', email: 'pierre@example.com' },
    roomName: '302 - Standart Oda',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    status: 'onayli',
    paymentStatus: 'odeme_alindi',
    nightlyRate: 100,
    nights: 2,
    totalAmount: 300,
    depositAmount: 90,
    ibanReference: '',
    paymentNotes: '',
    createdAt: new Date(Date.now() - 864000000).toISOString(),
  },
]

// ─── Business Settings ────────────────────────────────────────────────────────

export const mockBusinessSettings = {
  businessName: "Merman Bungalov",
  phone: "+90 242 555 1234",
  address: "Kumluca Sahil Yolu No: 42, Antalya",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  minimumStay: 2,
  cancellationPolicy:
    "7 gün öncesine kadar ücretsiz iptal. 3-7 gün arası %50 iade. 3 günden az kala iade yapılmaz.",
  webPushEnabled: true,
  telegramEnabled: false,
  whatsappEnabled: false,
  businessHours: {
    monday: { open: "09:00", close: "22:00", isOpen: true },
    tuesday: { open: "09:00", close: "22:00", isOpen: true },
    wednesday: { open: "09:00", close: "22:00", isOpen: true },
    thursday: { open: "09:00", close: "22:00", isOpen: true },
    friday: { open: "09:00", close: "23:00", isOpen: true },
    saturday: { open: "08:00", close: "23:00", isOpen: true },
    sunday: { open: "08:00", close: "22:00", isOpen: true },
  },
  amenities: [
    "WiFi",
    "Klima",
    "Havuz",
    "Otopark",
    "Kahvaltı dahil",
    "Barbekü alanı",
    "Doğa manzarası",
    "Şömine",
  ],
}

// ─── AI Persona ────────────────────────────────────────────────────────────────

export const mockAIPersona = {
  name: "Resepsiyonistim",
  language: "TR" as const,
  tone: "warm" as const,
  responseSpeed: "fast" as const,
  maxConversationTurns: 30,
  handoffTriggerPhrases: [
    "insan ile görüşmek istiyorum",
    "gerçek bir kişi ile konuşmak istiyorum",
    "yetkili biriyle görüşebilir miyim",
  ],
  autoHandoffThreshold: 3,
}

// ─── AI Performance ────────────────────────────────────────────────────────────

export const mockAIPerformance = {
  messagesHandledToday: 23,
  avgResponseTimeSeconds: 1.8,
  handoffRate: 12,
  satisfactionScore: 4.6,
}

// ─── IBAN Payments ─────────────────────────────────────────────────────────────

export interface IBANPayment {
  id: string
  guest_name: string
  guest_phone: string
  reservation_id: string
  amount: number
  currency: string
  iban_last4: string
  reference_code: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  notes: string | null
  room_name: string
  check_in_date: string
}

export const mockIBANPayments: IBANPayment[] = [
  {
    id: 'iban-001',
    guest_name: 'Ahmet Yılmaz',
    guest_phone: '+90 532 *** 45 67',
    reservation_id: 'res-010',
    amount: 4500,
    currency: 'TRY',
    iban_last4: '8742',
    reference_code: 'BNGLV-2026-0142',
    status: 'pending',
    submitted_at: new Date(Date.now() - 3600000).toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    notes: null,
    room_name: 'Orman Bungalov',
    check_in_date: new Date(Date.now() + 604800000).toISOString().split('T')[0],
  },
  {
    id: 'iban-002',
    guest_name: 'Fatma Demir',
    guest_phone: '+90 555 *** 12 34',
    reservation_id: 'res-011',
    amount: 3200,
    currency: 'TRY',
    iban_last4: '5519',
    reference_code: 'BNGLV-2026-0141',
    status: 'pending',
    submitted_at: new Date(Date.now() - 7200000).toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    notes: null,
    room_name: 'Deniz Manzaralı Suite',
    check_in_date: new Date(Date.now() + 432000000).toISOString().split('T')[0],
  },
  {
    id: 'iban-003',
    guest_name: 'Mehmet Kaya',
    guest_phone: '+90 542 *** 89 01',
    reservation_id: 'res-009',
    amount: 6800,
    currency: 'TRY',
    iban_last4: '3327',
    reference_code: 'BNGLV-2026-0139',
    status: 'approved',
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_at: new Date(Date.now() - 43200000).toISOString(),
    reviewed_by: 'admin',
    notes: 'Havale onaylandı, dekont kontrol edildi.',
    room_name: 'Aile Bungalov',
    check_in_date: new Date(Date.now() + 259200000).toISOString().split('T')[0],
  },
  {
    id: 'iban-004',
    guest_name: 'Ayşe Öztürk',
    guest_phone: '+90 533 *** 56 78',
    reservation_id: 'res-008',
    amount: 2100,
    currency: 'TRY',
    iban_last4: '7763',
    reference_code: 'BNGLV-2026-0137',
    status: 'rejected',
    submitted_at: new Date(Date.now() - 172800000).toISOString(),
    reviewed_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_by: 'admin',
    notes: 'Tutar uyuşmazlığı. Misafir ile iletişime geçildi.',
    room_name: 'Standart Oda',
    check_in_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  },
]

// ─── Subscription Mock ──────────────────────────────────────────────────────────

export interface MockSubscription {
  id: string
  plan_name: string
  status: 'active' | 'past_due' | 'cancelled' | 'trial'
  current_period_start: string
  current_period_end: string
  amount: number
  currency: string
  payment_method_last4: string
  next_billing_date: string
  auto_renew: boolean
}
export const mockSubscription: MockSubscription = {
  id: 'sub-001',
  plan_name: 'Profesyonel Plan',
  status: 'active',
  current_period_start: new Date(Date.now() - 1296000000).toISOString().split('T')[0],
  current_period_end: new Date(Date.now() + 1296000000).toISOString().split('T')[0],
  amount: 999,
  currency: 'TRY',
  payment_method_last4: '4242',
  next_billing_date: new Date(Date.now() + 1296000000).toISOString().split('T')[0],
  auto_renew: true,
}

// ─── Analytics Data ────────────────────────────────────────────────────────────

export interface RecentFeedbackItem {
  id: string;
  guest_name: string | null;
  guest_phone: string | null;
  rating: number;
  feedback_text: string | null;
  category_tags: string[];
  created_at: string;
}

export interface AnalyticsData {
  responseTime: {
    avg_seconds: number
    p50_seconds: number
    p95_seconds: number
    trend: { hour: string; seconds: number }[]
  }
  satisfaction: {
    avg_score: number
    total_responses: number
    distribution: { stars: number; count: number }[]
    trend: { week: string; score: number }[]
  }
  conversion: {
    rate: number
    total_conversations: number
    converted: number
    trend: { week: string; rate: number }[]
    funnel: { stage: string; count: number; rate: number }[]
  }
  recentFeedback?: RecentFeedbackItem[]
}

export const mockAnalytics: AnalyticsData = {
  responseTime: {
    avg_seconds: 1.8,
    p50_seconds: 1.2,
    p95_seconds: 4.5,
    trend: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      seconds: 1.2 + Math.random() * 2.5 + (i > 18 && i < 22 ? 1.5 : 0),
    })),
  },
  satisfaction: {
    avg_score: 4.6,
    total_responses: 234,
    distribution: [
      { stars: 5, count: 142 },
      { stars: 4, count: 58 },
      { stars: 3, count: 22 },
      { stars: 2, count: 8 },
      { stars: 1, count: 4 },
    ],
    trend: [
      { week: 'H1', score: 4.3 },
      { week: 'H2', score: 4.4 },
      { week: 'H3', score: 4.5 },
      { week: 'H4', score: 4.6 },
    ],
  },
  conversion: {
    rate: 34.2,
    total_conversations: 687,
    converted: 235,
    trend: [
      { week: 'H1', rate: 28.5 },
      { week: 'H2', rate: 31.2 },
      { week: 'H3', rate: 33.1 },
      { week: 'H4', rate: 34.2 },
    ],
    funnel: [
      { stage: 'Konuşma Başladı', count: 687, rate: 100 },
      { stage: 'Bilgi Paylaşıldı', count: 512, rate: 74.5 },
      { stage: 'Teklif Sunuldu', count: 389, rate: 56.6 },
      { stage: 'Rezervasyon Talebi', count: 287, rate: 41.8 },
      { stage: 'Ödeme Alındı', count: 235, rate: 34.2 },
    ],
  },
}

// ─── Referral Mock Data ─────────────────────────────────────────────────────

export const mockReferralStats = {
  total_referrals: 24,
  pending_count: 8,
  converted_count: 12,
  rewarded_count: 4,
  total_reward_amount: 4500,
  conversion_rate: 50,
  active_codes: 2,
}

export const mockReferrals = [
  {
    id: 'ref-001',
    tenant_id: '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
    referrer_name: 'Ahmet Yılmaz',
    referrer_phone: '905321234567',
    referee_name: 'Mehmet Demir',
    referee_phone: '905329876543',
    referee_email: 'mehmet@example.com',
    status: 'converted' as const,
    reward_type: 'discount' as const,
    reward_amount: 500,
    reward_currency: 'TRY',
    reward_claimed_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    notes: null,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'ref-002',
    tenant_id: '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
    referrer_name: 'Ayşe Kaya',
    referrer_phone: '905321112233',
    referee_name: 'Ali Öztürk',
    referee_phone: '905324455667',
    referee_email: null,
    status: 'pending' as const,
    reward_type: 'credit' as const,
    reward_amount: 300,
    reward_currency: 'TRY',
    reward_claimed_at: null,
    notes: 'Henüz rezervasyon yapmadı',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'ref-003',
    tenant_id: '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
    referrer_name: 'Can Tekin',
    referrer_phone: '905327778899',
    referee_name: 'Zeynep Yıldız',
    referee_phone: '905325550011',
    referee_email: 'zeynep@example.com',
    status: 'rewarded' as const,
    reward_type: 'free_night' as const,
    reward_amount: 1,
    reward_currency: 'gece',
    reward_claimed_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    notes: 'Ücretsiz gece hakkı kullanıldı',
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'ref-004',
    tenant_id: '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
    referrer_name: 'Elif Arslan',
    referrer_phone: '905329990000',
    referee_name: null,
    referee_phone: null,
    referee_email: null,
    status: 'expired' as const,
    reward_type: 'discount' as const,
    reward_amount: 250,
    reward_currency: 'TRY',
    reward_claimed_at: null,
    notes: '30 gün içinde dönüşüm olmadı',
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'ref-005',
    tenant_id: '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
    referrer_name: 'Burak Şahin',
    referrer_phone: '905321110022',
    referee_name: 'Deniz Yılmaz',
    referee_phone: '905323334455',
    referee_email: 'deniz@example.com',
    status: 'pending' as const,
    reward_type: 'cash' as const,
    reward_amount: 200,
    reward_currency: 'TRY',
    reward_claimed_at: null,
    notes: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

export const mockReferralCodes = [
  {
    id: 'rc-001',
    tenant_id: '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
    code: 'DAVET500',
    description: 'Yeni misafirlere özel 500₺ indirim',
    is_active: true,
    max_uses: 50,
    current_uses: 12,
    reward_type: 'discount' as const,
    reward_amount: 500,
    reward_currency: 'TRY',
    expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'rc-002',
    tenant_id: '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
    code: 'ARKADAS200',
    description: 'Arkadaşını getir 200₺ kredi kazan',
    is_active: true,
    max_uses: 100,
    current_uses: 5,
    reward_type: 'credit' as const,
    reward_amount: 200,
    reward_currency: 'TRY',
    expires_at: null,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]
