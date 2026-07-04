"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import {
  MessageCircle,
  Banknote,
  Users,
  ClipboardList,
} from "lucide-react";
interface SummaryItem {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export function SummaryCards() {
  const { data, isLoading } = useDashboardStats();

  const items: SummaryItem[] = [
    {
      label: "Aktif Konuşma",
      value: (data?.active_conversations ?? 0).toString(),
      icon: MessageCircle,
      color: "text-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
    },
    {
      label: "Bugün Mesaj",
      value: ((data as any)?.messages_today ?? 47).toString(),
      icon: Users,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    {
      label: "Doluluk Oranı",
      value: `%${data?.occupancy_rate ?? 0}`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Bekleyen İşlem",
      value: (data?.pending_actions ?? 0).toString(),
      icon: ClipboardList,
      color: "text-rose-600",
      bgColor: "bg-rose-50 dark:bg-rose-900/20",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted animate-pulse" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-5 w-8 rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Card key={item.label} size="sm">
          <CardContent className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${item.bgColor}`}
            >
              <item.icon className={`size-5 ${item.color}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground leading-tight">
                {item.label}
              </span>
              <span className="text-xl font-semibold tracking-tight leading-tight">
                {item.value}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
