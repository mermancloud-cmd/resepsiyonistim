"use client";

import { useEffect } from "react";
import { initAnalyticsClickTracking } from "@/lib/analytics";

/**
 * Client component that initializes analytics click tracking.
 * Must be rendered inside <body> and after Providers.
 * Uses useEffect to auto-wire data-event attributes on mount.
 */
export function AnalyticsInit() {
  useEffect(() => {
    const cleanup = initAnalyticsClickTracking();
    return cleanup;
  }, []);

  return null;
}
