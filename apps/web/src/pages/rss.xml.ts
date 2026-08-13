import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { loadTerminalContent } from "../lib/content";
import { site } from "../data/site";
import { bioSummary } from "../lib/seo";

export async function GET(context: APIContext) {
  const { blogs } = await loadTerminalContent();

  return rss({
    title: `${site.name} — ${site.role}`,
    description: bioSummary(site),
    site: context.site ?? "https://ragab.dev",
    items: blogs.map((post) => ({
      title: post.title,
      pubDate: new Date(post.date),
      description: post.excerpt,
      link: `/blog/${post.slug}`,
    })),
    customData: "<language>en-us</language>",
  });
}
