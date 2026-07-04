"use client";

import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: React.ReactNode;
  notificationCount?: number;
  hideNav?: boolean;
}

export function MobileShell({
  children,
  notificationCount = 0,
  hideNav = false,
}: MobileShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header notificationCount={notificationCount} />

      <main className={cn("flex-1 overflow-y-auto", !hideNav && "pb-safe-nav")}>
        <div className="mx-auto w-full max-w-lg px-4 py-4 page-transition">
          {children}
        </div>
      </main>

      {!hideNav && <BottomNav />}
    </div>
  );
}
