import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import remarkGfm from "remark-gfm";
import { cx } from "../lib/cx";
import { terminalMdxComponents } from "./mdx-components";

export type TerminalProseProps = {
  /** Raw MD or MDX source (body without frontmatter). */
  source: string;
  className?: string;
  /** Extra MDX components merged into the terminal map. */
  components?: Record<string, ComponentType<any>>;
};

type MdxModule = {
  default: ComponentType<Record<string, unknown>>;
};

/**
 * Compile & render MD/MDX with terminal-styled components.
 * Custom shortcodes (Callout, YouTube, Embed) are injected via useMDXComponents.
 */
export function TerminalProse({ source, className, components }: TerminalProseProps) {
  const [Content, setContent] = useState<MdxModule["default"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  const map = useMemo(
    () => ({ ...terminalMdxComponents, ...components }),
    [components],
  );

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    setError(null);
    setContent(null);

    (async () => {
      try {
        // Pass components at evaluate-time — required for custom MDX tags like <Callout />
        const mod = (await evaluate(source, {
          ...runtime,
          remarkPlugins: [remarkGfm],
          development: false,
          useMDXComponents: () => map,
        })) as MdxModule;

        if (cancelled) return;
        setContent(() => mod.default);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        if (!cancelled) setPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, map]);

  return (
    <div className={cx("ragab-prose", className)} data-pending={pending || undefined}>
      {pending && !Content ? (
        <div className="ragab-prose__loading">compiling mdx…</div>
      ) : null}
      {error ? (
        <>
          <div className="ragab-prose__error" role="alert">
            mdx error: {error}
          </div>
          <pre className="ragab-prose__fallback">{source}</pre>
        </>
      ) : null}
      {Content ? <Content /> : null}
    </div>
  );
}
