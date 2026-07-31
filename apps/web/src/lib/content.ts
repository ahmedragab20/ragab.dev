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
