"use client";

import { testimonials, type Testimonial } from "@/lib/testimonials";

/** Star rating display (1–5) */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} / 5 yıldız`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`size-4 ${i < rating ? "text-amber-400" : "text-teal-200/40"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/** Single testimonial card */
function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="group relative rounded-2xl border border-teal-100/50 bg-white/70 backdrop-blur-sm p-7 space-y-4 hover:border-amber-200/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      {/* Glass shine */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />

      <div className="flex items-center gap-3 relative z-10">
        <span className="text-3xl" role="img" aria-label={t.name}>
          {t.avatar}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-teal-900 truncate">
            {t.name}
          </p>
          <p className="text-xs text-teal-600/60 truncate">
            {t.role}, {t.business}
          </p>
        </div>
      </div>

      <div className="relative z-10">
        <Stars rating={t.rating} />
      </div>

      <blockquote className="relative z-10">
        <p className="text-sm text-teal-700/80 leading-relaxed italic">
          &ldquo;{t.quote}&rdquo;
        </p>
      </blockquote>
    </div>
  );
}

interface Props {
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Social-proof testimonials section.
 * Renders 3–5 customer quotes in a responsive grid.
 * Drop-in for landing page, works as full-width banner or inline section.
 */
export default function TestimonialsSection({
  title = "Müşterilerimiz Ne Diyor?",
  subtitle = "İşletmesine dijital resepsiyonist katanların yorumları",
  className = "",
}: Props) {
  return (
    <section
      className={`px-6 py-20 md:py-28 bg-gradient-to-b from-white/90 via-[#f7f3ee]/30 to-white/90 relative ${className}`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-[20%] size-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-[20%] size-80 rounded-full bg-teal-300/10 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2e2a]">
            {title}
          </h2>
          <p className="text-teal-800/60 mt-3 max-w-md mx-auto text-base">
            {subtitle}
          </p>
        </div>

        {/* Grid: mobile=1, tablet=2, desktop=3 */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
