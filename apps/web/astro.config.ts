import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://ragab.dev",
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    imageService: "compile",
  }),
  integrations: [react(), mdx(), sitemap()],
  vite: {
    resolve: {
      // React 19's server.browser build needs MessageChannel (unavailable on workerd).
      // Force the edge renderer in production so Pages Functions can boot.
      alias: import.meta.env.PROD ? { "react-dom/server": "react-dom/server.edge" } : undefined,
    },
    ssr: {
      noExternal: ["@ragab/ui", "@ragab/themes", "@ragab/content-schema"],
    },
    build: {
      // Keep React + shell in the critical path; prose/shiki stay async
      cssCodeSplit: true,
      modulePreload: {
        resolveDependencies: (_filename, deps) =>
          // Avoid preloading every shiki lang/theme chunk
          deps.filter(
            (d) => !d.includes("shiki") && !/\/(langs|themes)\//.test(d) && !d.includes("mdx"),
          ),
      },
    },
  },
});
