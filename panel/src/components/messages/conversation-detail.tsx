"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageBubble } from "@/components/messages/message-bubble";
import { useConversation, useHandoff, useSendMessage } from "@/hooks/use-conversations";
import type { ConversationDisplayState } from "@/hooks/use-conversations";
import { getConversationDisplayState } from "@/hooks/use-conversations";
import {
  HandMetal,
  Bot,
  Send,
  Phone,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const stateLabels: Record<ConversationDisplayState, { label: string; className: string }> = {
  active: { label: "AI Yönetiyor", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pending: { label: "Bekliyor", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  taken_over: { label: "Devralındı", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  closed: { label: "Kapandı", className: "bg-muted text-muted-foreground" },
};

interface ConversationDetailProps {
  conversationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConversationDetail({
  conversationId,
  open,
  onOpenChange,
}: ConversationDetailProps) {
  const { data, isLoading } = useConversation(conversationId as string);
  const [localState, setLocalState] = useState<ConversationDisplayState | null>(null);
  const [messageText, setMessageText] = useState("");
  const handoff = useHandoff();
  const sendMessage = useSendMessage();

  // Flatten the data shape for easier access
  const conv = data?.conversation;
  const messages = data?.messages ?? [];
  const guestName = conv?.guest_name ?? "Konuşma";
  const guestPhone = conv?.guest_phone ?? "";
  const currentState = localState ?? (conv ? getConversationDisplayState(conv) : "active");
  const stateInfo = stateLabels[currentState];

  const handleTakeOver = () => {
    if (!conversationId) return;
    const previousState = currentState;
    setLocalState("taken_over"); // optimistic
    handoff.mutate(
      { conversationId, action: "takeover" },
      { onError: () => setLocalState(previousState as ConversationDisplayState) }
    );
  };

  const handleReturnToAI = () => {
    if (!conversationId) return;
    const previousState = currentState;
    setLocalState("active"); // optimistic
    handoff.mutate(
      { conversationId, action: "return_to_ai" },
      { onError: () => setLocalState(previousState as ConversationDisplayState) }
    );
  };

  const handleSend = () => {
    if (!messageText.trim() || !conversationId) return;
    const text = messageText.trim();
    setMessageText("");
    sendMessage.mutate(
      { conversationId, content: text },
      { onError: () => setMessageText(text) } // restore input on failure
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full! sm:max-w-md! p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="border-b px-4 py-3 shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div className="flex flex-col gap-0.5">
              <SheetTitle className="text-sm!">
                {guestName}
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Phone className="size-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {guestPhone}
                </span>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={cn("text-[10px]", stateInfo.className)}
            >
              {stateInfo.label}
            </Badge>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-12 rounded-2xl bg-muted animate-pulse",
                    i % 2 === 0 ? "w-[70%] self-end" : "w-[80%] self-start"
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.sender as any}
                  content={msg.content}
                  createdAt={msg.created_at}
                />
              ))}
              {!messages.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Henüz mesaj yok
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer — Actions */}
        <SheetFooter className="shrink-0 border-t gap-0! p-0!">
          {/* Action buttons row */}
          <div className="flex items-center gap-2 border-b px-4 py-2">
            {currentState !== "taken_over" ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleTakeOver}
                disabled={handoff.isPending}
              >
                {handoff.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <HandMetal className="size-3.5" />
                )}
                Devral
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleReturnToAI}
                disabled={handoff.isPending}
              >
                {handoff.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Bot className="size-3.5" />
                )}
                AI&apos;a Geri Ver
              </Button>
            )}
          </div>

          {/* Message input */}
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Mesaj yazın..."
              className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <Button
              size="icon-sm"
              className="rounded-full bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSend}
              disabled={!messageText.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
