import { cx } from "../lib/cx";

export type CursorProps = {
  className?: string;
};

export function Cursor({ className }: CursorProps) {
  return <span className={cx("ragab-cursor", className)} aria-hidden="true" />;
}
