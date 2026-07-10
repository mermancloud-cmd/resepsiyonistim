"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  Area,
  AreaChart,
} from "recharts";

import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useConversionAnalytics } from "@/hooks/use-conversion-analytics";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  MousePointerClick,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Activity,
  Banknote,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Skeleton ────────────────────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="h-3 w-16 rounded bg-muted animate-pulse mb-2" />
            <div className="h-7 w-20 rounded bg-muted animate-pulse" />
            <div className="h-2.5 w-24 rounded bg-muted animate-pulse mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="rounded-lg bg-muted/30 animate-pulse"
      style={{ height }}
    />
  );
}

// ─── Conversion Funnel ──────────────────────────────────────────────────────

function ConversionFunnelChart({
  data,
}: {
  data: { stage: string; count: number; rate: number }[];
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center">
        <Target className="mx-auto size-10 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">
          Henüz dönüşüm verisi yok
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Ziyaretçiler landing page'inizi ziyaret ettikçe veriler görünecek
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {data.map((stage, i) => {
        const isActive = activeIndex === i;
        const prevCount = i > 0 ? data[i - 1].count : stage.count;
        const dropRate =
          i > 0 && prevCount > 0
            ? Math.round(((prevCount - stage.count) / prevCount) * 100)
            : 0;

        return (
          <button
            key={stage.stage}
            onClick={() =>
              setActiveIndex(activeIndex === i ? null : i)
            }
            className={cn(
              "w-full text-left transition-all duration-200 rounded-lg p-3",
              isActive
                ? "bg-muted/50 ring-1 ring-border"
                : "hover:bg-muted/30"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    i === 0 && "bg-teal-500",
                    i === 1 && "bg-teal-400",
                    i === 2 && "bg-amber-400",
                    i === 3 && "bg-amber-500",
                    i >= 4 && "bg-emerald-500"
                  )}
                />
                <span className="text-sm font-medium truncate">
                  {stage.stage}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {stage.count}
                </Badge>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                %{stage.rate.toFixed(1)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  i === 0 && "bg-teal-500",
                  i === 1 && "bg-teal-400",
                  i === 2 && "bg-amber-400",
                  i === 3 && "bg-amber-500",
                  i >= 4 && "bg-emerald-500"
                )}
                style={{
                  width: `${Math.max(stage.rate, 2)}%`,
                }}
              />
            </div>

            {/* Expanded details */}
            {isActive && dropRate > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingDown className="size-3 text-red-400" />
                <span>
                  {stage.stage} aşamasında %{dropRate} düşüş
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── CRO Element Stats ───────────────────────────────────────────────────────

function CROElementChart({
  data,
}: {
  data: { element_type: string; event_type: string; total_views: number; unique_visitors: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="py-6 text-center">
        <Activity className="mx-auto size-8 text-muted-foreground/30 mb-1" />
        <p className="text-xs text-muted-foreground">
          CRO etkileşim verisi henüz yok
        </p>
      </div>
    );
  }

  const chartData = data.slice(0, 8).map((d) => ({
    name:
      d.element_type.length > 20
        ? d.element_type.slice(0, 20) + "..."
        : d.element_type,
    views: d.total_views,
    unique: d.unique_visitors,
  }));

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" fontSize={11} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            fontSize={10}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          />
          <Bar dataKey="views" fill="#14b8a6" radius={[0, 4, 4, 0]} />
          <Bar dataKey="unique" fill="#2dd4bf" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Daily Visitor Trend ─────────────────────────────────────────────────────

function DailyTrendChart({
  data,
}: {
  data: { date: string; page_views: number; unique_visitors: number; cta_clicks: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="py-6 text-center">
        <BarChart3 className="mx-auto size-8 text-muted-foreground/30 mb-1" />
        <p className="text-xs text-muted-foreground">
          Günlük ziyaretçi verisi henüz yok
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    }),
    views: d.page_views,
    visitors: d.unique_visitors,
    clicks: d.cta_clicks,
  }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
        >
          <defs>
            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" fontSize={10} tickLine={false} />
          <YAxis fontSize={10} tickLine={false} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#14b8a6"
            fill="url(#viewsGrad)"
            strokeWidth={2}
            name="Sayfa Görüntüleme"
          />
          <Area
            type="monotone"
            dataKey="visitors"
            stroke="#2dd4bf"
            fill="url(#visitorsGrad)"
            strokeWidth={2}
            name="Tekil Ziyaretçi"
          />
          <Line
            type="monotone"
            dataKey="clicks"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="CTA Tıklama"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ConversionAnalyticsPage() {
  const pathname = usePathname();
  const { data, isLoading, isError, refetch, isRefetching } =
    useConversionAnalytics();

  const funnel = data?.funnel ?? [];
  const croStats = data?.cro_stats ?? [];
  const dailyStats = data?.daily_stats ?? [];
  const summary = data?.summary;

  return (
    <MobileShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Dönüşüm Analitiği</h1>
            <p className="text-xs text-muted-foreground">
              Landing page dönüşüm performansı • Son 30 gün
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            aria-label="Yenile"
          >
            <RefreshCw
              className={cn("size-4", isRefetching && "animate-spin")}
            />
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

        {/* KPI Cards */}
        {isLoading ? (
          <KPISkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Toplam Ziyaretçi
                </p>
                <p className="text-xl font-bold">
                  {summary?.total_visitors_30d ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Son 30 gün
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Sayfa Görüntüleme
                </p>
                <p className="text-xl font-bold">
                  {summary?.total_page_views_30d ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Toplam
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Dönüşüm Oranı
                </p>
                <p className="text-xl font-bold">
                  %{summary?.conversion_rate ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Ziyaretçi → Kayıt
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Deneme Aktivasyon
                </p>
                <p className="text-xl font-bold">
                  %{summary?.trial_activation_rate ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Kayıt → Deneme
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CTA Click Rate */}
        {!isLoading && summary && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    CTA Tıklama Oranı
                  </p>
                  <p className="text-lg font-bold">
                    %{summary.cta_click_rate}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2">
                  <MousePointerClick className="size-5 text-amber-600" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {summary.social_proof_views} sosyal kanıt görüntüleme
              </p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-teal-600" />
              Dönüşüm Hunisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={280} />
            ) : (
              <ConversionFunnelChart data={funnel} />
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-emerald-600" />
              Günlük Ziyaretçi Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={240} />
            ) : (
              <DailyTrendChart data={dailyStats} />
            )}
          </CardContent>
        </Card>

        {/* CRO Element Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-violet-600" />
              CRO Element Etkileşimleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={220} />
            ) : (
              <CROElementChart data={croStats} />
            )}
          </CardContent>
        </Card>

        {/* Source Breakdown Section (future: UTM params) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="size-4 text-primary" />
              Trafik Kaynakları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground py-4 text-center">
              Henüz yeterli veri yok. Landing page'inize trafik almaya
              başladıkça kaynak bazlı dönüşüm verileri görünecek.
            </p>
          </CardContent>
        </Card>

        {isError && (
          <p className="text-xs text-center text-muted-foreground">
            Veri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
          </p>
        )}
      </div>
    </MobileShell>
  );
}
