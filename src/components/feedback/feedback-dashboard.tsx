"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useFeedbackSummary,
  useFeedbackTrend,
  useFeedbackList,
  useFeedbackWithHumanization,
  mockFeedbackSummary,
  mockFeedbackTrend,
  getCategoryLabel,
  FEEDBACK_CATEGORIES,
} from "@/hooks/use-feedback";
import type { FeedbackCategory } from "@/lib/types";
import {
  Star,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Filter,
  Download,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Quote,
  ArrowUp,
  ArrowDown,
  Link2,
} from "lucide-react";

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xl font-bold tracking-tight">{value}</span>
            {subtext && (
              <span className="text-[10px] text-muted-foreground">{subtext}</span>
            )}
          </div>
          <div
            className={cn(
              "rounded-lg p-2",
              trend === "up"
                ? "bg-green-500/10"
                : trend === "down"
                  ? "bg-red-500/10"
                  : "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "size-4",
                trend === "up"
                  ? "text-green-500"
                  : trend === "down"
                    ? "text-red-500"
                    : "text-primary"
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Rating Bar ──────────────────────────────────────────────────────────────

function RatingBar({
  rating,
  count,
  maxCount,
}: {
  rating: number;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const labels = ["", "Çok Kötü", "Kötü", "Orta", "İyi", "Harika"];
  const colors = [
    "",
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-lime-500",
    "bg-green-500",
  ];

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex w-20 items-center gap-1 shrink-0">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              "size-2.5",
              i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
            )}
          />
        ))}
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colors[rating])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right font-medium">{count}</span>
    </div>
  );
}

// ─── Mini Trend Chart ────────────────────────────────────────────────────────

function MiniTrendChart({
  data,
  height = 32,
}: {
  data: { avg_rating: number }[];
  height?: number;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.avg_rating), 0.1);
  const min = Math.min(...data.map((d) => d.avg_rating), 0);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => {
        const pct = ((d.avg_rating - min) / range) * 100;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-primary/40 transition-all"
            style={{ height: `${Math.max(pct, 5)}%` }}
            title={`Hafta ${i + 1}: ${d.avg_rating}`}
          />
        );
      })}
    </div>
  );
}

// ─── Category Breakdown ──────────────────────────────────────────────────────

function CategoryBreakdown({
  data,
}: {
  data: { category: string; count: number; avg_rating: number }[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.category} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-muted-foreground">
            {getCategoryLabel(d.category)}
          </span>
          <div className="flex-1">
            <ProgressBar
              value={d.count}
              max={maxCount}
              color={
                d.avg_rating >= 4
                  ? "bg-green-500"
                  : d.avg_rating >= 3
                    ? "bg-amber-400"
                    : "bg-red-400"
              }
            />
          </div>
          <span className="w-8 text-right font-medium">{d.count}</span>
          <div className="flex w-10 items-center gap-0.5">
            <Star className="size-2.5 fill-amber-400 text-amber-400" />
            <span>{d.avg_rating}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Comment Card ────────────────────────────────────────────────────────────

function CommentCard({
  comment,
  rating,
  category,
  submittedAt,
  hasHumanization,
}: {
  comment: string;
  rating: number;
  category: string;
  submittedAt: string;
  hasHumanization?: boolean;
}) {
  const timeAgo = getTimeAgo(submittedAt);
  return (
    <div className="rounded-lg border border-border/50 p-3 transition-colors hover:border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-2.5",
                  i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                )}
              />
            ))}
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 h-4">
            {getCategoryLabel(category)}
          </Badge>
          {hasHumanization && (
            <Link2 className="size-2.5 text-blue-400" />
          )}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">&ldquo;{comment}&rdquo;</p>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} g önce`;
}

// ─── Period Selector ────────────────────────────────────────────────────────

function PeriodSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (d: number) => void;
}) {
  const periods = [
    { label: "7 Gün", value: 7 },
    { label: "30 Gün", value: 30 },
    { label: "90 Gün", value: 90 },
  ];

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-0.5" role="tablist">
      {periods.map((p) => (
        <button
          key={p.value}
          type="button"
          role="tab"
          aria-selected={value === p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === p.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Category Filter ─────────────────────────────────────────────────────────

function CategoryFilter({
  value,
  onChange,
}: {
  value: FeedbackCategory | "all";
  onChange: (v: FeedbackCategory | "all") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all",
          value === "all"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border/60 text-muted-foreground hover:border-border"
        )}
      >
        Tümü
      </button>
      {FEEDBACK_CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => onChange(cat.value)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all",
            value === cat.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:border-border"
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// ─── Dashboard Content (Data loading handled here) ──────────────────────────

function DashboardContent() {
  const [period, setPeriod] = React.useState(30);
  const [categoryFilter, setCategoryFilter] = React.useState<FeedbackCategory | "all">("all");

  const { data: summaryData, isLoading: summaryLoading } = useFeedbackSummary(period);
  const { data: trendData } = useFeedbackTrend(period);
  const { data: feedbackList } = useFeedbackList(
    categoryFilter !== "all" ? { category: categoryFilter } : undefined
  );
  const { data: humanizationData } = useFeedbackWithHumanization();

  const summary = summaryData ?? mockFeedbackSummary;
  const trend = trendData ?? mockFeedbackTrend;

  // Comment IDs that have humanization scores
  const humanizationCommentIds = new Set(
    (humanizationData ?? []).map((h) => h.feedback_id)
  );

  const recentComments = summary.recent_comments ?? [];
  const distribution = summary.rating_distribution ?? [];
  const maxDistCount = Math.max(...distribution.map((d) => d.count), 1);
  const highRatingPct =
    summary.total_count > 0
      ? Math.round(
          ((distribution.filter((d) => d.rating >= 4).reduce((s, d) => s + d.count, 0)) /
            summary.total_count) *
            100
        )
      : 0;

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Müşteri Geri Bildirimi</h2>
            <p className="text-xs text-muted-foreground">
              AI konuşma kalitesi değerlendirmeleri
            </p>
          </div>
        </div>
      </div>

      {/* Period selector */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={ThumbsUp}
          label="Ortalama Puan"
          value={summary.avg_rating}
          subtext={`${summary.total_count} değerlendirme`}
          trend={summary.avg_rating >= 4 ? "up" : summary.avg_rating >= 3 ? "neutral" : "down"}
        />
        <StatCard
          icon={BarChart3}
          label="Olumlu Oran"
          value={`%${highRatingPct}`}
          subtext="4-5 yıldız yüzdesi"
          trend={highRatingPct >= 70 ? "up" : highRatingPct >= 50 ? "neutral" : "down"}
        />
      </div>

      {/* Rating distribution */}
      <Card>
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-sm font-semibold">Puan Dağılımı</CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 pt-1 flex flex-col gap-1.5">
          {distribution.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Henüz değerlendirme yok
            </p>
          ) : (
            distribution.map((d) => (
              <RatingBar
                key={d.rating}
                rating={d.rating}
                count={d.count}
                maxCount={maxDistCount}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Weekly trend */}
      {summary.weekly_trend.length > 0 && (
        <Card>
          <CardHeader className="p-3.5 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Haftalık Trend</CardTitle>
              <TrendingUp className="size-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-1 flex flex-col gap-2">
            <MiniTrendChart data={summary.weekly_trend} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {summary.weekly_trend.map((w, i) => (
                <span key={i}>{w.week.slice(5)}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category breakdown */}
      <Card>
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-sm font-semibold">Kategori Kırılımı</CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 pt-1">
          {summary.category_breakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Veri yok</p>
          ) : (
            <CategoryBreakdown data={summary.category_breakdown} />
          )}
        </CardContent>
      </Card>

      {/* Category filter + Comments */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Yorumlar</h3>
          <span className="text-[10px] text-muted-foreground">
            {recentComments.length} yorum
          </span>
        </div>

        <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />

        <div className="flex flex-col gap-2">
          {recentComments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Quote className="size-6" />
              <p className="text-sm">Henüz yorum yapılmamış</p>
              <p className="text-xs">Müşteriler görüşme sonunda değerlendirme yapabilir</p>
            </div>
          ) : (
            recentComments.map((c) => (
              <CommentCard
                key={c.id}
                comment={c.comment ?? ""}
                rating={c.rating}
                category={c.category}
                submittedAt={c.submitted_at}
                hasHumanization={humanizationCommentIds.has(c.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function FeedbackDashboard() {
  return <DashboardContent />;
}
