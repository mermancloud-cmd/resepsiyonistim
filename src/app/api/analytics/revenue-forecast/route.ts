import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiGuard } from "@/lib/rbac/api-guard";
import type { RevenueForecastPoint } from "@/lib/types/revenue";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/revenue-forecast
 *
 * Returns revenue forecast based on N3 model (moving average + seasonality).
 * Query params:
 *   - days: number (default 90) — forecast horizon
 *   - scenario: string — "base" | "optimistic" | "conservative"
 */
export async function GET(request: NextRequest) {
  const auth = await apiGuard(request, ["admin", "owner"]);
  if (!auth.allowed) return auth.response;
  const tenantId = auth.user.tenantId;

  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days")) || 90));
    const scenario = searchParams.get("scenario") as "base" | "optimistic" | "conservative" | null;

    // ── 1. Get last 6 months of revenue data ──────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const start = sixMonthsAgo.toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);

    const { data: reservations } = await supabase
      .from("reservations")
      .select("check_in_date, total_amount, status")
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed")
      .gte("check_in_date", start)
      .lte("check_in_date", end);

    const { count: activeRooms } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    const roomCount = activeRooms ?? 1;

    // ── 2. Monthly aggregation ────────────────────────────────────────────
    const monthlyMap = new Map<string, number>();
    for (const r of reservations ?? []) {
      const mk = r.check_in_date.slice(0, 7);
      monthlyMap.set(mk, (monthlyMap.get(mk) ?? 0) + (r.total_amount ?? 0));
    }

    const recentRevenues = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-3)
      .map(([, v]) => v);

    const baseMonthlyRevenue = recentRevenues.length > 0
      ? recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length
      : 50000;

    // ── 3. Scenario multiplier ────────────────────────────────────────────
    let scenarioLabel = "Temel Tahmin";
    let scenarioMultiplier = 1.0;

    if (scenario === "optimistic") {
      scenarioLabel = "İyimser Tahmin";
      scenarioMultiplier = 1.15;
    } else if (scenario === "conservative") {
      scenarioLabel = "Temkinli Tahmin";
      scenarioMultiplier = 0.92;
    }

    // ── 4. Seasonal factors (Aydın/Turkey tourism pattern) ───────────────
    const seasonalFactors: Record<number, number> = {
      0: 0.65, 1: 0.60, 2: 0.75, 3: 0.85, 4: 0.95,
      5: 1.15, 6: 1.40, 7: 1.35, 8: 1.10, 9: 0.95,
      10: 0.80, 11: 0.70,
    };

    // ── 5. Generate forecast points ──────────────────────────────────────
    const now = new Date();
    const forecast: RevenueForecastPoint[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const month = d.getMonth();
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek >= 5;

      const seasonalFactor = seasonalFactors[month] ?? 1.0;
      const weekendBoost = isWeekend ? 1.12 : 1.0;
      const dailyBase = baseMonthlyRevenue / 30 * scenarioMultiplier;

      const predicted = dailyBase * seasonalFactor * weekendBoost;
      const spread = scenario === "optimistic" ? 0.15 : scenario === "conservative" ? 0.10 : 0.12;

      forecast.push({
        date: d.toISOString().slice(0, 10),
        predicted_revenue: Math.round(predicted),
        lower_bound: Math.round(predicted * (1 - spread)),
        upper_bound: Math.round(predicted * (1 + spread)),
        predicted_occupancy:
          Math.round(Math.min(1, Math.max(0.2, seasonalFactor * 0.75)) * 1000) / 10,
      });
    }

    // ── 6. Aggregate to weekly for charting ──────────────────────────────
    const weeklyMap = new Map<string, { revenue: number; lb: number; ub: number; occ: number; days: number }>();
    for (const p of forecast) {
      const d = new Date(p.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);

      const existing = weeklyMap.get(key) ?? { revenue: 0, lb: 0, ub: 0, occ: 0, days: 0 };
      existing.revenue += p.predicted_revenue;
      existing.lb += p.lower_bound;
      existing.ub += p.upper_bound;
      existing.occ += p.predicted_occupancy;
      existing.days += 1;
      weeklyMap.set(key, existing);
    }

    const weekly = Array.from(weeklyMap.entries())
      .map(([weekStart, v]) => ({
        week_start: weekStart,
        predicted_revenue: v.revenue,
        lower_bound: v.lb,
        upper_bound: v.ub,
        predicted_occupancy: Math.round((v.occ / v.days) * 10) / 10,
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));

    return NextResponse.json({
      forecast,
      weekly,
      meta: {
        horizon_days: days,
        scenario: scenario ?? "base",
        scenario_label: scenarioLabel,
        base_monthly_revenue: Math.round(baseMonthlyRevenue),
        active_rooms: roomCount,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/analytics/revenue-forecast error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
