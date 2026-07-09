import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { APP_NAME } from "@/lib/app-config";

export const metadata: Metadata = {
  title: `Blog | ${APP_NAME}`,
  description: `${APP_NAME} blog — Bungalov, tiny house ve butik otel işletmeciliği için dijital resepsiyonist ipuçları, rehberler ve sektör trendleri.`,
  openGraph: {
    title: `Blog | ${APP_NAME}`,
    description: "Dijital resepsiyonist, misafir memnuniyeti ve bungalov işletmeciliği üzerine yazılar.",
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero */}
      <section className="px-6 py-16 md:py-20 text-center bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 text-white">
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-amber-300 text-sm font-semibold tracking-wider uppercase">
            Blog
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Dijital Resepsiyonist Rehberi
          </h1>
          <p className="text-teal-100/80 text-base max-w-lg mx-auto">
            Bungalov işletmeciliği, misafir memnuniyeti ve otomasyon
            üzerine ipuçları, rehberler ve sektör trendleri.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        {posts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Henüz blog yazısı eklenmedi.</p>
            <p className="text-sm mt-1">Kısa sürede yeni yazılar yayında olacak.</p>
          </div>
        )}

        <div className="space-y-8">
          {posts.map((post) => {
            const dateObj = new Date(post.date);
            const formattedDate = dateObj.toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            return (
              <article
                key={post.slug}
                className="group rounded-2xl border border-border bg-card p-6 hover:shadow-md hover:border-amber-200/60 transition-all duration-300"
              >
                <Link href={`/blog/${post.slug}`} className="block space-y-3">
                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <time dateTime={post.date}>{formattedDate}</time>
                    <span className="size-1 rounded-full bg-muted-foreground/30" />
                    <span>{post.readingTime} okuma</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {post.description}
                  </p>

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
