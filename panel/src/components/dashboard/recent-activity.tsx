"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageSquare,
  CalendarCheck,
  CreditCard,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface ActivityItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  description: string;
  timestamp: string;
}

const activities: ActivityItem[] = [
  {
    id: "act-1",
    icon: MessageSquare,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    description: "Ahmet Yılmaz yeni mesaj gönderdi",
    timestamp: new Date(Date.now() - 3 * 60_000).toISOString(),
  },
  {
    id: "act-2",
    icon: CalendarCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    description: "Burak Çelik — Orman Bungalov rezervasyonu onaylandı",
    timestamp: new Date(Date.now() - 28 * 60_000).toISOString(),
  },
  {
    id: "act-3",
    icon: CreditCard,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    description: "Elif Kaya — ₺18.750 ödeme alındı",
    timestamp: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
  {
    id: "act-4",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    description: "Mehmet Demir — Jakuzi arıza bildirimi",
    timestamp: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
  {
    id: "act-5",
    icon: UserPlus,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    description: "Can Öztürk yeni rezervasyon talebi oluşturdu",
    timestamp: new Date(Date.now() - 180 * 60_000).toISOString(),
  },
];

export function RecentActivity() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Son Aktiviteler</CardTitle>
      </CardHeader>
      <CardContent className="p-0!">
        <div className="flex flex-col">
          {activities.map((activity, idx) => (
            <div
              key={activity.id}
              className={`flex items-start gap-3 px-4 py-3 ${
                idx < activities.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${activity.iconBg}`}
              >
                <activity.icon className={`size-4 ${activity.iconColor}`} />
              </div>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm leading-snug truncate">
                  {activity.description}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.timestamp), {
                    addSuffix: true,
                    locale: tr,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
