import { useEffect, useRef } from "react";
import { cx } from "../lib/cx";

export type CompletionItem = {
  /** Text inserted / run when selected */
  value: string;
  /** Primary label */
  label: string;
  /** Secondary hint (slug, description) */
  detail?: string;
  /** Color accent key */
  tone?: "default" | "accent" | "gold" | "foam" | "love" | "ok" | "bright" | "muted";
  /** If true, selecting runs the value as a command immediately */
  run?: boolean;
};

export type CompletionMenuProps = {
  open: boolean;
  title?: string;
  items: CompletionItem[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onSelect: (item: CompletionItem) => void;
  onClose: () => void;
  className?: string;
};

export function CompletionMenu({
  open,
  title = "choices",
  items,
  activeIndex,
  onActiveChange,
  onSelect,
  onClose,
  className,
}: CompletionMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open || items.length === 0) return null;

  return (
    <div
      className={cx("ragab-completion", className)}
      role="listbox"
      aria-label={title}
      ref={listRef}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ragab-completion__head">
        <span className="ragab-completion__title">{title}</span>
        <span className="ragab-completion__meta">
          {items.length} · ↑↓ enter esc
        </span>
        <button
          type="button"
          className="ragab-completion__close"
          onClick={onClose}
          aria-label="Close"
        >
          [x]
        </button>
      </div>
      <div className="ragab-completion__list">
        {items.map((item, i) => (
          <button
            key={`${item.value}-${i}`}
            ref={i === activeIndex ? activeRef : undefined}
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            className={cx(
              "ragab-completion__item",
              i === activeIndex && "ragab-completion__item--active",
              item.tone && item.tone !== "default" && `ragab-completion__item--${item.tone}`,
            )}
            onMouseEnter={() => onActiveChange(i)}
            onClick={() => onSelect(item)}
          >
            <span className="ragab-completion__label">{item.label}</span>
            {item.detail ? (
              <span className="ragab-completion__detail">{item.detail}</span>
            ) : null}
            {item.run ? (
              <span className="ragab-completion__run">↵</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
