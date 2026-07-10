"use client";

import { ShieldCheck, Lock, Activity } from "lucide-react";

const BADGES = [
  {
    icon: ShieldCheck,
    label: "ISO 27001",
    desc: "Bilgi Güvenliği",
  },
  {
    icon: Lock,
    label: "256-bit SSL",
    desc: "Uçtan Uca Şifreleme",
  },
  {
    icon: Activity,
    label: "%99.9 Uptime",
    desc: "Kesintisiz Hizmet",
  },
];

interface TrustBadgesProps {
  className?: string;
  /** `column` for CTA area, `row` for pricing/post-CTA */
  layout?: "row" | "column";
}

export default function TrustBadges({
  className = "",
  layout = "row",
}: TrustBadgesProps) {
  return (
    <div
      className={`flex ${
        layout === "column"
          ? "flex-col gap-3"
          : "flex-row flex-wrap items-center justify-center gap-x-6 gap-y-3"
      } ${className}`}
    >
      {BADGES.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-2 text-teal-700/50 text-xs"
        >
          <badge.icon className="size-4 text-teal-500/60 shrink-0" />
          <span>
            <strong className="font-semibold text-teal-700/70">
              {badge.label}
            </strong>{" "}
            <span className="hidden sm:inline">· {badge.desc}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
