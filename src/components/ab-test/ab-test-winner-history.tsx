"use client";

import * as React from "react";
import {
  useABTestWinnerHistory,
  useABTestOptimization,
} from "@/hooks/use-ab-tests";
import type { ABTestWinnerHistoryRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Trophy,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  satisfaction_score: "Memnuniyet Puanı",
  completion_rate: "Tamamlama Oranı",
  response_time: "Yanıt Süresi",
  conversion_rate: "Dönüşüm Oranı",
};

const TRIGGER_LABELS: Record<string, string> = {
  cron: "Otomatik",
  manual: "Manuel",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  completed: CheckCircle2,
  pending: Clock,
  failed: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  completed: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200",
  pending: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200",
  failed: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const Icon = STATUS_ICONS[status] || AlertCircle;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] gap-1 py-0.5",
        STATUS_COLORS[status] || "text-muted-foreground"
      )}
    >
      <Icon className="size-2.5" />
      {status === "completed"
        ? "Uygulandı"
        : status === "pending"
          ? "Beklemede"
          : status === "failed"
            ? "Başarısız"
            : status}
    </Badge>
  );
}

// ─── Winner History Card ──────────────────────────────────────────────────────

function WinnerHistoryCard({
  item,
}: {
  item: ABTestWinnerHistoryRow;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-3 text-sm transition-colors hover:bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg bg-amber-500/10 p-1.5 shrink-0">
            <Trophy className="size-3.5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.test_name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatDate(item.applied_at || item.created_at)}
            </p>
          </div>
        </div>
        <StatusBadge status="completed" />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Trophy className="size-3 text-amber-500" />
          <span className="font-medium text-foreground">{item.winner_variant_name}</span>
        </span>

        <span className="flex items-center gap-1">
          <BarChart3 className="size-3" />
          {METRIC_LABELS[item.winning_metric] || item.winning_metric}
        </span>

        {item.metric_improvement != null && (
          <span className="flex items-center gap-1 text-green-600">
            <TrendingUp className="size-3" />
            %{Number(item.metric_improvement).toFixed(1)} iyileşme
          </span>
        )}

        {item.confidence_score != null && (
          <span className="flex items-center gap-1">
            <BarChart3 className="size-3" />
            %{Number(item.confidence_score).toFixed(0)} güven
          </span>
        )}

        <span className="flex items-center gap-1">
          <FlaskConical className="size-3" />
          {item.sample_size} örnek
        </span>

        <span className="flex items-center gap-1">
          <RefreshCw className="size-3" />
          {TRIGGER_LABELS[item.triggered_by] || item.triggered_by}
        </span>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ABTestWinnerHistoryProps {
  /** Optional: show only N most recent items */
  limit?: number;
  /** Optional: compact mode (no header, smaller text) */
  compact?: boolean;
  /** Optional: testId to filter by */
  testId?: string;
  /** Optional: show manual optimize button */
  showOptimize?: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ABTestWinnerHistory({
  limit,
  compact,
  testId,
  showOptimize = true,
}: ABTestWinnerHistoryProps) {
  const { data: history, isLoading, error } = useABTestWinnerHistory();
  const optimizeMutation = useABTestOptimization();

  const filtered = React.useMemo(() => {
    if (!history) return [];
    let items = history.filter((h) => h.status !== "pending");
    if (testId) items = items.filter((h) => h.test_id === testId);
    if (limit && limit > 0) items = items.slice(0, limit);
    return items as ABTestWinnerHistoryRow[];
  }, [history, testId, limit]);

  const handleOptimize = async () => {
    if (!testId) {
      toast.error("Test seçilmedi");
      return;
    }
    try {
      const result = await optimizeMutation.mutateAsync({ testId });
      toast.success(
        result.optimization?.status === "completed"
          ? "Optimizasyon tamamlandı! Kazanan varyant uygulandı."
          : "Optimizasyon başlatıldı. Sonuçları kontrol edin."
      );
    } catch {
      toast.error("Optimizasyon başarısız");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {compact ? null : (
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        )}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 w-full rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
            <AlertCircle className="size-6 text-red-400" />
            <p className="text-sm">Geçmiş yüklenemedi</p>
            <p className="text-[11px] text-muted-foreground text-center">
              {error.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!filtered.length) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Trophy className="size-8 text-amber-300" />
            <p className="text-sm font-medium">Henüz optimizasyon yapılmamış</p>
            <p className="text-[11px] text-center max-w-xs">
              A/B testleri otomatik optimize edildikçe kazanan varyantlar burada
              görünecek.
            </p>
            {showOptimize && testId && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-8 text-xs"
                onClick={handleOptimize}
                disabled={optimizeMutation.isPending}
              >
                {optimizeMutation.isPending ? (
                  <RefreshCw className="mr-1 size-3 animate-spin" />
                ) : (
                  <TrendingUp className="mr-1 size-3" />
                )}
                Şimdi Optimize Et
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      {compact ? null : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            <h4 className="text-sm font-semibold">Optimizasyon Geçmişi</h4>
            <span className="text-[10px] text-muted-foreground">
              ({filtered.length} kayıt)
            </span>
          </div>

          {showOptimize && testId && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleOptimize}
              disabled={optimizeMutation.isPending}
            >
              {optimizeMutation.isPending ? (
                <RefreshCw className="mr-1 size-3 animate-spin" />
              ) : (
                <TrendingUp className="mr-1 size-3" />
              )}
              Otomatik Optimize Et
            </Button>
          )}
        </div>
      )}

      {/* History list */}
      <div className="flex flex-col gap-2">
        {filtered.map((item) => (
          <WinnerHistoryCard key={item.id} item={item} />
        ))}
      </div>

      {/* View all link (when limited) */}
      {limit && history && history.length > limit && (
        <button
          type="button"
          className="text-xs text-primary text-center py-1 hover:underline"
          onClick={() => {
            // Could navigate to a full history page
            toast.info("Tüm geçmiş sayfası yakında");
          }}
        >
          Tümünü Gör ({history.length} kayıt)
        </button>
      )}
    </div>
  );
}
