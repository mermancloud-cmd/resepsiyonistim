import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug, getAllSlugs } from "@/lib/blog";
import { APP_NAME } from "@/lib/app-config";
import { MarkdownContent } from "./markdown-content";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Pre-render all blog posts at build time */
export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** Dynamic SEO metadata per post */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Yazı bulunamadı" };
  }

  return {
    title: `${post.title} | ${APP_NAME} Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const dateObj = new Date(post.date);
  const formattedDate = dateObj.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Back + header */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-4">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
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
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Tüm Yazılar
        </Link>

        <article>
          {/* Meta */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            <time dateTime={post.date}>{formattedDate}</time>
            <span className="size-1 rounded-full bg-muted-foreground/30" />
            <span>{post.readingTime} okuma</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            {post.title}
          </h1>

          {/* Description */}
          <p className="text-base text-muted-foreground leading-relaxed mb-4">
            {post.description}
          </p>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
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

          {/* Divider */}
          <hr className="border-border mb-8" />

          {/* Content */}
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:border prose-pre:border-border">
            <MarkdownContent content={post.content} />
          </div>
        </article>

        {/* Bottom back link */}
        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
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
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Tüm Blog Yazıları
          </Link>
        </div>
      </div>
    </div>
  );
}
