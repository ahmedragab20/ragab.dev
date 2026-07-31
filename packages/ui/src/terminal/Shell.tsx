import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export type ShellProps = {
  children: ReactNode;
  fill?: boolean;
  /**
   * @deprecated Gradients / CRT grain are disallowed. Prop ignored.
   */
  grain?: boolean;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Shell({
  children,
  fill = false,
  grain: _grain = false,
  className,
  ...rest
}: ShellProps) {
  void _grain;
  return (
    <div
      className={cx("ragab-shell", fill && "ragab-shell--fill", className)}
      role="region"
      aria-label="Terminal"
      {...rest}
    >
      <div className="ragab-shell__inner">{children}</div>
    </div>
  );
}
