import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiGuard } from "@/lib/rbac/api-guard";
import type { PricingOptimizationData, PricingSuggestion, PricingScenario, RevenueForecastPoint, TierPricing } from "@/lib/types/revenue";

export const dynamic = "force-dynamic";

// ─── Pricing Engine ──────────────────────────────────────────────────────────

type Season = "low" | "mid" | "high" | "peak";

function getCurrentSeason(): Season {
  const m = new Date().getMonth();
  if (m >= 5 && m <= 7) return "peak";       // Jun-Aug
  if (m >= 3 && m <= 4 || m >= 8 && m <= 9) return "high"; // Apr-May, Sep-Oct
  if (m >= 10 || m <= 1) return "low";        // Nov-Feb
  return "mid";                                // Mar
}

function seasonMultiplier(season: Season): number {
  const map: Record<Season, number> = { low: 0.85, mid: 1.0, high: 1.15, peak: 1.35 };
  return map[season];
}

function suggestPrice(
  basePrice: number,
  occupancyRate: number,
  season: Season,
  daysSinceUpdate: number
): { suggested: number; confidence: number; reason: string; competitorProxy: number } {
  const seasonFactor = seasonMultiplier(season);
  const demandFactor = 1 + (occupancyRate - 0.5) * 0.6; // high occupancy → higher price
  const stalenessPenalty = Math.min(daysSinceUpdate / 90, 1) * 0.05;
  const competitorProxy = Math.round(basePrice * seasonFactor * (0.9 + Math.random() * 0.2));

  // Weighted suggestion
  let suggested = basePrice * seasonFactor * demandFactor;
  suggested = suggested * (1 - stalenessPenalty);

  // Blend with competitor proxy (30% weight)
  suggested = suggested * 0.7 + competitorProxy * 0.3;

  // Round to nearest 50
  suggested = Math.round(suggested / 50) * 50;

  const diff = Math.abs(suggested - basePrice);
  const confidence = Math.min(
    Math.max(0.3, 1 - diff / basePrice - stalenessPenalty),
    0.95
  );

  let reason = "Talep bazlı fiyatlandırma";
  if (suggested > basePrice * 1.1) reason = "Yüksek talep — fiyat artışı önerilir";
  else if (suggested < basePrice * 0.9) reason = "Düşük talep — fiyat indirimi önerilir";
  else if (occupancyRate > 0.7) reason = "Doluluk yüksek — fiyat optimizasyonu";
  else reason = "Piyasa koşullarına göre fiyat güncellemesi";

  return { suggested: Math.max(suggested, basePrice * 0.5), confidence, reason, competitorProxy };
}

// ─── Forecast model (N3) ────────────────────────────────────────────────────

function generateForecast(
  revenueMonthly: { month: string; revenue: number }[],
  activeRooms: number,
  avgDailyRate: number
): RevenueForecastPoint[] {
  const now = new Date();
  const points: RevenueForecastPoint[] = [];

  // Simple moving average model — N3 proxy
  const recentRevenues = revenueMonthly.slice(-3).map((r) => r.revenue);
  const baseRevenue = recentRevenues.length > 0
    ? recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length
    : avgDailyRate * activeRooms * 30;

  const seasonalFactors: Record<number, number> = {
    0: 0.7, 1: 0.65, 2: 0.8, 3: 0.9, 4: 1.0,
    5: 1.2, 6: 1.4, 7: 1.35, 8: 1.15, 9: 1.0,
    10: 0.85, 11: 0.75,
  };

  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const month = d.getMonth();
    const seasonalFactor = seasonalFactors[month] ?? 1.0;
    const dayOfWeek = d.getDay();
    const weekendBoost = dayOfWeek >= 5 ? 1.15 : 1.0;

    const predicted = baseRevenue * seasonalFactor * weekendBoost / 30;
    const noise = 1 + (Math.random() - 0.5) * 0.2;
    const value = predicted * noise;

    points.push({
      date: d.toISOString().slice(0, 10),
      predicted_revenue: Math.round(value),
      lower_bound: Math.round(value * 0.8),
      upper_bound: Math.round(value * 1.2),
      predicted_occupancy: Math.min(1, Math.max(0.2, seasonalFactor * 0.7 + (Math.random() - 0.5) * 0.2)),
    });
  }

  return points;
}

// ─── What-If Scenarios ───────────────────────────────────────────────────────

const SCENARIOS: PricingScenario[] = [
  {
    id: "optimistic",
    name: "İyimser (Fiyat +%10)",
    description: "Tüm odalarda %10 fiyat artışı, dolulukta hafif düşüş",
    adjustment_type: "percentage",
    adjustment_value: 10,
    projected_revenue: 0, // computed dynamically
    projected_occupancy: 0,
    risk_level: "medium",
  },
  {
    id: "conservative",
    name: "Temkinli (Fiyat +%5)",
    description: "Hafif fiyat artışı, doluluk korunur",
    adjustment_type: "percentage",
    adjustment_value: 5,
    projected_revenue: 0,
    projected_occupancy: 0,
    risk_level: "low",
  },
  {
    id: "promotion",
    name: "Promosyon (Fiyat -%8)",
    description: "Sezonluk indirim kampanyası, doluluk artışı hedeflenir",
    adjustment_type: "percentage",
    adjustment_value: -8,
    projected_revenue: 0,
    projected_occupancy: 0,
    risk_level: "low",
  },
  {
    id: "peak_boost",
    name: "Zirve Sezon (Fiyat +%20)",
    description: "Yüksek sezonda maksimum fiyat stratejisi",
    adjustment_type: "percentage",
    adjustment_value: 20,
    projected_revenue: 0,
    projected_occupancy: 0,
    risk_level: "high",
  },
];

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await apiGuard(request, ["admin", "owner"]);
  if (!auth.allowed) return auth.response;
  const tenantId = auth.user.tenantId;

  try {
    const supabase = createAdminClient();

    // ── 1. Rooms ──────────────────────────────────────────────────────────
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, name, base_price, is_active, updated_at")
      .eq("tenant_id", tenantId);

    if (!rooms) {
      return NextResponse.json({ error: "Odalar alınamadı" }, { status: 500 });
    }

    const activeRooms = rooms.filter((r) => r.is_active);
    const totalRooms = rooms.length;

    // ── 2. Recent reservations (last 3 months) ────────────────────────────
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const start = threeMonthsAgo.toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);

    const { data: reservations } = await supabase
      .from("reservations")
      .select("id, check_in_date, check_out_date, total_amount, status, room_id, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", start);

    const confirmedRes = (reservations ?? []).filter((r) => r.status === "confirmed");

    // ── 3. Monthly revenue aggregation ────────────────────────────────────
    const monthlyMap = new Map<string, number>();
    for (const r of confirmedRes) {
      const mk = r.check_in_date.slice(0, 7);
      monthlyMap.set(mk, (monthlyMap.get(mk) ?? 0) + (r.total_amount ?? 0));
    }
    const revenueMonthly = Array.from(monthlyMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ── 4. Current / last month revenue ──────────────────────────────────
    const now = new Date();
    const thisMonthKey = now.toISOString().slice(0, 7);
    const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    const revenueThisMonth = monthlyMap.get(thisMonthKey) ?? 0;
    const revenueLastMonth = monthlyMap.get(lastMonthKey) ?? 0;
    const momChange = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) / 100
      : 0;

    // ── 5. Occupancy & ADR ───────────────────────────────────────────────
    const totalNights = confirmedRes.reduce(
      (s, r) => s + Math.round(
        (new Date(r.check_out_date).getTime() - new Date(r.check_in_date).getTime()) / 86400000
      ),
      0
    );
    const daysInRange = Math.max(1, Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    ));
    const avgOccupancy = activeRooms.length > 0
      ? Math.min(1, totalNights / (activeRooms.length * daysInRange))
      : 0;

    const totalRevenue = confirmedRes.reduce((s, r) => s + (r.total_amount ?? 0), 0);
    const avgDailyRate = totalNights > 0 ? totalRevenue / totalNights : 0;
    const revpar = avgDailyRate * avgOccupancy;

    // ── 6. Pricing suggestions per room ───────────────────────────────────
    const season = getCurrentSeason();
    const suggestions: PricingSuggestion[] = activeRooms.map((room) => {
      const roomReservations = confirmedRes.filter((r) => r.room_id === room.id);
      const roomNights = roomReservations.reduce(
        (s, r) => s + Math.round(
          (new Date(r.check_out_date).getTime() - new Date(r.check_in_date).getTime()) / 86400000
        ),
        0
      );
      const roomOccupancy = daysInRange > 0 ? roomNights / daysInRange : 0;
      const daysSinceUpdate = room.updated_at
        ? Math.round((Date.now() - new Date(room.updated_at).getTime()) / 86400000)
        : 90;

      const { suggested, confidence, reason, competitorProxy } = suggestPrice(
        room.base_price,
        roomOccupancy,
        season,
        daysSinceUpdate
      );

      return {
        room_id: room.id,
        room_name: room.name,
        current_price: room.base_price,
        suggested_price: suggested,
        confidence: Math.round(confidence * 100) / 100,
        reason,
        season,
        competitor_proxy: competitorProxy,
      };
    });

    // ── 7. Forecast ───────────────────────────────────────────────────────
    const forecast = generateForecast(revenueMonthly, activeRooms.length, avgDailyRate);

    // ── 8. Membership tier pricing data ────────────────────────────────────
    const { data: tiers } = await supabase
      .from("membership_tiers")
      .select("id, name, slug, price_monthly")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const tierPricing: TierPricing[] = (tiers ?? []).map((tier) => {
      const discountMap: Record<string, number> = {
        free: 0,
        starter: 5,
        pro: 10,
        enterprise: 15,
      };
      const discountPct = discountMap[tier.slug] ?? 0;

      return {
        tier_id: tier.id,
        tier_name: tier.name,
        tier_slug: tier.slug,
        base_discount_pct: discountPct,
        room_prices: activeRooms.map((room) => ({
          room_id: room.id,
          room_name: room.name,
          standard_price: room.base_price,
          tier_price: Math.round(room.base_price * (1 - discountPct / 100) / 50) * 50,
        })),
      };
    });

    // ── 9. Compute scenario projections ───────────────────────────────────
    const monthlyRevenue = revenueThisMonth || totalRevenue / Math.max(1, revenueMonthly.length);
    const scenarios = SCENARIOS.map((scenario) => {
      const multiplier = 1 + scenario.adjustment_value / 100;

      // Price elasticity: higher price → lower occupancy
      const elasticity = -0.4; // -0.4 means 10% price increase → 4% occupancy drop
      const occChange = 1 + elasticity * (scenario.adjustment_value / 100);
      const projectedOcc = Math.min(1, Math.max(0.2, avgOccupancy * occChange));

      const projectedRevenue = Math.round(monthlyRevenue * multiplier * occChange);

      return {
        ...scenario,
        projected_revenue: projectedRevenue,
        projected_occupancy: Math.round(projectedOcc * 1000) / 10,
      };
    });

    // ── 10. Assemble response ────────────────────────────────────────────
    const data: PricingOptimizationData = {
      current_revenue: revenueThisMonth,
      projected_revenue: scenarios.find((s) => s.id === "conservative")?.projected_revenue ?? revenueThisMonth,
      revenue_gap: (scenarios.find((s) => s.id === "optimistic")?.projected_revenue ?? revenueThisMonth) - revenueThisMonth,
      suggestions,
      scenarios,
      forecast,
      tier_pricing: tierPricing,
      summary: {
        total_rooms: totalRooms,
        active_rooms: activeRooms.length,
        avg_occupancy: Math.round(avgOccupancy * 1000) / 10,
        avg_daily_rate: Math.round(avgDailyRate),
        revpar: Math.round(revpar),
        revenue_last_month: revenueLastMonth,
        revenue_this_month: revenueThisMonth,
        month_over_month_change: momChange,
      },
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/analytics/pricing-optimization error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
