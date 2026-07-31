import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  APP_NAME: string;
  APP_ENV: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      // local Astro + production site (+ Cloudflare preview hosts)
      if (!origin) return origin;
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.endsWith("ragab.dev") ||
        origin.endsWith(".pages.dev") ||
        origin.endsWith(".workers.dev")
      ) {
        return origin;
      }
      return "";
    },
    allowMethods: ["GET", "OPTIONS"],
  }),
);

app.get("/", (c) =>
  c.json({
    service: c.env.APP_NAME ?? "ragab.dev",
    message: "api",
    docs: ["/health", "/v1/meta"],
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    env: c.env.APP_ENV ?? "unknown",
    ts: new Date().toISOString(),
  }),
);

/** Stable metadata for the site shell (version, capabilities). */
app.get("/v1/meta", (c) =>
  c.json({
    name: c.env.APP_NAME ?? "ragab.dev",
    version: "0.0.1",
    surface: "classic-terminal",
    content: {
      source: "mdx",
      types: ["blog", "announcement"],
    },
    themes: {
      default: "rose-pine",
      storageKey: "ragab.dev.theme",
    },
  }),
);

export default app;
