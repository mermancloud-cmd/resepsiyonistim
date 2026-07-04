"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Client-side rate limiter hook.
 *
 * Uses a sliding window counter stored in a ref.
 * When the limit is reached, blocks further attempts for `windowMs` milliseconds.
 * Returns `isLimited`, `remaining` attempts, `retryAfter` seconds, and a `checkLimit()` function.
 */
interface UseRateLimiterOptions {
  maxAttempts: number;
  windowMs: number;
  onLimited?: () => void;
}

interface UseRateLimiterReturn {
  /** Check if the next attempt is allowed. Returns true if allowed, false if rate-limited. */
  checkLimit: () => boolean;
  /** Whether the user is currently rate-limited */
  isLimited: boolean;
  /** Number of remaining attempts in the current window */
  remaining: number;
  /** Seconds until the rate limit resets */
  retryAfter: number;
  /** Reset the rate limiter (e.g., after successful login) */
  reset: () => void;
}

export function useRateLimiter({
  maxAttempts,
  windowMs,
  onLimited,
}: UseRateLimiterOptions): UseRateLimiterReturn {
  const [isLimited, setIsLimited] = useState(false);
  const [remaining, setRemaining] = useState(maxAttempts);
  const [retryAfter, setRetryAfter] = useState(0);

  const attemptsRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback((resetAtMs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.ceil((resetAtMs - now) / 1000));

      if (secondsLeft <= 0) {
        setIsLimited(false);
        setRetryAfter(0);
        setRemaining(maxAttempts);
        attemptsRef.current = [];
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        setRetryAfter(secondsLeft);
      }
    }, 500); // Update every 500ms for smooth countdown
  }, [maxAttempts]);

  const checkLimit = useCallback((): boolean => {
    if (isLimited) return false;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove expired attempts
    attemptsRef.current = attemptsRef.current.filter((t) => t > windowStart);

    if (attemptsRef.current.length >= maxAttempts) {
      // Rate limited
      const oldestInWindow = attemptsRef.current[0];
      const resetAtMs = oldestInWindow + windowMs;

      setIsLimited(true);
      setRemaining(0);
      setRetryAfter(Math.ceil((resetAtMs - now) / 1000));
      startCountdown(resetAtMs);
      onLimited?.();
      return false;
    }

    // Record this attempt
    attemptsRef.current.push(now);
    setRemaining(maxAttempts - attemptsRef.current.length);
    return true;
  }, [isLimited, maxAttempts, windowMs, startCountdown, onLimited]);

  const reset = useCallback(() => {
    attemptsRef.current = [];
    setIsLimited(false);
    setRemaining(maxAttempts);
    setRetryAfter(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [maxAttempts]);

  return { checkLimit, isLimited, remaining, retryAfter, reset };
}
