"use client";

import * as React from "react";

/**
 * Social proof metrics bar — shows live-like stats in the hero section.
 * Numbers are seeded static (not live) for MVP, but appear dynamic.
 */
const STATS = [
  { label: "Aktif İşletme", value: 24, suffix: "+" },
  { label: "Mesaj İşlendi", value: 12840, suffix: "+" },
  { label: "Ort. Yanıt Süresi", value: 3, suffix: "sn" },
  { label: "Memnuniyet", value: 97, suffix: "%" },
];

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [display, setDisplay] = React.useState(0);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    const duration = 2000;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplay(target);
        clearInterval(interval);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target]);

  const displayStr =
    target >= 1000
      ? display >= 1000
        ? `${(display / 1000).toFixed(1)}B`
        : `${display}`
      : `${display}`;

  return (
    <span className="font-bold text-2xl md:text-3xl text-teal-900 tabular-nums">
      {displayStr}
      <span className="text-amber-500">{suffix}</span>
    </span>
  );
}

export default function SocialProofMetrics() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-teal-100/60 bg-teal-100/40 shadow-sm">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm px-3 py-5 md:py-6 text-center"
          >
            <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            <span className="text-xs md:text-sm text-teal-700/60 mt-1 font-medium">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
