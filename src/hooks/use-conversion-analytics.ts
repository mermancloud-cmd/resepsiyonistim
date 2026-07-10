import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { subDays } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConversionFunnelStage {
  stage: string;
  count: number;
  rate: number;
}

export interface CROElementStat {
  element_type: string;
  event_type: string;
  total_views: number;
  unique_visitors: number;
}

export interface DailyVisitorStat {
  date: string;
  page_views: number;
  unique_visitors: number;
  cta_clicks: number;
}

export interface ConversionAnalyticsData {
  funnel: ConversionFunnelStage[];
  cro_stats: CROElementStat[];
  daily_stats: DailyVisitorStat[];
  summary: {
    total_visitors_30d: number;
    total_page_views_30d: number;
    conversion_rate: number; // signup_completed / page_view
    trial_activation_rate: number; // trial_activated / signup_completed
    cta_click_rate: number; // cta_click / page_view
    social_proof_views: number;
  };
}

// ─── Default / Empty State ───────────────────────────────────────────────────

const emptyData: ConversionAnalyticsData = {
  funnel: [],
  cro_stats: [],
  daily_stats: [],
  summary: {
    total_visitors_30d: 0,
    total_page_views_30d: 0,
    conversion_rate: 0,
    trial_activation_rate: 0,
    cta_click_rate: 0,
    social_proof_views: 0,
  },
};

// ─── Fetch function ──────────────────────────────────────────────────────────

async function fetchConversionAnalytics(): Promise<ConversionAnalyticsData> {
  try {
    const supabase = createClient();
    const now = new Date();
    const startDate = subDays(now, 30).toISOString();

    const [funnelResult, croResult, dailyResult, summaryResult] =
      await Promise.all([
        // Funnel via RPC
        supabase.rpc("get_conversion_funnel", {
          p_start_date: startDate,
          p_end_date: now.toISOString(),
        }),

        // CRO element stats via RPC
        supabase.rpc("get_cro_element_stats", {
          p_start_date: startDate,
          p_end_date: now.toISOString(),
        }),

        // Daily stats via RPC
        supabase.rpc("get_daily_visitor_stats", {
          p_start_date: startDate,
          p_end_date: now.toISOString(),
        }),

        // Summary aggregations
        supabase
          .from("landing_page_events")
          .select("event_type, visitor_id", { count: "exact", head: false })
          .gte("created_at", startDate),
      ]);

    const funnel = (funnelResult.data ?? []) as ConversionFunnelStage[];
    const croStats = (croResult.data ?? []) as CROElementStat[];
    const dailyStats = (dailyResult.data ?? []) as DailyVisitorStat[];

    // Compute summary stats
    const allEvents = summaryResult.data ?? [];
    const totalPageViews = allEvents.filter(
      (e: { event_type: string }) => e.event_type === "page_view"
    ).length;
    const uniqueVisitors = new Set(
      allEvents.map((e: { visitor_id: string }) => e.visitor_id)
    ).size;
    const signupsCompleted = allEvents.filter(
      (e: { event_type: string }) => e.event_type === "signup_completed"
    ).length;
    const trialsActivated = allEvents.filter(
      (e: { event_type: string }) => e.event_type === "trial_activated"
    ).length;
    const ctaClicks = allEvents.filter(
      (e: { event_type: string }) => e.event_type === "cta_click"
    ).length;
    const socialProofViews = allEvents.filter(
      (e: { event_type: string }) => e.event_type === "social_proof_view"
    ).length;

    return {
      funnel,
      cro_stats: croStats,
      daily_stats: dailyStats,
      summary: {
        total_visitors_30d: uniqueVisitors,
        total_page_views_30d: totalPageViews,
        conversion_rate:
          totalPageViews > 0
            ? Math.round((signupsCompleted / totalPageViews) * 1000) / 10
            : 0,
        trial_activation_rate:
          signupsCompleted > 0
            ? Math.round((trialsActivated / signupsCompleted) * 1000) / 10
            : 0,
        cta_click_rate:
          totalPageViews > 0
            ? Math.round((ctaClicks / totalPageViews) * 1000) / 10
            : 0,
        social_proof_views: socialProofViews,
      },
    };
  } catch {
    return emptyData;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useConversionAnalytics() {
  return useQuery<ConversionAnalyticsData, Error>({
    queryKey: ["conversion-analytics"],
    queryFn: fetchConversionAnalytics,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
