import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import type {
  PricingOptimizationData,
  RevenueForecastPoint,
  WhatIfScenario,
  WhatIfResult,
} from "@/lib/types/revenue";

// ─── Pricing Optimization Hook ───────────────────────────────────────────────

async function fetchPricingOptimization(
  tenantId: string
): Promise<PricingOptimizationData> {
  // tenantId is used in the request — kept for API consistency
  void tenantId;
  const res = await fetch("/api/analytics/pricing-optimization");

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export function usePricingOptimization() {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<PricingOptimizationData, Error>({
    queryKey: ["pricing-optimization", tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: () => fetchPricingOptimization(tenant!.id),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // every 5 minutes
  });
}

// ─── Revenue Forecast Hook ───────────────────────────────────────────────────

interface RevenueForecastResponse {
  forecast: RevenueForecastPoint[];
  weekly: {
    week_start: string;
    predicted_revenue: number;
    lower_bound: number;
    upper_bound: number;
    predicted_occupancy: number;
  }[];
  meta: {
    horizon_days: number;
    scenario: string;
    scenario_label: string;
    base_monthly_revenue: number;
    active_rooms: number;
    generated_at: string;
  };
}

async function fetchRevenueForecast(
  tenantId: string,
  days = 90,
  scenario = "base"
): Promise<RevenueForecastResponse> {
  void tenantId;
  const params = new URLSearchParams({ days: String(days), scenario });
  const res = await fetch(`/api/analytics/revenue-forecast?${params}`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export function useRevenueForecast(days = 90, scenario: "base" | "optimistic" | "conservative" = "base") {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<RevenueForecastResponse, Error>({
    queryKey: ["revenue-forecast", tenant?.id, days, scenario],
    enabled: isAuthenticated && !!tenant,
    queryFn: () => fetchRevenueForecast(tenant!.id, days, scenario),
    staleTime: 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

// ─── What-If Scenario Simulator (client-side) ───────────────────────────────

export function simulateWhatIf(
  baseData: PricingOptimizationData,
  scenario: WhatIfScenario
): WhatIfResult {
  const { summary } = baseData;
  const monthlyRevenue = summary.revenue_this_month || summary.revenue_last_month || 50000;

  // Price elasticity model
  const elasticity = -0.35;
  const priceChange = scenario.adjustment_value / 100;
  const occChange = 1 + elasticity * priceChange;
  const seasonEffect = 1 + scenario.season_boost / 100;
  const multiplier = 1 + priceChange;

  const projectedOcc = Math.min(1, Math.max(0.15, (summary.avg_occupancy / 100) * occChange * seasonEffect));
  const projectedMonthlyRev = Math.round(monthlyRevenue * multiplier * occChange * seasonEffect);
  const revenueChange = Math.round(((projectedMonthlyRev - monthlyRevenue) / monthlyRevenue) * 1000) / 10;
  const occupancyChange = Math.round((projectedOcc - summary.avg_occupancy / 100) * 1000) / 10;
  const projectedRevpar = Math.round(summary.avg_daily_rate * projectedOcc);

  const riskLevel = scenario.risk_level ?? "medium";
  const spread = riskLevel === "high" ? 0.25 : riskLevel === "medium" ? 0.15 : 0.08;

  return {
    name: scenario.name,
    projected_monthly_revenue: projectedMonthlyRev,
    projected_occupancy: Math.round(projectedOcc * 1000) / 10,
    projected_revpar: projectedRevpar,
    revenue_change: revenueChange,
    occupancy_change: occupancyChange,
    confidence_interval: [
      Math.round(projectedMonthlyRev * (1 - spread)),
      Math.round(projectedMonthlyRev * (1 + spread)),
    ],
  };
}
