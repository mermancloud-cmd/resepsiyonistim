"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPlanPrice } from "@/lib/subscription/plans";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription/plans";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface SubscriptionStatusProps {
  status: "none" | "trial" | "active" | "past_due" | "cancelled" | "expired";
  planId?: string;
  trialEnd?: string;
  currentPeriodEnd?: string;
  isMock?: boolean;
}

const statusConfig = {
  none: {
    label: "Abonelik Yok",
    icon: ShieldX,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    ringColor: "ring-muted-200 dark:ring-muted-800",
  },
  trial: {
    label: "Deneme",
    icon: Sparkles,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    ringColor: "ring-blue-200 dark:ring-blue-800",
  },
  active: {
    label: "Aktif",
    icon: ShieldCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    ringColor: "ring-emerald-200 dark:ring-emerald-800",
  },
  past_due: {
    label: "Gecikmiş",
    icon: ShieldAlert,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    ringColor: "ring-amber-200 dark:ring-amber-800",
  },
  cancelled: {
    label: "İptal",
    icon: ShieldX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    ringColor: "ring-red-200 dark:ring-red-800",
  },
  expired: {
    label: "Süresi Dolmuş",
    icon: ShieldX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    ringColor: "ring-red-200 dark:ring-red-800",
  },
};

export function SubscriptionStatusCard({
  status,
  planId,
  trialEnd,
  currentPeriodEnd,
  isMock,
}: SubscriptionStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const plan = planId ? SUBSCRIPTION_PLANS.find((p) => p.id === planId) : null;

  const endDate = trialEnd ?? currentPeriodEnd;
  const daysLeft = endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <Card size="sm" className={cn("ring-1", config.ringColor)}>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn("flex size-9 items-center justify-center rounded-lg", config.bgColor)}>
              <Icon className={cn("size-4.5", config.color)} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">
                  {plan ? plan.name : "Abonelik"}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0",
                    config.bgColor,
                    config.color
                  )}
                >
                  {config.label}
                </Badge>
                {isMock && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 opacity-50">
                    demo
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {plan && (
                  <span className="font-medium">
                    {formatPlanPrice(plan.price)}/ay
                  </span>
                )}
                {daysLeft !== null && status === "trial" && (
                  <span className="ml-1.5 flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {daysLeft} gün kaldı
                  </span>
                )}
                {daysLeft !== null && status === "active" && (
                  <span className="ml-1.5">
                    Sonraki fatura: {daysLeft} gün
                  </span>
                )}
              </p>
            </div>
          </div>

          {(status === "none" || status === "expired" || status === "past_due") && (
            <Link href="/subscription">
              <Button variant="outline" size="sm" className="text-xs h-7">
                {status === "none" ? "Plan Seç" : "Yenile"}
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
