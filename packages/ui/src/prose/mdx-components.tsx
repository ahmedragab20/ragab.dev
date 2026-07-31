import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import { cx } from "../lib/cx";
import { CodeBlock, childrenToText, langFromClassName } from "./CodeBlock";

function isExternal(href?: string) {
  return !!href && /^(https?:)?\/\//.test(href);
}

export function ProseP({ children, className, ...rest }: ComponentPropsWithoutRef<"p">) {
  return (
    <p className={cx("ragab-prose__p", className)} {...rest}>
      {children}
    </p>
  );
}

export function ProseH1({ children, className, ...rest }: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1 className={cx("ragab-prose__h", "ragab-prose__h1", className)} {...rest}>
      <span className="ragab-prose__hash">#</span> {children}
    </h1>
  );
}

export function ProseH2({ children, className, ...rest }: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2 className={cx("ragab-prose__h", "ragab-prose__h2", className)} {...rest}>
      <span className="ragab-prose__hash">##</span> {children}
    </h2>
  );
}

export function ProseH3({ children, className, ...rest }: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3 className={cx("ragab-prose__h", "ragab-prose__h3", className)} {...rest}>
      <span className="ragab-prose__hash">###</span> {children}
    </h3>
  );
}

export function ProseA({ href, children, className, ...rest }: ComponentPropsWithoutRef<"a">) {
  const external = isExternal(href);
  return (
    <a
      href={href}
      className={cx("ragab-prose__a", className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    >
      {children}
      {external ? <span className="ragab-prose__ext">↗</span> : null}
    </a>
  );
}

export function ProseUl({ children, className, ...rest }: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul className={cx("ragab-prose__ul", className)} {...rest}>
      {children}
    </ul>
  );
}

export function ProseOl({ children, className, ...rest }: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol className={cx("ragab-prose__ol", className)} {...rest}>
      {children}
    </ol>
  );
}

export function ProseLi({ children, className, ...rest }: ComponentPropsWithoutRef<"li">) {
  return (
    <li className={cx("ragab-prose__li", className)} {...rest}>
      {children}
    </li>
  );
}

export function ProseBlockquote({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote className={cx("ragab-prose__bq", className)} {...rest}>
      {children}
    </blockquote>
  );
}

export function ProseHr({ className, ...rest }: ComponentPropsWithoutRef<"hr">) {
  return <hr className={cx("ragab-prose__hr", className)} {...rest} />;
}

export function ProseStrong({ children, className, ...rest }: ComponentPropsWithoutRef<"strong">) {
  return (
    <strong className={cx("ragab-prose__strong", className)} {...rest}>
      {children}
    </strong>
  );
}

export function ProseEm({ children, className, ...rest }: ComponentPropsWithoutRef<"em">) {
  return (
    <em className={cx("ragab-prose__em", className)} {...rest}>
      {children}
    </em>
  );
}

export function ProseImg({
  src,
  alt,
  className,
  ...rest
}: ComponentPropsWithoutRef<"img">) {
  if (!src) return null;
  return (
    <figure className="ragab-prose__figure">
      <img src={src} alt={alt ?? ""} className={cx("ragab-prose__img", className)} loading="lazy" {...rest} />
      {alt ? <figcaption className="ragab-prose__caption">{alt}</figcaption> : null}
    </figure>
  );
}

export function ProseCode({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"code">) {
  const isBlock = typeof className === "string" && className.includes("language-");
  if (isBlock) {
    // Fenced blocks are handled by ProsePre + CodeBlock
    return (
      <code className={cx("ragab-prose__code-block", className)} {...rest}>
        {children}
      </code>
    );
  }
  return (
    <code className={cx("ragab-prose__code-inline", className)} {...rest}>
      {children}
    </code>
  );
}

export function ProsePre({ children, className, ...rest }: ComponentPropsWithoutRef<"pre">) {
  const child = (Array.isArray(children) ? children[0] : children) as ReactElement<{
    className?: string;
    children?: ReactNode;
  }> | null;

  if (isValidElement(child) && child.props?.className) {
    const lang = langFromClassName(child.props.className);
    if (lang !== "text" || /language-/.test(child.props.className)) {
      return (
        <CodeBlock
          code={childrenToText(child.props.children)}
          lang={lang}
          className={className}
        />
      );
    }
  }

  return (
    <pre className={cx("ragab-prose__pre", className)} {...rest}>
      {children}
    </pre>
  );
}

export function ProseTable({ children, className, ...rest }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="ragab-prose__table-wrap">
      <table className={cx("ragab-prose__table", className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

/* ── MDX shortcodes (use in .mdx files) ── */

export type YouTubeProps = {
  id: string;
  title?: string;
};

export function YouTube({ id, title = "YouTube video" }: YouTubeProps) {
  return (
    <div className="ragab-prose__embed">
      <div className="ragab-prose__embed-label">youtube · {id}</div>
      <div className="ragab-prose__embed-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}

export type EmbedProps = {
  src: string;
  title?: string;
  aspect?: "16/9" | "4/3" | "1/1";
};

export function Embed({ src, title = "Embed", aspect = "16/9" }: EmbedProps) {
  return (
    <div className="ragab-prose__embed">
      <div className="ragab-prose__embed-label">embed · {src}</div>
      <div className="ragab-prose__embed-frame" style={{ aspectRatio: aspect }}>
        <iframe src={src} title={title} loading="lazy" allowFullScreen />
      </div>
    </div>
  );
}

export type CalloutProps = {
  type?: "note" | "warn" | "tip";
  children?: ReactNode;
};

export function Callout({ type = "note", children }: CalloutProps) {
  return (
    <aside className={cx("ragab-prose__callout", `ragab-prose__callout--${type}`)} data-type={type}>
      <div className="ragab-prose__callout-tag">{type}</div>
      <div className="ragab-prose__callout-body">{children}</div>
    </aside>
  );
}

/** Default MDX/Markdown component map for terminal prose. */
export const terminalMdxComponents = {
  p: ProseP,
  h1: ProseH1,
  h2: ProseH2,
  h3: ProseH3,
  a: ProseA,
  ul: ProseUl,
  ol: ProseOl,
  li: ProseLi,
  blockquote: ProseBlockquote,
  hr: ProseHr,
  strong: ProseStrong,
  em: ProseEm,
  img: ProseImg,
  code: ProseCode,
  pre: ProsePre,
  table: ProseTable,
  YouTube,
  Embed,
  Callout,
};
