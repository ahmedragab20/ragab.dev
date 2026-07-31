import { cx } from "../lib/cx";

export type DotVariant = "r" | "y" | "g" | "idle";

export type DotProps = {
  variant?: DotVariant;
  className?: string;
  label?: string;
};

export function Dot({ variant = "idle", className, label }: DotProps) {
  return (
    <span
      className={cx("ragab-dot", `ragab-dot--${variant}`, className)}
      role={label ? "img" : "presentation"}
      aria-label={label}
    />
  );
}
