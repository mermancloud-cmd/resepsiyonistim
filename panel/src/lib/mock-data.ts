/**
 * Mock data for graceful degradation when API calls fail.
 * These are used as fallbacks in the hooks.
 */

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

export const mockReservations = [
  {
    id: 'res-001',
    tenant_id: 'tenant-001',
    guest_name: 'John Smith',
    guest_email: 'john@example.com',
    guest_phone: '+123****7890',
    room_id: 'room-001',
    check_in_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    status: 'confirmed' as const,
    total_amount: 450,
    payment_method: 'card',
    payment_status: 'confirmed' as const,
    payment_notes: null,
    iban_last4: null,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    updated_at: new Date(Date.now() - 432000000).toISOString(),
    rooms: {
      room_number: '101',
      room_type: 'Deluxe',
      capacity: 2,
      price_per_night: 150,
    },
  },
  {
    id: 'res-002',
    tenant_id: 'tenant-001',
    guest_name: 'Maria García',
    guest_email: 'maria@example.com',
    guest_phone: '+346****5678',
    room_id: 'room-002',
    check_in_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 432000000).toISOString().split('T')[0],
    status: 'pending' as const,
    total_amount: 600,
    payment_method: 'bank_transfer',
    payment_status: 'pending' as const,
    payment_notes: null,
    iban_last4: '4321',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    rooms: {
      room_number: '205',
      room_type: 'Suite',
      capacity: 3,
      price_per_night: 200,
    },
  },
  {
    id: 'res-003',
    tenant_id: 'tenant-001',
    guest_name: 'Pierre Dupont',
    guest_email: 'pierre@example.com',
    guest_phone: '+336****5678',
    room_id: 'room-003',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    status: 'confirmed' as const,
    total_amount: 300,
    payment_method: 'card',
    payment_status: 'confirmed' as const,
    payment_notes: null,
    iban_last4: null,
    created_at: new Date(Date.now() - 864000000).toISOString(),
    updated_at: new Date(Date.now() - 864000000).toISOString(),
    rooms: {
      room_number: '302',
      room_type: 'Standard',
      capacity: 2,
      price_per_night: 100,
    },
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
  name: "Elif",
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

// ─── IYZICO Subscription ───────────────────────────────────────────────────────

export interface IyzicoSubscription {
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

export const mockIyzicoSubscription: IyzicoSubscription = {
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
