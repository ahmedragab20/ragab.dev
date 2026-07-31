import type { SiteConfig } from "@ragab/content-schema";

/** Site identity */
export const site: SiteConfig = {
  name: "Ahmed Ragab",
  role: "Software Engineer",
  location: "Egypt",
  status: "Available",
  bio: [
    "I build systems that are small, fast, and honest.",
    "Minimal interfaces. Careful engineering. A little delight.",
  ],
  stack: [
    "languages   typescript · go · rust · python",
    "frontend    react · next · astro · tailwind",
    "backend     node · hono · postgres · redis",
    "infra       docker · cloudflare · terraform",
  ],
  contact: {
    email: "ahmedragab20901@gmail.com",
    github: "github.com/ahmedragab20",
    twitter: "x.com/__rgbx",
    linkedin: "linkedin.com/in/ahmed-ragab-bb75541b3",
  },
  projects: [],
};
