import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export type TextTone =
  | "default"
  | "dim"
  | "muted"
  | "bright"
  | "accent"
  | "gold"
  | "foam"
  | "love"
  | "ok"
  | "err";

export type TextSize = "xs" | "sm" | "base" | "md";

export type TextProps = {
  as?: "span" | "p" | "div" | "label";
  tone?: TextTone;
  size?: TextSize;
  children?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "color">;

export function Text({
  as: Tag = "span",
  tone = "default",
  size = "base",
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={cx(
        "ragab-text",
        `ragab-text--${size}`,
        tone !== "default" && `ragab-text--${tone}`,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
