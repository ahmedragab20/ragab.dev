import type { SiteConfig } from "@ragab/content-schema";

const BASE_URL = "https://ragab.dev";

export function absolute(path: string): string {
  return new URL(path, BASE_URL).href;
}

/** Blog post metadata needed to build SEO tags + JSON-LD (bodies optional). */
export interface BlogMeta {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  excerpt?: string;
  tags?: string[];
}

/** `x.com/__rgbx` → `@__rgbx` */
export function twitterHandle(site: SiteConfig): string | undefined {
  const raw = site.contact.twitter;
  if (!raw) return undefined;
  const clean = (raw.split("/").pop() ?? "").replace(/^@/, "");
  return clean ? `@${clean}` : undefined;
}

/** `YYYY-MM-DD` → full ISO 8601 (UTC), or undefined when unparseable. */
export function toISO(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function sameAs(site: SiteConfig): string[] {
  const out: string[] = [];
  for (const key of ["github", "twitter", "linkedin"] as const) {
    const value = site.contact[key];
    if (!value) continue;
    out.push(value.startsWith("http") ? value : `https://${value}`);
  }
  return out;
}

/** Technologies extracted from the `stack` lines (`category   a · b · c`). */
function knowsAbout(site: SiteConfig): string[] {
  const items: string[] = [];
  for (const line of site.stack) {
    const rest = line.replace(/^\S+\s+/, "");
    for (const item of rest.split("·")) {
      const trimmed = item.trim();
      if (trimmed) items.push(trimmed);
    }
  }
  return items;
}

/** Plain-language bio string for titles/descriptions and schema. */
export function bioSummary(site: SiteConfig): string {
  return site.bio.join(" ");
}

export function personLd(site: SiteConfig): Record<string, unknown> {
  return {
    "@type": "Person",
    name: site.name,
    jobTitle: site.role,
    description: bioSummary(site),
    url: BASE_URL,
    sameAs: sameAs(site),
    knowsAbout: knowsAbout(site),
  };
}

export function websiteLd(site: SiteConfig): Record<string, unknown> {
  return {
    "@type": "WebSite",
    name: site.name,
    url: BASE_URL,
    description: bioSummary(site),
  };
}

export function blogPostingLd(post: BlogMeta, site: SiteConfig): Record<string, unknown> {
  const url = absolute(`/blog/${post.slug}`);
  return {
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date,
    ...(post.updated ? { dateModified: post.updated } : {}),
    description: post.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Person", name: site.name, url: BASE_URL },
    publisher: { "@type": "Person", name: site.name, url: BASE_URL },
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
    ...(post.tags?.length ? { articleSection: post.tags[0] } : {}),
  };
}

export function blogLd(posts: BlogMeta[], site: SiteConfig): Record<string, unknown> {
  return {
    "@type": "Blog",
    name: "Blog — ragab.dev",
    url: absolute("/blog"),
    blogPost: posts.map((post) => blogPostingLd(post, site)),
  };
}
