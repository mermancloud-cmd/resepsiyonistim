"use client";
import * as React from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { ConversationMetrics } from "@/components/dashboard/conversation-metrics";
import { InquiryBreakdownCard } from "@/components/dashboard/inquiry-breakdown";
import { AIResolutionCard } from "@/components/dashboard/ai-resolution-card";
import { RecentConversationsCard } from "@/components/dashboard/recent-conversations";
import { RevenueIndicatorsCard } from "@/components/dashboard/revenue-indicators";
import { QuickActionsCard } from "@/components/dashboard/quick-actions";
import { useAnalyticsDashboard } from "@/hooks/use-analytics-dashboard";
import { Banknote, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data, isLoading, isFetching, refetch } = useAnalyticsDashboard();

  if (!isMounted) return null;

  return (
    <MobileShell notificationCount={data?.revenue_indicators?.pending_iban_count ?? 0}>
      <div className="flex flex-col gap-4 pb-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Gösterge Paneli</h2>
            <p className="text-xs text-muted-foreground">
              AI performansı ve iş metrikleri
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data?.revenue_indicators && (
              <div className="flex items-center gap-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 px-2.5 py-1.5 ring-1 ring-teal-200 dark:ring-teal-800">
                <Banknote className="size-3.5 text-teal-600" />
                <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                  ₺{(data.revenue_indicators.today_revenue ?? 0).toLocaleString("tr-TR")}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Yenile"
            >
              <RefreshCw
                className={`size-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* §1 — Conversation metrics: today's count, response rate, avg response time */}
        <ConversationMetrics
          metrics={data?.conversation_metrics}
          isLoading={isLoading}
        />

        {/* §2 — Guest inquiry breakdown by category */}
        <InquiryBreakdownCard
          data={data?.inquiry_breakdown}
          isLoading={isLoading}
        />

        {/* §3 — AI resolution rate */}
        <AIResolutionCard
          data={data?.ai_resolution}
          isLoading={isLoading}
        />

        {/* §4 — Recent conversations list with status badges */}
        <RecentConversationsCard
          conversations={data?.recent_conversations}
          isLoading={isLoading}
        />

        {/* §5 — Revenue indicators: pending IBAN, confirmed bookings */}
        <RevenueIndicatorsCard
          data={data?.revenue_indicators}
          isLoading={isLoading}
        />

        {/* §6 — Quick action buttons: toggle AI, view DLQ errors, manage rooms */}
        <QuickActionsCard
          data={data?.quick_actions}
          isLoading={isLoading}
        />
      </div>
    </MobileShell>
  );
}
