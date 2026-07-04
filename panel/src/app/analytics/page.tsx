"use client";
import * as React from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Clock,
  Star,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  MessageSquare,
  Target,
  RefreshCw,
  Quote,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSatisfactionAnalytics } from "@/hooks/use-satisfaction-analytics";
import type { RecentFeedbackItem, AnalyticsData } from "@/lib/mock-data";

// ─── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accent = "primary",
  isLoading = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  accent?: "primary" | "amber" | "emerald" | "violet";
  isLoading?: boolean;
}) {
  const accentColors = {
    primary: "bg-teal-50 dark:bg-teal-900/20 text-teal-600",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
    violet: "bg-violet-50 dark:bg-violet-900/20 text-violet-600",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{title}</p>
              <div className="h-8 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className={cn("rounded-lg p-2", accentColors[accent])}>
              <Icon className="size-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn("rounded-lg p-2", accentColors[accent])}>
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
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-emerald-600" : "text-red-600"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              geçen haftaya göre
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────

function MiniBarChart({
  data,
  labelKey,
  valueKey,
  maxBars = 12,
  color = "bg-teal-500",
}: {
  data: { [key: string]: string | number }[];
  labelKey: string;
  valueKey: string;
  maxBars?: number;
  color?: string;
}) {
  const sliced = data.slice(-maxBars);
  const max = Math.max(...sliced.map((d) => Number(d[valueKey])));

  return (
    <div className="flex items-end gap-1 h-16">
      {sliced.map((d, i) => {
        const height = max > 0 ? (Number(d[valueKey]) / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={cn("w-full rounded-sm transition-all", color)}
              style={{ height: `${Math.max(height, 4)}%` }}
            />
            <span className="text-[8px] text-muted-foreground leading-none">
              {String(d[labelKey]).slice(0, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Satisfaction Distribution ─────────────────────────────────────────────────

function SatisfactionDistribution({
  distribution,
}: {
  distribution: { stars: number; count: number }[];
}) {
  const total = distribution.reduce((s, d) => s + d.count, 0);

  return (
    <div className="flex flex-col gap-1.5">
      {distribution.map((d) => {
        const pct = total > 0 ? (d.count / total) * 100 : 0;
        return (
          <div key={d.stars} className="flex items-center gap-2 text-xs">
            <span className="w-6 text-right text-muted-foreground shrink-0">
              {d.stars}★
            </span>
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-10 text-right text-muted-foreground shrink-0">
              {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Conversion Funnel ─────────────────────────────────────────────────────────

function ConversionFunnel({
  funnel,
}: {
  funnel: { stage: string; count: number; rate: number }[];
}) {
  const maxCount = funnel[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-2">
      {funnel.map((step, i) => {
        const widthPct = (step.count / maxCount) * 100;
        const isLast = i === funnel.length - 1;

        return (
          <div key={i} className="relative">
            <div className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-right">
                <p className="text-[11px] font-medium truncate">{step.stage}</p>
              </div>
              <div className="flex-1">
                <div className="h-6 rounded bg-muted overflow-hidden relative">
                  <div
                    className={cn(
                      "h-full rounded transition-all flex items-center px-2",
                      isLast
                        ? "bg-emerald-500 dark:bg-emerald-600"
                        : "bg-teal-500/70 dark:bg-teal-600/70"
                    )}
                    style={{ width: `${Math.max(widthPct, 8)}%` }}
                  >
                    <span className="text-[10px] font-medium text-white whitespace-nowrap">
                      {step.count} ({step.rate}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recent Feedback Card ──────────────────────────────────────────────────────

function RecentFeedbackList({
  feedback,
}: {
  feedback: RecentFeedbackItem[];
}) {
  if (feedback.length === 0) {
    return (
      <div className="py-6 text-center">
        <Quote className="mx-auto size-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          Henüz misafir geri bildirimi yok
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Memnuniyet anketleri dolduruldukça burada görünecek
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {feedback.map((item) => (
        <div
          key={item.id}
          className="flex gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
        >
          {/* Rating badge */}
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
              item.rating >= 4
                ? "bg-emerald-500"
                : item.rating === 3
                  ? "bg-amber-500"
                  : "bg-red-500"
            )}
          >
            {item.rating}
          </div>

          <div className="flex-1 min-w-0">
            {/* Guest info */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-foreground truncate">
                {item.guest_name || "Misafir"}
              </span>
              {item.guest_phone && (
                <span className="text-[10px] text-muted-foreground">
                  {item.guest_phone}
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                {formatRelativeTime(item.created_at)}
              </span>
            </div>

            {/* Feedback text */}
            {item.feedback_text && (
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">
                {item.feedback_text}
              </p>
            )}

            {/* Category tags */}
            {item.category_tags && item.category_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {item.category_tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "şimdi";
  if (diffMin < 60) return `${diffMin}dk önce`;
  if (diffHour < 24) return `${diffHour}sa önce`;
  if (diffDay < 7) return `${diffDay}g önce`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data, isLoading, isFetching, refetch } = useSatisfactionAnalytics();

  if (!isMounted) return null;

  // Type assertion for the hook data
  const analyticsData = data as (AnalyticsData & { recentFeedback?: RecentFeedbackItem[] }) | undefined;
  const showSkeleton = isLoading && !analyticsData;

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Analitik</h2>
              <p className="text-xs text-muted-foreground">
                Misafir memnuniyeti ve performans metrikleri
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Yenile"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 text-muted-foreground animate-spin" />
            ) : (
              <RefreshCw
                className={`size-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
              />
            )}
          </Button>
        </div>

        {/* Top metrics — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            title="Ort. Yanıt Süresi"
            value={
              showSkeleton
                ? "—"
                : `${analyticsData?.responseTime.avg_seconds ?? 0}s`
            }
            subtitle={
              showSkeleton
                ? undefined
                : `P50: ${analyticsData?.responseTime.p50_seconds ?? 0}s · P95: ${analyticsData?.responseTime.p95_seconds ?? 0}s`
            }
            icon={Clock}
            accent="primary"
            isLoading={showSkeleton}
          />
          <MetricCard
            title="Memnuniyet Skoru"
            value={
              showSkeleton
                ? "—"
                : `${analyticsData?.satisfaction.avg_score ?? 0}`
            }
            subtitle={
              showSkeleton
                ? undefined
                : `${analyticsData?.satisfaction.total_responses ?? 0} yanıt`
            }
            icon={Star}
            accent="amber"
            isLoading={showSkeleton}
          />
          <MetricCard
            title="Dönüşüm Oranı"
            value={
              showSkeleton ? "—" : `${analyticsData?.conversion.rate ?? 0}%`
            }
            subtitle={
              showSkeleton
                ? undefined
                : `${analyticsData?.conversion.converted ?? 0}/${analyticsData?.conversion.total_conversations ?? 0}`
            }
            icon={TrendingUp}
            accent="emerald"
            isLoading={showSkeleton}
          />
          <MetricCard
            title="Toplam Konuşma"
            value={
              showSkeleton
                ? "—"
                : (analyticsData?.conversion.total_conversations ?? 0).toString()
            }
            subtitle="Son 30 gün"
            icon={MessageSquare}
            accent="violet"
            isLoading={showSkeleton}
          />
        </div>

        <Separator />

        {/* Response Time Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4 text-primary" />
              Yanıt Süresi (24 Saat)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData?.responseTime.trend &&
            analyticsData.responseTime.trend.length > 0 ? (
              <>
                <MiniBarChart
                  data={analyticsData.responseTime.trend}
                  labelKey="hour"
                  valueKey="seconds"
                  maxBars={12}
                  color="bg-teal-500 dark:bg-teal-400"
                />
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>
                    En hızlı: {analyticsData.responseTime.p50_seconds}s
                  </span>
                  <span>
                    En yavaş: {analyticsData.responseTime.p95_seconds}s
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Bugün henüz yanıt süresi verisi yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Satisfaction Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-4 text-amber-500" />
              Memnuniyet Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsData?.satisfaction.total_responses ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">
                      {analyticsData.satisfaction.avg_score}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/ 5.0</p>
                  </div>
                  <div className="flex-1">
                    <SatisfactionDistribution
                      distribution={analyticsData.satisfaction.distribution}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Haftalık Trend
                  </p>
                  <MiniBarChart
                    data={analyticsData.satisfaction.trend}
                    labelKey="week"
                    valueKey="score"
                    color="bg-amber-500 dark:bg-amber-400"
                  />
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <Star className="mx-auto size-8 text-amber-200 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Henüz memnuniyet anketi yanıtı yok
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Misafirler anket doldurdukça veriler burada görünecek
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Feedback Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Quote className="size-4 text-primary" />
              Son Misafir Geri Bildirimleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentFeedbackList
              feedback={analyticsData?.recentFeedback ?? []}
            />
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-emerald-600" />
              Dönüşüm Hunisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData?.conversion.funnel &&
            analyticsData.conversion.funnel.length > 0 ? (
              <ConversionFunnel funnel={analyticsData.conversion.funnel} />
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Son 30 gün için dönüşüm verisi yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Conversion Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Dönüşüm Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData?.conversion.trend &&
            analyticsData.conversion.trend.length > 0 ? (
              <>
                <MiniBarChart
                  data={analyticsData.conversion.trend}
                  labelKey="week"
                  valueKey="rate"
                  color="bg-emerald-500 dark:bg-emerald-400"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Son 4 hafta
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Dönüşüm trend verisi henüz mevcut değil
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileShell>
  );
}
