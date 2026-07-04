"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/app-config";

interface HeaderProps {
  notificationCount?: number;
}

export function Header({ notificationCount = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        {/* App name */}
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </h1>

        {/* Notification bell */}
        <button
          className="touch-target relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Bildirimler"
        >
          <Bell className="size-5" />
          {notificationCount > 0 && (
            <span
              className={cn(
                "absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white",
                notificationCount > 9 && "size-5 text-[9px]"
              )}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
