"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Clock,
  Zap,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import type { ConversationMetric } from "@/hooks/use-analytics-dashboard";

export function ConversationMetrics({
  metrics,
  isLoading,
}: {
  metrics?: ConversationMetric;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex flex-col items-center gap-1 py-3">
              <div className="h-5 w-8 rounded bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Bugün Konuşma",
      value: (metrics?.total_today ?? 0).toString(),
      icon: MessageSquare,
      color: "text-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
    },
    {
      label: "Yanıtlama Oranı",
      value: `%${metrics?.response_rate ?? 0}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Ort. Yanıt Süresi",
      value: `${metrics?.avg_response_time_seconds ?? 0}s`,
      icon: Zap,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <Card key={item.label} size="sm">
          <CardContent className="flex flex-col items-center gap-1.5 py-3">
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${item.bgColor}`}
            >
              <item.icon className={`size-4 ${item.color}`} />
            </div>
            <span className="text-xl font-bold tracking-tight leading-none">
              {item.value}
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              {item.label}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
