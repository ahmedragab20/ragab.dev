import { getCollection } from "astro:content";
import type { ContentItem } from "../components/TerminalApp";

export async function loadTerminalContent(): Promise<{
  blogs: ContentItem[];
  announcements: ContentItem[];
}> {
  const blogEntries = (await getCollection("blog"))
    .filter((e) => !e.data.draft)
    .toSorted((a, b) => b.data.date.localeCompare(a.data.date));

  const announcementEntries = (await getCollection("announcements"))
    .filter((e) => !e.data.draft)
    .toSorted((a, b) => b.data.date.localeCompare(a.data.date));

  const blogs = blogEntries.map((entry) => ({
    slug: entry.id.replace(/\.(md|mdx)$/, ""),
    title: entry.data.title,
    date: entry.data.date,
    updated: entry.data.updated,
    excerpt: entry.data.excerpt ?? entry.data.description,
    tags: entry.data.tags ?? [],
    body: entry.body ?? "",
  }));

  const announcements = announcementEntries.map((entry) => ({
    slug: entry.id.replace(/\.(md|mdx)$/, ""),
    title: entry.data.title,
    date: entry.data.date,
    pinned: entry.data.pinned ?? false,
    body: entry.body ?? "",
  }));

  return { blogs, announcements };
}

/** Drop MD bodies so island props stay small (list/meta only). */
export function withoutBodies(items: ContentItem[]): ContentItem[] {
  return items.map(({ body: _body, ...meta }) => meta);
}

/** Keep a single post body (boot mode) — strip the rest. */
export function withOnlyBody(items: ContentItem[], slug: string): ContentItem[] {
  return items.map((item) => (item.slug === slug ? item : { ...item, body: undefined }));
}
