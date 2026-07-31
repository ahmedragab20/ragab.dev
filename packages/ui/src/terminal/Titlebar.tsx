import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { Badge } from "../primitives/Badge";

export type TitlebarProps = {
  path?: ReactNode;
  badge?: ReactNode;
  /** Extra controls (settings, etc.) rendered after the badge. */
  actions?: ReactNode;
  className?: string;
};

export function Titlebar({
  path = (
    <>
      <strong>ahmed</strong>@ragab.dev — zsh
    </>
  ),
  badge,
  actions,
  className,
}: TitlebarProps) {
  return (
    <div className={cx("ragab-titlebar", className)}>
      <div className="ragab-titlebar__path">{path}</div>
      <div className="ragab-titlebar__end">
        {badge != null && badge !== false ? <Badge>{badge}</Badge> : null}
        {actions}
      </div>
    </div>
  );
}
