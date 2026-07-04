"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, AIHandler } from "@/lib/types";
import { mockConversations } from "@/lib/mock-data";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface ConversationRowProps {
  conversation: Conversation;
  onToggleHandler: (id: string, handler: AIHandler) => void;
}

function ConversationRow({ conversation, onToggleHandler }: ConversationRowProps) {
  const isAI = conversation.handler === "ai";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background p-3 transition-colors hover:bg-muted/30">
      {/* Avatar */}
      <div
        className={cn(
          "flex items-center justify-center size-10 rounded-full shrink-0",
          isAI
            ? "bg-violet-100 dark:bg-violet-900/30"
            : "bg-orange-100 dark:bg-orange-900/30"
        )}
      >
        {isAI ? (
          <Bot className="size-5 text-violet-600 dark:text-violet-400" />
        ) : (
          <User className="size-5 text-orange-600 dark:text-orange-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {conversation.guestName}
          </p>
          <Badge
            className={cn(
              "text-[10px] shrink-0",
              isAI
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
            )}
          >
            {isAI ? "AI Yanıtlıyor" : "Siz Yanıtlıyorsunuz"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {conversation.guestPhone}
        </p>
        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
          &ldquo;{conversation.lastMessage}&rdquo;
        </p>
        <p className="text-[11px] text-muted-foreground/50 mt-1">
          {formatDistanceToNow(parseISO(conversation.lastMessageAt), {
            addSuffix: true,
            locale: tr,
          })}
        </p>
      </div>

      {/* Toggle */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <Switch
          checked={isAI}
          onCheckedChange={(checked) =>
            onToggleHandler(conversation.id, checked ? "ai" : "human")
          }
        />
        <span className="text-[10px] text-muted-foreground">
          {isAI ? "AI" : "Elle"}
        </span>
      </div>
    </div>
  );
}

export function ConversationToggles() {
  const [conversations, setConversations] =
    React.useState<Conversation[]>(mockConversations as unknown as Conversation[]);

  const handleToggleHandler = (id: string, handler: AIHandler) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, handler } : c))
    );
  };

  const aiCount = conversations.filter((c) => c.handler === "ai").length;
  const humanCount = conversations.filter((c) => c.handler === "human").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-5 text-primary" />
          Aktif Konuşmalar
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-violet-500" />
            AI: {aiCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-orange-500" />
            Elle: {humanCount}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[350px]">
          <div className="flex flex-col gap-2">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                onToggleHandler={handleToggleHandler}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
