"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Bot, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export function AIStatusCard() {
  const { data, isLoading } = useDashboardStats();

  const isActive = data?.aiStatus === "active";

  const lastActivityLabel = data?.aiLastActivity
    ? formatDistanceToNow(new Date(data.aiLastActivity), {
        addSuffix: true,
        locale: tr,
      })
    : "–";

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4 text-teal-600" />
          Elif AI Durumu
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-36 rounded bg-muted animate-pulse" />
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${
                  isActive ? "bg-emerald-500 shadow-[0_0_6px_var(--tw-shadow-color)] shadow-emerald-500/40" : "bg-red-500"
                }`}
              />
              <Badge
                variant={isActive ? "default" : "destructive"}
                className={
                  isActive
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                    : undefined
                }
              >
                {isActive ? "Aktif" : "Pasif"}
              </Badge>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare className="size-3.5" />
                <span>
                  Bugün <strong className="text-foreground">{data?.aiMessagesHandled ?? 0}</strong> mesaj
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>Son aktivite: {lastActivityLabel}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
