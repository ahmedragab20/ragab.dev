import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import {
  AnnouncementFrontmatterSchema,
  BlogFrontmatterSchema,
} from "@ragab/content-schema";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: BlogFrontmatterSchema,
});

const announcements = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/announcements" }),
  schema: AnnouncementFrontmatterSchema,
});

export const collections = { blog, announcements };
