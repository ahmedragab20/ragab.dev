import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "../lib/cx";

export type OutputProps = {
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>;

export function Output({ children, className, ref, ...rest }: OutputProps) {
  return (
    <div
      ref={ref}
      className={cx("ragab-output", className)}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      {...rest}
    >
      {children}
    </div>
  );
}
