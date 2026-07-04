"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    id: "dashboard" as const,
    label: "Gösterge",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "messages" as const,
    label: "Mesajlar",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    id: "payments" as const,
    label: "Ödemeler",
    href: "/payments",
    icon: CreditCard,
  },
  {
    id: "analytics" as const,
    label: "Analitik",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    id: "settings" as const,
    label: "Ayarlar",
    href: "/settings",
    icon: Settings,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-safe"
      role="navigation"
      aria-label="Ana menü"
    >
      <ul className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.id}>
              <button
                onClick={() => router.push(item.href)}
                className={cn(
                  "no-tap-highlight touch-target flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] font-medium transition-colors",
                  "min-h-[4rem] w-full",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon
                  className={cn(
                    "size-5 transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="leading-tight">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
