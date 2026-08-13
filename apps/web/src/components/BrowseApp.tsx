import { useEffect, useRef, type KeyboardEvent } from "react";
import { Badge, useTheme } from "@ragab/ui";
import { themeNames } from "@ragab/themes";
import { site } from "../data/site";
import { focusEl } from "../lib/a11y";
import { externalHref } from "../lib/uiMode";
import type { ContentItem } from "./TerminalApp";

export type BrowseAppProps = {
  blogs: ContentItem[];
  onOpenTerminal: () => void;
};

function NewTabHint() {
  return <span className="sr-only"> (opens in new tab)</span>;
}

function onThemeKeyDown(e: KeyboardEvent<HTMLDivElement>) {
  const options = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')];
  if (!options.length) return;
  const current = document.activeElement as HTMLElement | null;
  const idx = current ? options.indexOf(current as HTMLButtonElement) : -1;
  if (idx < 0) return;

  let next = -1;
  if (e.key === "ArrowDown") {
    next = Math.min(idx + 1, options.length - 1);
  } else if (e.key === "ArrowUp") {
    next = Math.max(idx - 1, 0);
  } else if (e.key === "Home") {
    next = 0;
  } else if (e.key === "End") {
    next = options.length - 1;
  } else {
    return;
  }
  e.preventDefault();
  options[next]?.focus();
}

export function BrowseApp({ blogs, onOpenTerminal }: BrowseAppProps) {
  const { theme, activeTheme, setTheme } = useTheme();
  const nameRef = useRef<HTMLHeadingElement>(null);
  const hasWork = Boolean(site.experience?.length);

  useEffect(() => {
    focusEl(nameRef.current);
  }, []);

  return (
    <div className="ragab-browse" id="browse">
      <div className="ragab-browse__inner">
        <header className="ragab-browse__header">
          <div className="ragab-browse__brand">
            <strong>ragab.dev</strong>
            <span aria-hidden="true"> · browse</span>
          </div>
          <div className="ragab-browse__end">
            <Badge aria-label={`Theme: ${activeTheme}`}>{activeTheme}</Badge>
            <button
              type="button"
              className="ragab-settings-btn"
              aria-label="Open terminal mode"
              onClick={onOpenTerminal}
            >
              terminal
            </button>
          </div>
        </header>

        <nav className="ragab-browse__toc" aria-label="On this page">
          <a href="#browse-name">about</a>
          <a href="#browse-how">help</a>
          {hasWork ? <a href="#browse-work">work</a> : null}
          <a href="#browse-writing">writing</a>
          <a href="#browse-projects">projects</a>
          <a href="#browse-tools">tooling</a>
          <a href="#browse-contact">contact</a>
          <a href="#browse-theme">theme</a>
        </nav>

        <section className="ragab-browse__hero" aria-labelledby="browse-name">
          <h1 id="browse-name" className="ragab-browse__name" ref={nameRef}>
            {site.name}
          </h1>
          <p className="ragab-browse__meta">
            {site.role} · {site.location} · ● {site.status}
          </p>
          <ul className="ragab-browse__bio">
            {site.bio.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="ragab-browse__section" aria-labelledby="browse-how">
          <h2 id="browse-how" className="ragab-browse__section-title">
            How to use
          </h2>
          <p className="ragab-browse__empty">
            Jump sections with the on-this-page links. Switch to the interactive shell with
            terminal. Pick a palette in the theme list — use arrow keys when a theme option is
            focused.
          </p>
        </section>

        {hasWork ? (
          <section className="ragab-browse__section" aria-labelledby="browse-work">
            <h2 id="browse-work" className="ragab-browse__section-title">
              work
            </h2>
            <ul className="ragab-browse__list">
              {site.experience!.map((e) => (
                <li key={`${e.org}-${e.role}`}>
                  <div className="ragab-browse__item ragab-browse__static">
                    <span className="ragab-browse__item-title">
                      {e.role} @ {e.org}
                    </span>
                    <span className="ragab-browse__item-meta">
                      {[e.period, e.note].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="ragab-browse__section" aria-labelledby="browse-writing">
          <h2 id="browse-writing" className="ragab-browse__section-title">
            writing
          </h2>
          {blogs.length === 0 ? (
            <p className="ragab-browse__empty">no posts yet</p>
          ) : (
            <ul className="ragab-browse__list">
              {blogs.map((post) => (
                <li key={post.slug}>
                  <a className="ragab-browse__item" href={`/blog/${post.slug}`}>
                    <span className="ragab-browse__item-title">{post.title}</span>
                    <span className="ragab-browse__item-meta">
                      {post.date}
                      {post.slug ? ` · ${post.slug}` : ""}
                    </span>
                    {post.excerpt ? (
                      <span className="ragab-browse__item-desc">{post.excerpt}</span>
                    ) : null}
                    {post.tags?.length ? (
                      <span className="ragab-browse__item-tags">#{post.tags.join(" #")}</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ragab-browse__section" aria-labelledby="browse-projects">
          <h2 id="browse-projects" className="ragab-browse__section-title">
            projects
          </h2>
          <ul className="ragab-browse__list">
            {site.projects.map((p) => {
              const body = (
                <>
                  <span className="ragab-browse__item-title">{p.name}</span>
                  <span className="ragab-browse__item-desc">{p.description}</span>
                  {p.tech?.length ? (
                    <span className="ragab-browse__item-tags">{p.tech.join(" · ")}</span>
                  ) : null}
                </>
              );
              return (
                <li key={p.name}>
                  {p.url ? (
                    <a
                      className="ragab-browse__item"
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {body}
                      <NewTabHint />
                    </a>
                  ) : (
                    <div className="ragab-browse__item ragab-browse__static">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="ragab-browse__section" aria-labelledby="browse-tools">
          <h2 id="browse-tools" className="ragab-browse__section-title">
            tooling
          </h2>
          <ul className="ragab-browse__list">
            {(site.tools ?? []).map((t) => {
              const body = (
                <>
                  <span className="ragab-browse__item-title">{t.name}</span>
                  <span className="ragab-browse__item-meta">
                    {t.category} · {t.tagline}
                  </span>
                  {t.description ? (
                    <span className="ragab-browse__item-desc">{t.description}</span>
                  ) : null}
                  {t.tech?.length ? (
                    <span className="ragab-browse__item-tags">{t.tech.join(" · ")}</span>
                  ) : null}
                  {t.note?.length
                    ? t.note.map((n) => (
                        <span key={n} className="ragab-browse__item-desc">
                          {n}
                        </span>
                      ))
                    : null}
                </>
              );
              return (
                <li key={t.name}>
                  {t.url ? (
                    <a
                      className="ragab-browse__item"
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {body}
                      <NewTabHint />
                    </a>
                  ) : (
                    <div className="ragab-browse__item ragab-browse__static">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="ragab-browse__section" aria-labelledby="browse-contact">
          <h2 id="browse-contact" className="ragab-browse__section-title">
            contact
          </h2>
          <ul className="ragab-browse__list">
            <li>
              <a className="ragab-browse__item" href={`mailto:${site.contact.email}`}>
                <span className="ragab-browse__item-title">email</span>
                <span className="ragab-browse__item-meta">{site.contact.email}</span>
              </a>
            </li>
            {(
              [
                ["github", site.contact.github],
                ["twitter", site.contact.twitter],
                ["linkedin", site.contact.linkedin],
              ] as const
            ).map(([key, value]) => {
              if (!value) return null;
              const label = key === "twitter" ? "x" : key;
              return (
                <li key={key}>
                  <a
                    className="ragab-browse__item"
                    href={externalHref(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="ragab-browse__item-title">{label}</span>
                    <span className="ragab-browse__item-meta">{value}</span>
                    <NewTabHint />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="ragab-browse__section" aria-labelledby="browse-theme">
          <h2 id="browse-theme" className="ragab-browse__section-title">
            theme · {theme}
          </h2>
          <div
            className="ragab-browse__themes"
            role="listbox"
            aria-label="Theme palette"
            onKeyDown={onThemeKeyDown}
          >
            {themeNames.map((name) => (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={name === theme}
                className={`ragab-browse__theme${
                  name === theme ? " ragab-browse__theme--active" : ""
                }`}
                onClick={() => setTheme(name)}
              >
                {name === theme ? `● ${name}` : `○ ${name}`}
              </button>
            ))}
          </div>
        </section>

        <div className="ragab-browse__cta">
          <button
            type="button"
            className="ragab-browse__cta-btn"
            aria-label="Open terminal mode"
            onClick={onOpenTerminal}
          >
            open terminal
          </button>
        </div>
      </div>
    </div>
  );
}
