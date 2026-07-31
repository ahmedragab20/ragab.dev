import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import type { TextTone } from "../primitives/Text";

export type LineProps = {
  tone?: TextTone;
  animate?: boolean;
  indent?: boolean;
  children?: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Line({
  tone = "default",
  animate = false,
  indent = false,
  className,
  children,
  ...rest
}: LineProps) {
  return (
    <div
      className={cx(
        "ragab-line",
        "ragab-text",
        tone !== "default" && `ragab-text--${tone}`,
        animate && "ragab-line--animate",
        indent && "ragab-line--indent",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
