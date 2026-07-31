import { useEffect, useState, type ReactNode } from "react";
import { codeToHtml } from "shiki";
import { cx } from "../lib/cx";

export type CodeBlockProps = {
  code: string;
  lang?: string;
  className?: string;
};

/**
 * Shiki-highlighted code block using CSS variables-friendly themes.
 * Falls back to plain <pre> if highlight fails.
 */
export function CodeBlock({ code, lang = "text", className }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out = await codeToHtml(code.replace(/\n$/, ""), {
          lang: lang || "text",
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
