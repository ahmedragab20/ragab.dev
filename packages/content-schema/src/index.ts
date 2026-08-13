import { z } from "zod";

export const ContentTypeSchema = z.enum(["blog", "announcement"]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

/** YAML may parse bare dates as Date; normalize to YYYY-MM-DD. */
const DateStringSchema = z.union([z.string(), z.date()]).transform((value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
});

export const BlogFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  excerpt: z.string().optional(),
  date: DateStringSchema,
  /** Last meaningful edit — feeds article:modified_time and RSS lastBuildDate. */
  updated: DateStringSchema.optional(),
  draft: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});
export type BlogFrontmatter = z.infer<typeof BlogFrontmatterSchema>;

export const AnnouncementFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: DateStringSchema,
  draft: z.boolean().optional(),
  pinned: z.boolean().optional(),
});
export type AnnouncementFrontmatter = z.infer<typeof AnnouncementFrontmatterSchema>;

export const SiteConfigSchema = z.object({
  name: z.string(),
  role: z.string(),
  location: z.string(),
  status: z.string(),
  bio: z.array(z.string()),
  stack: z.array(z.string()),
  contact: z.object({
    email: z.string(),
    github: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
  }),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      url: z.string().optional(),
      tech: z.array(z.string()).optional(),
    }),
  ),
  experience: z
    .array(
      z.object({
        role: z.string(),
        org: z.string(),
        period: z.string().optional(),
        note: z.string().optional(),
      }),
    )
    .optional(),
  tools: z
    .array(
      z.object({
        name: z.string(),
        category: z.string(),
        tagline: z.string(),
        description: z.string().optional(),
        url: z.string().optional(),
        tech: z.array(z.string()).optional(),
        /** Detail lines — e.g. the diffing-integration block on the pi entry. */
        note: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});
export type SiteConfig = z.infer<typeof SiteConfigSchema>;

/** Terminal command ids exposed in v1. */
export const TERMINAL_COMMANDS = [
  "help",
  "tour",
  "browse",
  "whoami",
  "status",
  "bio",
  "stack",
  "projects",
  "blogs",
  "blog",
  "announcements",
  "announce",
  "contact",
  "theme",
  "clear",
  "ls",
  "neofetch",
] as const;

export type TerminalCommand = (typeof TERMINAL_COMMANDS)[number];
