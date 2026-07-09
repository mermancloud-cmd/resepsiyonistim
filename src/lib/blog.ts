import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  tags: string[];
  image: string;
  content: string;
}

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

/** Parse a single markdown file into a BlogPost */
function parseFile(slug: string, raw: string): BlogPost {
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? "",
    readingTime: data.readingTime ?? "3 dk",
    tags: Array.isArray(data.tags) ? data.tags : [],
    image: data.image ?? "/blog/default.svg",
    content,
  };
}

/** Return all blog posts sorted newest-first */
export async function getAllPosts(): Promise<BlogPost[]> {
  const files = await fs.readdir(BLOG_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const posts: BlogPost[] = [];

  for (const file of mdFiles) {
    const slug = file.replace(/\.md$/, "");
    const raw = await fs.readFile(path.join(BLOG_DIR, file), "utf-8");
    posts.push(parseFile(slug, raw));
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return posts;
}

/** Return a single blog post by slug */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const raw = await fs.readFile(path.join(BLOG_DIR, `${slug}.md`), "utf-8");
    return parseFile(slug, raw);
  } catch {
    return null;
  }
}

/** Return all slugs (for generateStaticParams) */
export async function getAllSlugs(): Promise<string[]> {
  const files = await fs.readdir(BLOG_DIR);
  return files.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
}
