/**
 * Analytics event tracking helper.
 *
 * Supports:
 * - Plausible Analytics (primary — lightweight, privacy-first)
 * - Google Analytics via gtag.js (fallback if GA is enabled)
 *
 * Usage:
 *   trackEvent("Hero CTA Click", { variant: "benefit" })
 *   trackEvent("Pricing Tier Click", { tier: "Profesyonel" })
 *   trackEvent("Exit Popup Conversion")
 *
 * The global analytics functions are loaded via <script> tags in layout.tsx.
 * This helper safely calls them if available, or no-ops if not loaded.
 */

export type EventName =
  | "Hero CTA Click"
  | "Pricing Tier Click"
  | "Exit Popup Conversion"
  | "WhatsApp Demo Click"
  | "Signup Click"
  | "Trust Badge Seen";

type EventProperties = Record<string, string | number | boolean>;

/**
 * Track an analytics event via Plausible (primary) and/or gtag (fallback).
 */
export function trackEvent(
  name: EventName,
  properties?: EventProperties
): void {
  if (typeof window === "undefined") return;

  // ── Plausible ────────────────────────────────────────────────────────────
  try {
    const plausible = (window as unknown as Record<string, unknown>)
      .plausible as ((event: string, opts?: { props?: EventProperties }) => void) | undefined;
    if (typeof plausible === "function") {
      plausible(name, { props: properties });
    }
  } catch {
    // Plausible not loaded — noop
  }

  // ── Google Analytics (gtag.js) fallback ──────────────────────────────────
  try {
    const gtag = (window as unknown as Record<string, unknown>)
      .gtag as ((cmd: string, event: string, opts?: EventProperties) => void) | undefined;
    if (typeof gtag === "function") {
      gtag("event", name, properties);
    }
  } catch {
    // gtag not loaded — noop
  }
}

/**
 * Register click event listeners on elements with data-event attribute.
 * Call once after DOM is ready to auto-wire all CRO element clicks.
 */
export function initAnalyticsClickTracking(): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-event]");
    if (!target) return;

    const eventName = target.getAttribute("data-event") as EventName | null;
    if (!eventName) return;

    // Read optional data-event-props as JSON
    let props: EventProperties | undefined;
    const propsRaw = target.getAttribute("data-event-props");
    if (propsRaw) {
      try {
        props = JSON.parse(propsRaw);
      } catch {
        // invalid JSON — skip props
      }
    }

    trackEvent(eventName, props);
  };

  document.addEventListener("click", handler, { capture: true });

  // Return cleanup function
  return () => {
    document.removeEventListener("click", handler, { capture: true });
  };
}
