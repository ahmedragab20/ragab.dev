import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { Kbd } from "../primitives/Kbd";

export type HintProps = {
  commands?: string[];
  /** When set, command chips are clickable buttons. */
  onRun?: (command: string) => void;
  children?: ReactNode;
  className?: string;
};

export function Hint({
  commands = ["help", "blogs", "announcements", "contact", "theme list"],
  onRun,
  children,
  className,
}: HintProps) {
  return (
    <div
      className={cx("ragab-hint", className)}
      role="group"
      aria-label="Command hints"
    >
      {children ?? (
        <>
          {commands.map((c) =>
            onRun ? (
              <button
                key={c}
                type="button"
                className="ragab-hint-cmd"
                onClick={(e) => {
                  e.stopPropagation();
                  onRun(c);
                }}
              >
                {c}
              </button>
            ) : (
              <Kbd key={c}>{c}</Kbd>
            ),
          )}
          <span className="ragab-hint-sep">·</span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>history</span>
          <span className="ragab-hint-sep">·</span>
          <Kbd>tab</Kbd>
          <span>complete</span>
          {onRun ? (
            <>
              <span className="ragab-hint-sep">·</span>
              <span className="ragab-hint-note">click chips to run</span>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
