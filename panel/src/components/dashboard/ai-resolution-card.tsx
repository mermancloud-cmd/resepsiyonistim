"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIResolution } from "@/hooks/use-analytics-dashboard";

export function AIResolutionCard({
  data,
  isLoading,
}: {
  data?: AIResolution;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">AI Çözüm Oranı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rate = data?.resolution_rate ?? 0;
  const aiCount = data?.ai_resolved ?? 0;
  const humanCount = data?.human_handoff ?? 0;
  const total = data?.total_conversations ?? 0;

  // Calculate ring circumference for circular progress
  const circumference = 2 * Math.PI * 28; // radius = 28
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="size-4 text-teal-600" />
          AI Çözüm Oranı
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          {/* Circular progress */}
          <div className="relative size-16 shrink-0">
            <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="4"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">%{rate}</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-teal-50 dark:bg-teal-900/20">
                <Bot className="size-3 text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">AI Otomatik</span>
                  <span className="text-xs font-semibold">{aiCount}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-900/20">
                <UserCheck className="size-3 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">İnsan Müdahale</span>
                  <span className="text-xs font-semibold">{humanCount}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Toplam {total} konuşma üzerinden
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
