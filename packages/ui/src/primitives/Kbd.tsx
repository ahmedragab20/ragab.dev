import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export type KbdProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>;

export function Kbd({ children, className, ...rest }: KbdProps) {
  return (
    <kbd className={cx("ragab-kbd", className)} {...rest}>
      {children}
    </kbd>
  );
}
