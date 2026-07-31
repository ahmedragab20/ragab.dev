import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
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
  integrations: [react(), mdx()],
  vite: {
    ssr: {
      noExternal: [
        "@ragab/ui",
        "@ragab/themes",
        "@ragab/content-schema",
      ],
    },
  },
});
