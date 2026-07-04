import { cn } from "@/lib/utils";
import type { MessageRole } from "@/hooks/use-conversations";
import { format } from "date-fns";

interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  createdAt: string;
}

export function MessageBubble({ role, content, createdAt }: MessageBubbleProps) {
  const isUser = role === "assistant";
  const isSystem = role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-0.5", isUser ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-teal-600 text-white"
            : "rounded-bl-md bg-muted text-foreground"
        )}
      >
        {content}
      </div>
      <span className="px-1 text-[10px] text-muted-foreground">
        {format(new Date(createdAt), "HH:mm")}
      </span>
    </div>
  );
}
