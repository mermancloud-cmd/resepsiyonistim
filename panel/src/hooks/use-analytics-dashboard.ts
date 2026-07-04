import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InquiryCategory =
  | "reservation"
  | "amenities"
  | "directions"
  | "cancellation"
  | "other";

export interface ConversationMetric {
  total_today: number;
  response_rate: number; // percentage of conversations that got a reply
  avg_response_time_seconds: number;
}

export interface InquiryBreakdown {
  category: InquiryCategory;
  count: number;
  percentage: number;
}

export interface AIResolution {
  total_conversations: number;
  ai_resolved: number; // handled without human intervention
  human_handoff: number;
  resolution_rate: number; // percentage
}

export interface RecentConversation {
  id: string;
  guest_name: string | null;
  guest_phone: string;
  state: string;
  message_count: number;
  last_activity: string;
  is_ai_handled: boolean;
  assigned_agent: string | null;
  inquiry_category: InquiryCategory;
}

export interface RevenueIndicator {
  pending_iban_count: number;
  pending_iban_total: number;
  confirmed_bookings_count: number;
  confirmed_bookings_total: number;
  today_revenue: number;
}

export interface QuickActionState {
  ai_enabled: boolean;
  dlq_error_count: number;
  active_rooms_count: number;
}

export interface AnalyticsDashboardData {
  conversation_metrics: ConversationMetric;
  inquiry_breakdown: InquiryBreakdown[];
  ai_resolution: AIResolution;
  recent_conversations: RecentConversation[];
  revenue_indicators: RevenueIndicator;
  quick_actions: QuickActionState;
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockDashboardData: AnalyticsDashboardData = {
  conversation_metrics: {
    total_today: 23,
    response_rate: 96.5,
    avg_response_time_seconds: 1.8,
  },
  inquiry_breakdown: [
    { category: "reservation", count: 12, percentage: 52.2 },
    { category: "amenities", count: 5, percentage: 21.7 },
    { category: "directions", count: 3, percentage: 13.0 },
    { category: "cancellation", count: 2, percentage: 8.7 },
    { category: "other", count: 1, percentage: 4.3 },
  ],
  ai_resolution: {
    total_conversations: 23,
    ai_resolved: 18,
    human_handoff: 5,
    resolution_rate: 78.3,
  },
  recent_conversations: [
    {
      id: "conv-001",
      guest_name: "Ahmet Yılmaz",
      guest_phone: "***4567",
      state: "CONFIRMING_RESERVATION",
      message_count: 14,
      last_activity: new Date(Date.now() - 5 * 60_000).toISOString(),
      is_ai_handled: true,
      assigned_agent: null,
      inquiry_category: "reservation",
    },
    {
      id: "conv-002",
      guest_name: "Fatma Demir",
      guest_phone: "***1234",
      state: "AWAITING_DEPOSIT",
      message_count: 8,
      last_activity: new Date(Date.now() - 22 * 60_000).toISOString(),
      is_ai_handled: true,
      assigned_agent: null,
      inquiry_category: "reservation",
    },
    {
      id: "conv-003",
      guest_name: "Mehmet Kaya",
      guest_phone: "***8901",
      state: "HUMAN_HANDOFF",
      message_count: 6,
      last_activity: new Date(Date.now() - 45 * 60_000).toISOString(),
      is_ai_handled: false,
      assigned_agent: "agent-01",
      inquiry_category: "cancellation",
    },
    {
      id: "conv-004",
      guest_name: "Ayşe Öztürk",
      guest_phone: "***5678",
      state: "PRESENTING_ROOMS",
      message_count: 4,
      last_activity: new Date(Date.now() - 68 * 60_000).toISOString(),
      is_ai_handled: true,
      assigned_agent: null,
      inquiry_category: "amenities",
    },
    {
      id: "conv-005",
      guest_name: "Can Burak",
      guest_phone: "***3456",
      state: "END",
      message_count: 10,
      last_activity: new Date(Date.now() - 120 * 60_000).toISOString(),
      is_ai_handled: true,
      assigned_agent: null,
      inquiry_category: "directions",
    },
  ],
  revenue_indicators: {
    pending_iban_count: 3,
    pending_iban_total: 9800,
    confirmed_bookings_count: 7,
    confirmed_bookings_total: 28500,
    today_revenue: 4200,
  },
  quick_actions: {
    ai_enabled: true,
    dlq_error_count: 2,
    active_rooms_count: 5,
  },
};

// ─── Supabase query ──────────────────────────────────────────────────────────

async function fetchAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
  try {
    const supabase = createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Run all queries in parallel
    const [
      conversationsResult,
      reservationsResult,
      ibanPaymentsResult,
      roomsResult,
    ] = await Promise.all([
      // Today's conversations
      supabase
        .from("conversations")
        .select(
          "id, guest_phone, state, message_count, assigned_agent, created_at, updated_at"
        )
        .gte("created_at", todayISO)
        .order("updated_at", { ascending: false })
        .limit(20),

      // Reservations for revenue indicators
      supabase
        .from("reservations")
        .select("id, total_amount, status, payment_status, created_at")
        .gte("created_at", todayISO),

      // Pending IBAN payments
      supabase
        .from("iban_payments")
        .select("id, amount, status")
        .eq("status", "pending"),

      // Active rooms
      supabase
        .from("bungalow_rooms")
        .select("id")
        .eq("is_active", true),
    ]);

    // ── Conversation metrics ──────────────────────────────────────
    const conversations = conversationsResult.data ?? [];
    const totalToday = conversations.length;

    // Response rate: conversations with > 1 message (got a reply)
    const respondedCount = conversations.filter(
      (c: { message_count: number }) => c.message_count > 1
    ).length;
    const responseRate =
      totalToday > 0 ? Math.round((respondedCount / totalToday) * 1000) / 10 : 0;

    // Avg response time — use a rough estimate from message_count and time span
    const avgResponseTime =
      totalToday > 0
        ? Math.round(
            conversations.reduce(
              (sum: number, c: { message_count: number; created_at: string; updated_at: string }) => {
                if (c.message_count <= 1) return sum + 300; // no reply = 5min penalty
                const duration =
                  new Date(c.updated_at).getTime() -
                  new Date(c.created_at).getTime();
                const avgPerMessage =
                  duration / Math.max(c.message_count - 1, 1) / 1000;
                return sum + Math.min(avgPerMessage, 60); // cap at 60s
              },
              0
            ) / totalToday * 10
          ) / 10
        : 0;

    // ── Inquiry breakdown ─────────────────────────────────────────
    // Infer category from conversation state
    const categoryMap: Record<string, InquiryCategory> = {
      CONFIRMING_RESERVATION: "reservation",
      AWAITING_DEPOSIT: "reservation",
      RESERVATION_CONFIRMED: "reservation",
      PRESENTING_ROOMS: "amenities",
      COLLECTING_GUEST_INFO: "reservation",
      QUALIFYING: "other",
      GREETING: "other",
      HANDLING_OBJECTIONS: "other",
      HUMAN_HANDOFF: "cancellation",
      COMPLAINT: "cancellation",
      FOLLOW_UP: "directions",
      END: "other",
    };

    const categoryCounts: Record<InquiryCategory, number> = {
      reservation: 0,
      amenities: 0,
      directions: 0,
      cancellation: 0,
      other: 0,
    };

    for (const c of conversations) {
      const cat = categoryMap[c.state as string] ?? "other";
      categoryCounts[cat]++;
    }

    const inquiryBreakdown: InquiryBreakdown[] = (
      Object.entries(categoryCounts) as [InquiryCategory, number][]
    )
      .filter(([, count]) => count > 0)
      .map(([category, count]) => ({
        category,
        count,
        percentage:
          totalToday > 0
            ? Math.round((count / totalToday) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // ── AI resolution ─────────────────────────────────────────────
    const aiResolved = conversations.filter(
      (c: { assigned_agent: string | null; state: string }) =>
        !c.assigned_agent && c.state !== "HUMAN_HANDOFF"
    ).length;
    const humanHandoff = totalToday - aiResolved;
    const resolutionRate =
      totalToday > 0
        ? Math.round((aiResolved / totalToday) * 1000) / 10
        : 0;

    // ── Recent conversations ──────────────────────────────────────
    const recentConversations: RecentConversation[] = conversations
      .slice(0, 10)
      .map((c: { id: string; guest_phone: string; state: string; message_count: number; updated_at: string; assigned_agent: string | null }) => ({
        id: c.id,
        guest_name: null, // name not stored in conversations table
        guest_phone: c.guest_phone,
        state: c.state,
        message_count: c.message_count,
        last_activity: c.updated_at,
        is_ai_handled: !c.assigned_agent,
        assigned_agent: c.assigned_agent,
        inquiry_category: categoryMap[c.state] ?? "other",
      }));

    // ── Revenue indicators ────────────────────────────────────────
    const reservations = reservationsResult.data ?? [];
    const confirmedBookings = reservations.filter(
      (r: { status: string }) => r.status === "confirmed"
    );
    const confirmedTotal = confirmedBookings.reduce(
      (s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0),
      0
    );

    const ibanPayments = ibanPaymentsResult.data ?? [];
    const pendingIBAN = ibanPayments.filter(
      (p: { status: string }) => p.status === "pending"
    );
    const pendingIBANTotal = pendingIBAN.reduce(
      (s: number, p: { amount: number }) => s + (p.amount ?? 0),
      0
    );

    const todayRevenue = reservations.reduce(
      (s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0),
      0
    );

    // ── Quick actions ─────────────────────────────────────────────
    const rooms = roomsResult.data ?? [];

    return {
      conversation_metrics: {
        total_today: totalToday,
        response_rate: responseRate,
        avg_response_time_seconds: avgResponseTime,
      },
      inquiry_breakdown: inquiryBreakdown,
      ai_resolution: {
        total_conversations: totalToday,
        ai_resolved: aiResolved,
        human_handoff: humanHandoff,
        resolution_rate: resolutionRate,
      },
      recent_conversations: recentConversations,
      revenue_indicators: {
        pending_iban_count: pendingIBAN.length,
        pending_iban_total: pendingIBANTotal,
        confirmed_bookings_count: confirmedBookings.length,
        confirmed_bookings_total: confirmedTotal,
        today_revenue: todayRevenue,
      },
      quick_actions: {
        ai_enabled: true, // Default — would come from tenant_settings
        dlq_error_count: 0, // Would need a DLQ table query
        active_rooms_count: rooms.length,
      },
    };
  } catch (error) {
    console.warn(
      "Supabase analytics query failed, falling back to mock data:",
      error
    );
    return mockDashboardData;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAnalyticsDashboard() {
  return useQuery<AnalyticsDashboardData, Error>({
    queryKey: ["analytics-dashboard"],
    queryFn: fetchAnalyticsDashboard,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}
