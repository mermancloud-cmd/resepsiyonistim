import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AnalyticsData } from "@/lib/mock-data";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SatisfactionSurvey {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  rating: number;
  feedback_text: string | null;
  category_tags: string[];
  created_at: string;
}

export interface RecentFeedback {
  id: string;
  guest_name: string | null;
  guest_phone: string | null;
  rating: number;
  feedback_text: string | null;
  category_tags: string[];
  created_at: string;
}

// ─── Supabase queries ────────────────────────────────────────────────────────

async function fetchSatisfactionAnalytics(): Promise<AnalyticsData> {
  try {
    const supabase = createClient();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Run all queries in parallel
    const [
      surveysResult,
      todayConversationsResult,
      recentSurveysResult,
      thirtyDayConversationsResult,
    ] = await Promise.all([
      // All surveys in last 30 days
      supabase
        .from("guest_satisfaction_surveys")
        .select("id, rating, feedback_text, category_tags, created_at")
        .gte("created_at", thirtyDaysAgoISO)
        .order("created_at", { ascending: false }),

      // Today's conversations for response rate
      supabase
        .from("conversations")
        .select("id, message_count, created_at, updated_at, state, assigned_agent")
        .gte("created_at", todayISO)
        .order("updated_at", { ascending: false }),

      // Recent surveys with guest info (last 10)
      supabase
        .from("guest_satisfaction_surveys")
        .select("id, guest_name, guest_phone, rating, feedback_text, category_tags, created_at")
        .order("created_at", { ascending: false })
        .limit(10),

      // 30-day conversations for response time trend
      supabase
        .from("conversations")
        .select("id, state, message_count, created_at, updated_at")
        .gte("created_at", thirtyDaysAgoISO)
        .order("created_at", { ascending: true }),
    ]);

    // ── Satisfaction metrics ──────────────────────────────────────
    const surveys = surveysResult.data ?? [];
    const totalResponses = surveys.length;

    // Average rating
    const avgScore =
      totalResponses > 0
        ? Math.round(
            (surveys.reduce(
              (sum: number, s: { rating: number }) => sum + s.rating,
              0
            ) /
              totalResponses) *
              10
          ) / 10
        : 0;

    // Star distribution
    const distribution: { stars: number; count: number }[] = [];
    for (let star = 5; star >= 1; star--) {
      distribution.push({
        stars: star,
        count: surveys.filter((s: { rating: number }) => s.rating === star)
          .length,
      });
    }

    // Weekly trend (group by week for last 4 weeks)
    const weeklyTrend: { week: string; score: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(
        now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const weekSurveys = surveys.filter((s: { created_at: string }) => {
        const d = new Date(s.created_at);
        return d >= weekStart && d < weekEnd;
      });
      const weekAvg =
        weekSurveys.length > 0
          ? Math.round(
              (weekSurveys.reduce(
                (sum: number, s: { rating: number }) => sum + s.rating,
                0
              ) /
                weekSurveys.length) *
                10
            ) / 10
          : 0;
      weeklyTrend.push({
        week: `H${4 - w}`,
        score: weekAvg,
      });
    }

    // ── Response time metrics ─────────────────────────────────────
    const todayConversations = todayConversationsResult.data ?? [];
    const allConversations30d = thirtyDayConversationsResult.data ?? [];

    // Calculate response times from conversations
    const responseTimes: number[] = [];
    for (const c of todayConversations) {
      if (
        (c as { message_count: number }).message_count > 1 &&
        c.created_at &&
        c.updated_at
      ) {
        const duration =
          new Date(c.updated_at).getTime() - new Date(c.created_at).getTime();
        const avgPerMsg =
          duration /
          Math.max((c as { message_count: number }).message_count - 1, 1) /
          1000;
        responseTimes.push(Math.min(avgPerMsg, 120)); // cap at 120s
      }
    }

    const avgResponseTime =
      responseTimes.length > 0
        ? Math.round(
            (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) *
              10
          ) / 10
        : 0;

    // P50 and P95
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const p50 =
      sorted.length > 0
        ? Math.round(sorted[Math.floor(sorted.length * 0.5)] * 10) / 10
        : 0;
    const p95 =
      sorted.length > 0
        ? Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10
        : 0;

    // Hourly trend for response time (last 24 hours)
    const hourlyTrend: { hour: string; seconds: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date();
      hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date();
      hourEnd.setHours(h + 1, 0, 0, 0);

      const hourConvs = todayConversations.filter(
        (c: { created_at: string; message_count: number; updated_at: string }) => {
          const d = new Date(c.created_at);
          return d >= hourStart && d < hourEnd && c.message_count > 1;
        }
      );

      const hourAvg =
        hourConvs.length > 0
          ? Math.round(
              (hourConvs.reduce(
                (sum: number, c: { created_at: string; updated_at: string; message_count: number }) => {
                  const dur =
                    (new Date(c.updated_at).getTime() -
                      new Date(c.created_at).getTime()) /
                    Math.max(c.message_count - 1, 1) /
                    1000;
                  return sum + Math.min(dur, 120);
                },
                0
              ) /
                hourConvs.length) *
                10
            ) / 10
          : 0;

      hourlyTrend.push({
        hour: `${h.toString().padStart(2, "0")}:00`,
        seconds: hourAvg,
      });
    }

    // ── Conversion metrics ────────────────────────────────────────
    const totalConversations30d = allConversations30d.length;
    const converted = allConversations30d.filter(
      (c: { state: string }) =>
        c.state === "RESERVATION_CONFIRMED" ||
        c.state === "END"
    ).length;
    const conversionRate =
      totalConversations30d > 0
        ? Math.round((converted / totalConversations30d) * 1000) / 10
        : 0;

    // Conversion funnel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const states = allConversations30d.map(
      (c: any) => c.state as string
    );
    const started = totalConversations30d || 1;
    const infoShared = states.filter((s: string) =>
      [
        "PRESENTING_ROOMS",
        "COLLECTING_GUEST_INFO",
        "CONFIRMING_RESERVATION",
        "AWAITING_DEPOSIT",
        "RESERVATION_CONFIRMED",
        "END",
      ].includes(s)
    ).length;
    const offerSent = states.filter((s: string) =>
      [
        "CONFIRMING_RESERVATION",
        "AWAITING_DEPOSIT",
        "RESERVATION_CONFIRMED",
        "END",
      ].includes(s)
    ).length;
    const reservationReq = states.filter((s: string) =>
      [
        "AWAITING_DEPOSIT",
        "RESERVATION_CONFIRMED",
        "END",
      ].includes(s)
    ).length;

    const funnel = [
      {
        stage: "Konuşma Başladı",
        count: started,
        rate: 100,
      },
      {
        stage: "Bilgi Paylaşıldı",
        count: infoShared,
        rate: Math.round((infoShared / started) * 1000) / 10,
      },
      {
        stage: "Teklif Sunuldu",
        count: offerSent,
        rate: Math.round((offerSent / started) * 1000) / 10,
      },
      {
        stage: "Rezervasyon Talebi",
        count: reservationReq,
        rate: Math.round((reservationReq / started) * 1000) / 10,
      },
      {
        stage: "Ödeme Alındı",
        count: converted,
        rate: conversionRate,
      },
    ];

    // Weekly conversion trend
    const conversionTrend: { week: string; rate: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(
        now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const weekConvs = allConversations30d.filter(
        (c: { created_at: string }) => {
          const d = new Date(c.created_at);
          return d >= weekStart && d < weekEnd;
        }
      );
      const weekConverted = weekConvs.filter(
        (c: { state: string }) =>
          c.state === "RESERVATION_CONFIRMED" || c.state === "END"
      ).length;
      const weekRate =
        weekConvs.length > 0
          ? Math.round((weekConverted / weekConvs.length) * 1000) / 10
          : 0;
      conversionTrend.push({
        week: `H${4 - w}`,
        rate: weekRate,
      });
    }

    // ── Recent feedback ───────────────────────────────────────────
    const recentFeedback: RecentFeedback[] = (recentSurveysResult.data ?? []).map(
      (s: {
        id: string;
        guest_name: string | null;
        guest_phone: string | null;
        rating: number;
        feedback_text: string | null;
        category_tags: string[];
        created_at: string;
      }) => ({
        id: s.id,
        guest_name: s.guest_name,
        guest_phone: s.guest_phone,
        rating: s.rating,
        feedback_text: s.feedback_text,
        category_tags: s.category_tags ?? [],
        created_at: s.created_at,
      })
    );

    return {
      responseTime: {
        avg_seconds: avgResponseTime,
        p50_seconds: p50,
        p95_seconds: p95,
        trend: hourlyTrend,
      },
      satisfaction: {
        avg_score: avgScore,
        total_responses: totalResponses,
        distribution,
        trend: weeklyTrend,
      },
      conversion: {
        rate: conversionRate,
        total_conversations: totalConversations30d,
        converted,
        trend: conversionTrend,
        funnel,
      },
      recentFeedback,
    } as AnalyticsData & { recentFeedback: RecentFeedback[] };
  } catch (error) {
    console.warn(
      "Supabase satisfaction analytics query failed, falling back to mock data:",
      error
    );
    // Dynamic import to avoid circular deps at module level
    const { mockAnalytics } = await import("@/lib/mock-data");
    return { ...mockAnalytics, recentFeedback: [] } as AnalyticsData & {
      recentFeedback: RecentFeedback[];
    };
  }
}

// ─── Extended data type with feedback ─────────────────────────────────────────

export type SatisfactionAnalyticsData = AnalyticsData & {
  recentFeedback: RecentFeedback[];
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSatisfactionAnalytics() {
  return useQuery<SatisfactionAnalyticsData, Error>({
    queryKey: ["satisfaction-analytics"],
    queryFn: fetchSatisfactionAnalytics as unknown as () => Promise<SatisfactionAnalyticsData>,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}
