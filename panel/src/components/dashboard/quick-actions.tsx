"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  AlertTriangle,
  DoorOpen,
  Power,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { QuickActionState } from "@/hooks/use-analytics-dashboard";

export function QuickActionsCard({
  data,
  isLoading,
}: {
  data?: QuickActionState;
  isLoading?: boolean;
}) {
  const [aiEnabled, setAiEnabled] = React.useState(data?.ai_enabled ?? true);

  React.useEffect(() => {
    if (data?.ai_enabled !== undefined) {
      setAiEnabled(data.ai_enabled);
    }
  }, [data?.ai_enabled]);

  if (isLoading) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Hızlı İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-11 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Power className="size-4 text-primary" />
          Hızlı İşlemler
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {/* AI Toggle */}
          <button
            type="button"
            onClick={() => setAiEnabled(!aiEnabled)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-all text-left",
              aiEnabled
                ? "bg-teal-50 dark:bg-teal-900/20 ring-teal-200 dark:ring-teal-800"
                : "bg-red-50 dark:bg-red-900/20 ring-red-200 dark:ring-red-800"
            )}
          >
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                aiEnabled
                  ? "bg-teal-100 dark:bg-teal-800/40"
                  : "bg-red-100 dark:bg-red-800/40"
              )}
            >
              <Bot
                className={cn(
                  "size-4",
                  aiEnabled ? "text-teal-600" : "text-red-600"
                )}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                AI Asistan {aiEnabled ? "Aktif" : "Pasif"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {aiEnabled
                  ? "AI konuşmaları otomatik yanıtlıyor"
                  : "Tüm konuşmalar insan aktarımına yönlendiriliyor"}
              </p>
            </div>
            <div
              className={cn(
                "relative size-10 shrink-0 rounded-full transition-colors",
                aiEnabled ? "bg-teal-500" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 size-4 rounded-full bg-white shadow transition-transform",
                  aiEnabled ? "left-5" : "left-1"
                )}
              />
            </div>
          </button>

          {/* DLQ Errors */}
          <Link href="/ai" className="block">
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="size-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">DLQ Hataları</p>
                <p className="text-[10px] text-muted-foreground">
                  Bekleyen hata mesajlarını görüntüle
                </p>
              </div>
              {(data?.dlq_error_count ?? 0) > 0 && (
                <Badge
                  variant="destructive"
                  className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                >
                  {data?.dlq_error_count}
                </Badge>
              )}
              {(data?.dlq_error_count ?? 0) === 0 && (
                <Badge variant="outline" className="text-emerald-600">
                  Temiz
                </Badge>
              )}
            </div>
          </Link>

          {/* Manage Rooms */}
          <Link href="/reservations" className="block">
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/20">
                <DoorOpen className="size-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Oda Yönetimi</p>
                <p className="text-[10px] text-muted-foreground">
                  {data?.active_rooms_count ?? 0} aktif oda
                </p>
              </div>
              <Badge variant="outline" className="text-violet-600">
                {data?.active_rooms_count ?? 0}
              </Badge>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
