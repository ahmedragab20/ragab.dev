import { cx } from "../lib/cx";

export type PromptProps = {
  user?: string;
  host?: string;
  dir?: string;
  className?: string;
};

export function Prompt({
  user = "guest",
  host = "ragab.dev",
  dir = "~",
  className,
}: PromptProps) {
  return (
    <span className={cx("ragab-prompt", className)} aria-hidden="true">
      <span className="ragab-prompt__user">{user}</span>
      <span className="ragab-prompt__at">@</span>
      <span className="ragab-prompt__host">{host}</span>
      <span className="ragab-prompt__sep">:</span>
      <span className="ragab-prompt__dir">{dir}</span>
      <span className="ragab-prompt__sep">$&nbsp;</span>
    </span>
  );
}
