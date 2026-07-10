"use client";

import * as React from "react";
import Link from "next/link";

/**
 * Sticky mobile CTA bar that appears on scroll.
 * Only visible on mobile (< sm breakpoint).
 */
export default function StickyMobileCTA() {
  const [visible, setVisible] = React.useState(false);
  const lastScrollY = React.useRef(0);

  React.useEffect(() => {
    const heroHeight = window.innerHeight * 0.6;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Show after scrolling past ~60% of viewport
      if (scrollY > heroHeight && !visible) {
        setVisible(true);
      } else if (scrollY <= heroHeight && visible) {
        setVisible(false);
      }
      lastScrollY.current = scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visible]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-teal-100/60 px-4 py-3 shadow-xl shadow-black/5 flex items-center gap-3">
        <Link
          href="/signup"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-teal-800 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-teal-900 transition-all shadow-md active:scale-[0.97]"
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
        <a
          href={`https://wa.me/905427450654?text=Merhaba`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all active:scale-[0.97]"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Canlı Gör
        </a>
      </div>
    </div>
  );
}
