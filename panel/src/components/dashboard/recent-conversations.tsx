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
  Bot,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import type { RecentConversation } from "@/hooks/use-analytics-dashboard";

const stateConfig: Record<string, { label: string; color: string }> = {
  GREETING: { label: "Karşılama", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  QUALIFYING: { label: "Değerlendirme", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  PRESENTING_ROOMS: { label: "Oda Tanıtım", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  HANDLING_OBJECTIONS: { label: "İtiraz", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  COLLECTING_GUEST_INFO: { label: "Bilgi Toplama", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  CONFIRMING_RESERVATION: { label: "Onay Bekliyor", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  AWAITING_DEPOSIT: { label: "Depozito Bekliyor", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  RESERVATION_CONFIRMED: { label: "Onaylandı", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  END: { label: "Tamamlandı", color: "bg-muted text-muted-foreground" },
  HUMAN_HANDOFF: { label: "İnsan Aktarım", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  FOLLOW_UP: { label: "Takip", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  COMPLAINT: { label: "Şikayet", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function ConversationItem({ conv }: { conv: RecentConversation }) {
  const stateInfo = stateConfig[conv.state] ?? { label: conv.state, color: "bg-muted text-muted-foreground" };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          conv.is_ai_handled
            ? "bg-teal-50 dark:bg-teal-900/20"
            : "bg-amber-50 dark:bg-amber-900/20"
        )}
      >
        {conv.is_ai_handled ? (
          <Bot className="size-4 text-teal-600" />
        ) : (
          <User className="size-4 text-amber-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate">
            {conv.guest_name ?? conv.guest_phone}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 shrink-0", stateInfo.color)}
          >
            {stateInfo.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {conv.message_count}
          </span>
          <span>·</span>
          <span>
            {formatDistanceToNow(new Date(conv.last_activity), {
              addSuffix: true,
              locale: tr,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RecentConversationsCard({
  conversations,
  isLoading,
}: {
  conversations?: RecentConversation[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Son Konuşmalar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = conversations ?? [];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Son Konuşmalar</CardTitle>
      </CardHeader>
      <CardContent className="p-0!">
        <div className="px-4">
          {items.length > 0 ? (
            items.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              Bugün henüz konuşma yok
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
