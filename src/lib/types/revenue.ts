// ═══════════════════════════════════════════════════════════════════════════════
// Revenue Management — Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

export interface PricingSuggestion {
  room_id: string;
  room_name: string;
  current_price: number;
  suggested_price: number;
  confidence: number; // 0-1
  reason: string;
  season: string;
  competitor_proxy: number;
}

export interface PricingScenario {
  id: string;
  name: string;
  description: string;
  adjustment_type: "percentage" | "fixed";
  adjustment_value: number;
  projected_revenue: number;
  projected_occupancy: number;
  risk_level: "low" | "medium" | "high";
}

export interface TierPricing {
  tier_id: string;
  tier_name: string;
  tier_slug: string;
  base_discount_pct: number;
  room_prices: {
    room_id: string;
    room_name: string;
    standard_price: number;
    tier_price: number;
  }[];
}

export interface RevenueForecastPoint {
  date: string; // YYYY-MM-DD
  predicted_revenue: number;
  lower_bound: number;
  upper_bound: number;
  predicted_occupancy: number;
}

export interface PricingOptimizationData {
  current_revenue: number;
  projected_revenue: number;
  revenue_gap: number;
  suggestions: PricingSuggestion[];
  scenarios: PricingScenario[];
  forecast: RevenueForecastPoint[];
  tier_pricing: TierPricing[];
  summary: {
    total_rooms: number;
    active_rooms: number;
    avg_occupancy: number;
    avg_daily_rate: number;
    revpar: number;
    revenue_last_month: number;
    revenue_this_month: number;
    month_over_month_change: number;
  };
}

export interface WhatIfScenario {
  name: string;
  adjustment_type: "percentage" | "fixed";
  adjustment_value: number;
  target_rooms: "all" | string[];
  season_boost: number; // 0-100
  risk_level?: "low" | "medium" | "high";
}

export interface WhatIfResult {
  name: string;
  projected_monthly_revenue: number;
  projected_occupancy: number;
  projected_revpar: number;
  revenue_change: number;
  occupancy_change: number;
  confidence_interval: [number, number];
}

// ─── DB Row Types ────────────────────────────────────────────────────────────

export interface RevenueForecastRow {
  id: string;
  tenant_id: string;
  forecast_date: string;
  predicted_revenue: number;
  lower_bound: number;
  upper_bound: number;
  predicted_occupancy: number;
  model_version: string;
  created_at: string;
}

export interface PricingOptimizationRow {
  id: string;
  tenant_id: string;
  room_id: string;
  current_price: number;
  suggested_price: number;
  confidence: number;
  reason: string;
  season: string;
  competitor_proxy: number;
  is_applied: boolean;
  created_at: string;
}
