"use client";
import { useState, useEffect } from "react";

/**
 * Returns true once the component has mounted on the client.
 * Eliminates the repeated useState + useEffect boilerplate used
 * to prevent hydration mismatches in client-only pages.
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
