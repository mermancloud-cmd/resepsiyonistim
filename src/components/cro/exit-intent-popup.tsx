"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";

/**
 * Exit-intent popup that triggers when the user moves their mouse
 * towards the top of the page (closing/leaving intent).
 * Sets a session cookie to avoid showing repeatedly.
 */
export default function ExitIntentPopup() {
  const [open, setOpen] = React.useState(false);
  const dismissed = React.useRef(false);

  React.useEffect(() => {
    // Check if already seen in this session
    try {
      if (sessionStorage.getItem("exit-intent-dismissed")) {
        dismissed.current = true;
        return;
      }
    } catch {
      // sessionStorage may be blocked
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse moves towards browser chrome (top edge)
      if (e.clientY > 20 || dismissed.current || open) return;

      // Debounce to avoid accidental triggers
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!dismissed.current) {
          setOpen(true);
        }
      }, 300);
    };

    document.addEventListener("mouseout", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseout", handleMouseLeave);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open]);

  const handleDismiss = () => {
    setOpen(false);
    dismissed.current = true;
    try {
      sessionStorage.setItem("exit-intent-dismissed", "1");
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 rounded-full p-1.5 text-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          aria-label="Kapat"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          {/* Emoji */}
          <span className="text-4xl">🏡</span>

          <h3 className="text-xl font-bold text-[#1a2e2a]">
            Resepsiyonistini Hemen Dene
          </h3>

          <p className="text-sm text-teal-700/70 leading-relaxed">
            İşletmene 7/24 WhatsApp tabanlı dijital resepsiyonist katılsın.
            Misafirlerin sen uyurken bile karşılansın.
          </p>

          {/* CTA */}
          <Link
            href="/signup"
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 bg-teal-800 text-white px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-teal-900 transition-all shadow-md w-full justify-center hover:-translate-y-0.5"
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            Ücretsiz Dene
          </Link>

          <p className="text-xs text-teal-400/60">2 dakikada kurulum</p>
        </div>
      </div>
    </div>
  );
}
