import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export type BadgeProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>;

export function Badge({ children, className, ...rest }: BadgeProps) {
  return (
    <span className={cx("ragab-badge", className)} {...rest}>
      {children}
    </span>
  );
}
