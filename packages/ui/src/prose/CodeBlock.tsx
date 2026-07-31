import { useEffect, useState, type ReactNode } from "react";
import { cx } from "../lib/cx";

export type CodeBlockProps = {
  code: string;
  lang?: string;
  className?: string;
};

type Highlighter = {
  codeToHtml: (
    code: string,
    opts: { lang: string; theme: string },
  ) => string;
  getLoadedLanguages: () => string[];
};

let highlighterPromise: Promise<Highlighter> | null = null;

/**
 * Core highlighter + explicit langs only (no full/web bundle side-effect chunks).
 * JS regex engine avoids the ~600KB oniguruma wasm download.
 */
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] =
        await Promise.all([
          import("shiki/core"),
          import("shiki/engine/javascript"),
        ]);

      return createHighlighterCore({
        themes: [import("shiki/themes/vitesse-dark.mjs")],
        langs: [
          import("shiki/langs/typescript.mjs"),
          import("shiki/langs/tsx.mjs"),
          import("shiki/langs/javascript.mjs"),
          import("shiki/langs/jsx.mjs"),
          import("shiki/langs/bash.mjs"),
          import("shiki/langs/json.mjs"),
          import("shiki/langs/toml.mjs"),
          import("shiki/langs/yaml.mjs"),
          import("shiki/langs/markdown.mjs"),
          import("shiki/langs/html.mjs"),
          import("shiki/langs/css.mjs"),
          import("shiki/langs/rust.mjs"),
          import("shiki/langs/go.mjs"),
          import("shiki/langs/python.mjs"),
          import("shiki/langs/diff.mjs"),
        ],
        engine: createJavaScriptRegexEngine(),
      }) as Promise<Highlighter>;
    })();
  }
  return highlighterPromise;
}

function normalizeLang(lang: string): string {
  const l = (lang || "text").toLowerCase();
  if (l === "ts") return "typescript";
  if (l === "js") return "javascript";
  if (l === "sh" || l === "shell" || l === "zsh" || l === "bash") return "bash";
  if (l === "md") return "markdown";
  if (l === "yml") return "yaml";
  if (l === "plaintext" || l === "plain" || l === "txt" || l === "text") {
    return "text";
  }
  return l;
}

/**
 * Shiki-highlighted code block (lazy, core + few langs).
 * Falls back to plain <pre> while loading or if highlight fails.
 */
export function CodeBlock({ code, lang = "text", className }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const source = code.replace(/\n$/, "");
    const resolved = normalizeLang(lang);

    // Plain / unknown → skip highlighter
    if (resolved === "text") {
      setHtml(null);
      return;
    }

    (async () => {
      try {
        const highlighter = await getHighlighter();
        const langs = highlighter.getLoadedLanguages();
        if (!langs.includes(resolved)) {
          if (!cancelled) setHtml(null);
          return;
        }

        const out = highlighter.codeToHtml(source, {
          lang: resolved,
          theme: "vitesse-dark",
        });
        if (!cancelled) setHtml(out);
      } catch {
        if (!cancelled) setHtml(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  if (html) {
    return (
      <div
        className={cx("ragab-prose__shiki", className)}
        // shiki output is trusted (our own compile of author content)
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <pre className={cx("ragab-prose__pre", className)}>
      <code className={lang ? `language-${lang}` : undefined}>{code}</code>
    </pre>
  );
}

/** Extract language from className like `language-ts`. */
export function langFromClassName(className?: string): string {
  if (!className) return "text";
  const m = /language-([\w-]+)/.exec(className);
  return m?.[1] ?? "text";
}

export function childrenToText(children: ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (typeof children === "object" && "props" in children) {
    const el = children as { props?: { children?: ReactNode } };
    return childrenToText(el.props?.children);
  }
  return "";
}
