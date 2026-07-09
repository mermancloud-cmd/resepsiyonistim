"use client";

import { MobileShell } from "@/components/layout/mobile-shell";
import { FeedbackDashboard } from "@/components/feedback/feedback-dashboard";
import { Suspense } from "react";

function LoadingFallback() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="h-8 w-full animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <MobileShell>
      <Suspense fallback={<LoadingFallback />}>
        <FeedbackDashboard />
      </Suspense>
    </MobileShell>
  );
}
