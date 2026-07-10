"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  Line,
} from "recharts";

import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Sparkles,
  Calculator,
  Users,
  Zap,
  AlertTriangle,
  MousePointerClick,
} from "lucide-react";
import { usePricingOptimization, useRevenueForecast, simulateWhatIf } from "@/hooks/use-revenue-analytics";
import type { PricingScenario, WhatIfScenario, WhatIfResult, TierPricing } from "@/lib/types/revenue";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTRY(n: number): string {
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-3 w-16 rounded bg-muted animate-pulse mb-2" />
            <div className="h-8 w-24 rounded bg-muted animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-[200px] rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  accent = "primary",
  trend,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: "primary" | "amber" | "emerald" | "violet" | "rose";
  trend?: { value: number; positive: boolean };
}) {
  const accentColors = {
    primary: "bg-teal-50 dark:bg-teal-900/20 text-teal-600",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
    violet: "bg-violet-50 dark:bg-violet-900/20 text-violet-600",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-600",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn("rounded-lg p-2 shrink-0", accentColors[accent])}>
            <Icon className="size-4" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.positive ? (
              <ArrowUpRight className="size-3 text-emerald-500" />
            ) : (
              <ArrowDownRight className="size-3 text-red-500" />
            )}
            <span className={cn("text-xs font-medium", trend.positive ? "text-emerald-600" : "text-red-600")}>
              {trend.positive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-[10px] text-muted-foreground">geçen aya göre</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; stroke?: string }[];
  label?: string;
  fmt?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.stroke ?? "var(--foreground)" }}>
          {p.name ? `${p.name}: ` : ""}
          {fmt ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Pricing Suggestion Row ──────────────────────────────────────────────────

function SuggestionRow({
  room_name,
  current_price,
  suggested_price,
  confidence,
  reason,
  season,
  competitor_proxy,
}: {
  room_name: string;
  current_price: number;
  suggested_price: number;
  confidence: number;
  reason: string;
  season: string;
  competitor_proxy: number;
}) {
  const diff = suggested_price - current_price;
  const diffPct = current_price > 0 ? ((diff / current_price) * 100) : 0;
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

  const seasonColors: Record<string, string> = {
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    mid: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    peak: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{room_name}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", seasonColors[season] ?? "")}>
            {season === "peak" ? "Zirve" : season === "high" ? "Yüksek" : season === "low" ? "Düşük" : "Normal"}
          </span>
        </div>
        <Badge variant={confidence > 0.7 ? "default" : confidence > 0.4 ? "secondary" : "outline"} className="text-[10px]">
          %{Math.round(confidence * 100)} güven
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Mevcut</p>
            <p className="text-sm font-semibold">{fmtTRY(current_price)}</p>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Önerilen</p>
            <p className="text-sm font-bold">{fmtTRY(suggested_price)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Piyasa</p>
            <p className="text-sm text-muted-foreground">{fmtTRY(competitor_proxy)}</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium shrink-0",
          isIncrease ? "text-emerald-600" : isDecrease ? "text-red-600" : "text-muted-foreground"
        )}>
          {isIncrease ? <TrendingUp className="size-3" /> : isDecrease ? <TrendingDown className="size-3" /> : null}
          {diffPct > 0 ? "+" : ""}{diffPct.toFixed(0)}%
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{reason}</p>
    </div>
  );
}

// ─── Scenario Card ───────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  onApply,
  isSelected,
}: {
  scenario: PricingScenario;
  onApply: (s: PricingScenario) => void;
  isSelected: boolean;
}) {
  const riskColors = {
    low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <button
      onClick={() => onApply(scenario)}
      className={cn(
        "w-full rounded-lg border-2 p-3 text-left transition-all text-xs",
        isSelected
          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
          : "border-border hover:border-teal-300"
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-sm font-semibold">{scenario.name}</p>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", riskColors[scenario.risk_level])}>
          {scenario.risk_level === "low" ? "Düşük Risk" : scenario.risk_level === "medium" ? "Orta Risk" : "Yüksek Risk"}
        </span>
      </div>
      <p className="text-muted-foreground mb-2">{scenario.description}</p>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground">
          {fmtTRY(scenario.projected_revenue)}
        </span>
        <span className="text-muted-foreground">
          %{scenario.projected_occupancy} doluluk
        </span>
      </div>
    </button>
  );
}

// ─── Tier Pricing Table ──────────────────────────────────────────────────────

function TierPricingTable({
  tierData,
}: {
  tierData: TierPricing[];
}) {
  if (tierData.length === 0) {
    return (
      <div className="py-6 text-center">
        <Users className="mx-auto size-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Henüz üyelik seviyesi bulunmuyor</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Oda</th>
            {tierData.map((t) => (
              <th key={t.tier_id} className="text-right py-2 px-2 font-medium text-muted-foreground">
                <div>{t.tier_name}</div>
                <div className="text-[10px] text-teal-600">-%{t.base_discount_pct}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tierData[0]?.room_prices.map((rp) => (
            <tr key={rp.room_id} className="border-b border-border/50">
              <td className="py-2 pr-3 font-medium">{rp.room_name}</td>
              {tierData.map((t) => {
                const tierRoom = t.room_prices.find((p) => p.room_id === rp.room_id);
                return (
                  <td key={t.tier_id} className="text-right py-2 px-2">
                    <span className="font-semibold">{fmtTRY(tierRoom?.tier_price ?? 0)}</span>
                    <span className="text-muted-foreground ml-1">
                      / {fmtTRY(rp.standard_price)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── What-If Tool ────────────────────────────────────────────────────────────

const WHAT_IF_PRESETS: WhatIfScenario[] = [
  { name: "%10 Fiyat Artışı", adjustment_type: "percentage", adjustment_value: 10, target_rooms: "all", season_boost: 0, risk_level: "medium" },
  { name: "%5 Fiyat İndirimi", adjustment_type: "percentage", adjustment_value: -5, target_rooms: "all", season_boost: 0, risk_level: "low" },
  { name: "%15 Artış + Sezon", adjustment_type: "percentage", adjustment_value: 15, target_rooms: "all", season_boost: 20, risk_level: "high" },
  { name: "%20 İndirim Kampanyası", adjustment_type: "percentage", adjustment_value: -20, target_rooms: "all", season_boost: 30, risk_level: "high" },
];

function WhatIfTool({
  baseData,
  onResult,
}: {
  baseData: NonNullable<ReturnType<typeof usePricingOptimization>["data"]>;
  onResult: (r: WhatIfResult, s: WhatIfScenario) => void;
}) {
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);
  const [customAdjustment, setCustomAdjustment] = React.useState(0);
  const [customBoost, setCustomBoost] = React.useState(0);
  const [result, setResult] = React.useState<WhatIfResult | null>(null);

  const runSimulation = React.useCallback(
    (scenario: WhatIfScenario) => {
      const r = simulateWhatIf(baseData, scenario);
      setResult(r);
      onResult(r, scenario);
    },
    [baseData, onResult]
  );

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="grid grid-cols-2 gap-2">
        {WHAT_IF_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              setSelectedPreset(preset.name);
              runSimulation(preset);
            }}
            className={cn(
              "rounded-lg border-2 p-2.5 text-xs text-left transition-all",
              selectedPreset === preset.name
                ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                : "border-border hover:border-teal-300"
            )}
          >
            <p className="font-semibold text-sm">{preset.name}</p>
            <p className="text-muted-foreground mt-0.5">
              {preset.season_boost > 0 ? `Sezon +%${preset.season_boost}` : "Standart"}
            </p>
          </button>
        ))}
      </div>

      {/* Custom */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground">Fiyat Ayarlaması (%)</label>
          <input
            type="range"
            min={-30}
            max={30}
            value={customAdjustment}
            onChange={(e) => setCustomAdjustment(Number(e.target.value))}
            className="w-full accent-teal-600"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>-%{Math.abs(Math.min(0, customAdjustment))}</span>
            <span className={cn("font-semibold", customAdjustment >= 0 ? "text-emerald-600" : "text-red-600")}>
              {customAdjustment > 0 ? "+" : ""}%{customAdjustment}
            </span>
            <span>+%30</span>
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground">Sezon Etkisi (%)</label>
          <input
            type="range"
            min={0}
            max={50}
            value={customBoost}
            onChange={(e) => setCustomBoost(Number(e.target.value))}
            className="w-full accent-teal-600"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span className="font-semibold">+%{customBoost}</span>
            <span>+%50</span>
          </div>
        </div>
      </div>

      <Button
        size="sm"
        className="w-full gap-1.5"
        onClick={() =>
          runSimulation({
            name: `Özel (%${customAdjustment}, Sezon +%${customBoost})`,
            adjustment_type: "percentage",
            adjustment_value: customAdjustment,
            target_rooms: "all",
            season_boost: customBoost,
          })
        }
      >
        <Calculator className="size-3.5" />
        Simülasyonu Çalıştır
      </Button>

      {/* Result */}
      {result && (
        <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10 p-3 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-teal-600" />
            Simülasyon Sonucu
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">Aylık Gelir</p>
              <p className="font-bold text-teal-700 dark:text-teal-300">{fmtTRY(result.projected_monthly_revenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Değişim</p>
              <p className={cn("font-bold", result.revenue_change >= 0 ? "text-emerald-600" : "text-red-600")}>
                {fmtPct(result.revenue_change)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Güven Aralığı</p>
              <p className="font-bold text-xs">
                {fmtTRY(result.confidence_interval[0])} – {fmtTRY(result.confidence_interval[1])}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="text-center rounded bg-muted/50 p-1.5">
              <p className="text-muted-foreground">Doluluk</p>
              <p className="font-semibold">%{result.projected_occupancy}</p>
            </div>
            <div className="text-center rounded bg-muted/50 p-1.5">
              <p className="text-muted-foreground">RevPAR</p>
              <p className="font-semibold">{fmtTRY(result.projected_revpar)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Revenue Page ────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const pathname = usePathname();
  const { data, isLoading, isFetching, refetch } = usePricingOptimization();
  const [forecastScenario, setForecastScenario] = React.useState<"base" | "optimistic" | "conservative">("base");
  const forecastHook = useRevenueForecast(90, forecastScenario);

  const showSkeleton = isLoading && !data;

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="size-5 text-teal-600" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Gelir Yönetimi</h2>
              <p className="text-xs text-muted-foreground">
                Fiyat optimizasyonu ve gelir tahminleri
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => refetch()} disabled={isFetching} title="Yenile">
            {isFetching ? (
              <Loader2 className="size-3.5 text-muted-foreground animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Tab navigation */}
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 border-b border-border min-w-fit">
            <Link
              href="/analytics"
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                pathname === "/analytics"
                  ? "border-teal-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="size-3.5 inline mr-1.5 -mt-0.5" />
              Genel
            </Link>
            <Link
              href="/analytics/conversion"
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                pathname === "/analytics/conversion"
                  ? "border-teal-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MousePointerClick className="size-3.5 inline mr-1.5 -mt-0.5" />
              Dönüşüm
            </Link>
            <Link
              href="/analytics/revenue"
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                pathname === "/analytics/revenue"
                  ? "border-teal-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Banknote className="size-3.5 inline mr-1.5 -mt-0.5" />
              Gelir
            </Link>
          </div>
        </div>

        {showSkeleton ? (
          <>
            <SummarySkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : data ? (
          <>
            {/* ── §1: Summary Metrics ──────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Cari Ay Gelir"
                value={fmtTRY(data.summary.revenue_this_month)}
                icon={Banknote}
                accent="emerald"
                trend={{
                  value: Math.abs(Math.round(data.summary.month_over_month_change * 100)),
                  positive: data.summary.month_over_month_change >= 0,
                }}
              />
              <MetricCard
                title="Projeksiyon"
                value={fmtTRY(data.projected_revenue)}
                sub="Temkinli senaryo"
                icon={TrendingUp}
                accent="primary"
              />
              <MetricCard
                title="Gelir Boşluğu"
                value={fmtTRY(data.revenue_gap)}
                sub="İyimser senaryoya göre"
                icon={data.revenue_gap > 0 ? ArrowUpRight : ArrowDownRight}
                accent={data.revenue_gap > 0 ? "amber" : "rose"}
              />
              <MetricCard
                title="RevPAR"
                value={fmtTRY(data.summary.revpar)}
                sub={`%${data.summary.avg_occupancy} doluluk`}
                icon={BarChart3}
                accent="violet"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Oda</p>
                <p className="text-sm font-bold">{data.summary.active_rooms}/{data.summary.total_rooms}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Ort. Günlük Fiyat</p>
                <p className="text-sm font-bold">{fmtTRY(data.summary.avg_daily_rate)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Doluluk</p>
                <p className="text-sm font-bold">%{data.summary.avg_occupancy}</p>
              </div>
            </div>

            <Separator />

            {/* ── §2: Pricing Suggestions ──────────────────────────────── */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="size-4 text-amber-500" />
                  Fiyat Önerileri
                  <span className="text-xs text-muted-foreground font-normal">
                    ({data.suggestions.length} oda)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Henüz fiyat önerisi oluşturulamadı
                  </p>
                ) : (
                  data.suggestions.map((s) => <SuggestionRow key={s.room_id} {...s} />)
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* ── §3: Revenue Forecast ──────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="size-4 text-violet-500" />
                    Gelir Tahmini (90 Gün)
                  </CardTitle>
                  {/* Scenario toggle */}
                  <div className="flex gap-1">
                    {(["base", "conservative", "optimistic"] as const).map((sc) => (
                      <button
                        key={sc}
                        onClick={() => setForecastScenario(sc)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all",
                          forecastScenario === sc
                            ? "bg-teal-600 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {sc === "base" ? "Temel" : sc === "conservative" ? "Temkinli" : "İyimser"}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {forecastHook.isLoading ? (
                  <div className="h-[220px] rounded bg-muted animate-pulse" />
                ) : forecastHook.data?.weekly && forecastHook.data.weekly.length > 0 ? (
                  <>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={forecastHook.data.weekly}
                          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                        >
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis
                            dataKey="week_start"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                            tickFormatter={(v: string) => {
                              const d = new Date(v);
                              return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
                            }}
                          />
                          <YAxis hide domain={[0, "auto"]} />
                          <Tooltip content={<ChartTooltip fmt={fmtTRY} />} />
                          <Area
                            type="monotone"
                            dataKey="upper_bound"
                            stroke="transparent"
                            fill="#14b8a6"
                            fillOpacity={0.08}
                          />
                          <Area
                            type="monotone"
                            dataKey="lower_bound"
                            stroke="transparent"
                            fill="#14b8a6"
                            fillOpacity={0.08}
                          />
                          <Line
                            type="monotone"
                            dataKey="predicted_revenue"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: "#14b8a6" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {forecastHook.data.meta.scenario_label} — Aylık baz: {fmtTRY(forecastHook.data.meta.base_monthly_revenue)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Tahmin verisi henüz mevcut değil
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* ── §4: Pricing Scenarios ──────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PiggyBank className="size-4 text-emerald-500" />
                  Fiyatlandırma Senaryoları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.scenarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Henüz senaryo verisi yok
                  </p>
                ) : (
                  data.scenarios.map((scenario) => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      onApply={() => {}}
                      isSelected={false}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* ── §5: What-If Simulator ────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="size-4 text-violet-500" />
                  Ne Olurdu Simülasyonu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WhatIfTool baseData={data} onResult={() => null} />
              </CardContent>
            </Card>

            <Separator />

            {/* ── §6: Tier-Based Pricing ────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-primary" />
                  Üyelik Seviyesine Göre Fiyatlar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.tier_pricing.length === 0 ? (
                  <div className="py-6 text-center">
                    <Users className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Üyelik seviyesi bulunamadı. Önce üyelik seviyelerini oluşturun.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      Her üyelik seviyesine özel indirimli fiyatlar. Standart fiyatın yanında gösterilir.
                    </p>
                    <TierPricingTable tierData={data.tier_pricing} />
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* ── Error state ───────────────────────────────────── */
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="mx-auto size-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Gelir verileri yüklenemedi
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                Tekrar Dene
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileShell>
  );
}
