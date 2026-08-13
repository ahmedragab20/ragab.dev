import type { SiteConfig } from "@ragab/content-schema";

/** Site identity */
export const site: SiteConfig = {
  name: "Ahmed Ragab",
  role: "Software Engineer",
  location: "Egypt",
  status: "Available",
  bio: [
    "I build AI-integrated developer tools and fast, honest web systems.",
    "Fullstack engineer at Foodics — 7+ years on the web",
  ],
  stack: [
    "languages   typescript · go · rust · php",
    "frontend    react · next · astro · vue · nuxt · solidjs · tailwind · storybook",
    "backend     node · bun · hono · laravel · directus · postgres · mysql · redis",
    "ai          mcp · coding agents · llm tooling",
    "infra       docker · cloudflare",
  ],
  contact: {
    email: "ahmedragab20901@gmail.com",
    github: "github.com/ahmedragab20",
    twitter: "x.com/__rgbx",
    linkedin: "linkedin.com/in/ahmed-ragab-bb75541b3",
  },
  experience: [
    {
      role: "Fullstack Engineer",
      org: "Foodics Pay",
      period: "2024 — now",
      note: "FinTech. Resturnats management. Financial services. Fullstack",
    },
    {
      role: "Senior Frontend Engineer",
      org: "BuildScan",
      note: "digitising construction workflows",
    },
    {
      role: "Frontend Engineer",
      org: "Abwaab",
      note: "ed-tech platform for MENA students",
    },
    {
      role: "Senior Frontend Developer",
      org: "Jetorder",
      note: "e-commerce ordering experiences",
    },
  ],
  projects: [
    {
      name: "diffing",
      description:
        "Local-first code review + planning tool — human ↔ AI realtime. Web UI, inline comments, plan review, MCP server (37 tools), Rust TUI.",
      url: "https://github.com/ahmedragab20/diffing",
      tech: ["typescript", "rust", "node", "mcp", "cli"],
    },
    {
      name: "ragab.dev",
      description:
        "This site — terminal-first personal site. Astro + React islands, 66-palette token theme engine, Cloudflare edge.",
      url: "https://ragab.dev",
      tech: ["astro", "react", "cloudflare"],
    },
    {
      name: "vue-use-state",
      description:
        "Elevate a reactive variable to global scope shared across a Vue app — tiny, composable state.",
      url: "https://github.com/ahmedragab20/vue-use-state",
      tech: ["vue", "typescript"],
    },
    {
      name: "leptos-axum-tailwind",
      description: "Starter template for Axum + Leptos + Tailwind — full-stack Rust web apps.",
      url: "https://github.com/ahmedragab20/leptos-axum-tailwind",
      tech: ["rust", "leptos", "axum", "tailwind"],
    },
  ],
};
