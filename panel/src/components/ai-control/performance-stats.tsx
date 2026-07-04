"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  MessageSquare,
  Clock,
  ArrowRightLeft,
  Star,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockAIPerformance } from "@/lib/mock-data";
import type { AIPerformance } from "@/lib/types";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  iconBg: string;
}

function StatCard({ icon, label, value, subtext, trend, iconBg }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background p-3.5">
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center justify-center size-8 rounded-lg", iconBg)}>
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-medium",
              trend === "up" && "text-emerald-600",
              trend === "down" && "text-red-600",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            <TrendingUp
              className={cn(
                "size-3",
                trend === "down" && "rotate-180"
              )}
            />
          </div>
        )}
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {subtext && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

export function PerformanceStats() {
  const stats: AIPerformance = mockAIPerformance;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-5 text-primary" />
          AI Performansı
        </CardTitle>
        <p className="text-xs text-muted-foreground">Bugünkü istatistikler</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={
              <MessageSquare className="size-4 text-violet-600 dark:text-violet-400" />
            }
            label="Yanıtlanan Mesaj"
            value={stats.messagesHandledToday.toString()}
            subtext="Bugün toplam"
            trend="up"
            iconBg="bg-violet-100 dark:bg-violet-900/30"
          />
          <StatCard
            icon={
              <Clock className="size-4 text-blue-600 dark:text-blue-400" />
            }
            label="Ort. Yanıt Süresi"
            value={`${stats.avgResponseTimeSeconds}s`}
            subtext="Saniye cinsinden"
            trend="up"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatCard
            icon={
              <ArrowRightLeft className="size-4 text-amber-600 dark:text-amber-400" />
            }
            label="Devralma Oranı"
            value={`%${stats.handoffRate}`}
            subtext="İnsana devir"
            trend="neutral"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
          />
          <StatCard
            icon={
              <Star className="size-4 text-emerald-600 dark:text-emerald-400" />
            }
            label="Memnuniyet"
            value={`${stats.satisfactionScore}/5`}
            subtext="Misafir puanı"
            trend="up"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          />
        </div>
      </CardContent>
    </Card>
  );
}
