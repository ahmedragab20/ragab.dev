import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "../lib/cx";
import { Cursor } from "./Cursor";
import { Prompt, type PromptProps } from "./Prompt";

export type InputToken = {
  kind: "cmd" | "arg" | "flag" | "unknown" | "space";
  text: string;
};

export type PromptRowProps = {
  prompt?: PromptProps;
  inputProps?: InputHTMLAttributes<HTMLInputElement> & {
    ref?: Ref<HTMLInputElement>;
  };
  /** Shown as ghost text after the caret (auto-suggestion). */
  suggestion?: string;
  /** Click / accept the ghost suggestion. */
  onAcceptSuggestion?: () => void;
  /**
   * Pre-tokenized input for shell-style highlighting.
   * When omitted, mirror renders plain text.
   */
  tokens?: InputToken[];
  /** Vim mode indicator: insert | normal */
  vimMode?: "insert" | "normal" | null;
  showCursor?: boolean;
  trailing?: ReactNode;
  className?: string;
};

/**
 * Prompt + input with cursor after typed text.
 * Mirror supports shell-style command/arg highlighting.
 */
export function PromptRow({
  prompt,
  inputProps,
  suggestion,
  onAcceptSuggestion,
  tokens,
  vimMode = null,
  showCursor = true,
  trailing,
  className,
}: PromptRowProps) {
  const { className: inputClass, ref, value, ...restInput } = inputProps ?? {};
  const text = typeof value === "string" ? value : value == null ? "" : String(value);

  return (
    <div className={cx("ragab-prompt-row", className)}>
      {vimMode ? (
        <button
          type="button"
          className={cx("ragab-vim-badge", vimMode === "normal" && "ragab-vim-badge--normal")}
          aria-label={
            vimMode === "normal"
              ? "Vim normal mode — activate for insert"
              : "Vim insert mode — activate for normal"
          }
          title={
            vimMode === "normal" ? "vim normal — click for insert" : "vim insert — click for normal"
          }
          onClick={(e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent("ragab:vim-toggle", { bubbles: true }));
          }}
        >
          <span aria-hidden="true">{vimMode === "normal" ? "N" : "I"}</span>
        </button>
      ) : null}
      <Prompt {...prompt} />
      <div className="ragab-prompt-field">
        <span className="ragab-input-mirror" aria-hidden="true">
          {tokens && tokens.length > 0
            ? tokens.map((t, i) => (
                <span
                  key={`${i}-${t.kind}-${t.text}`}
                  className={
                    t.kind === "space" ? undefined : `ragab-input-tok ragab-input-tok--${t.kind}`
                  }
                >
                  {t.text}
                </span>
              ))
            : text}
        </span>
        {showCursor ? <Cursor /> : null}
        {suggestion ? (
          <button
            type="button"
            className="ragab-suggest"
            tabIndex={-1}
            title="Click or → to accept"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptSuggestion?.();
            }}
          >
            {suggestion}
          </button>
        ) : null}
        <input
          ref={ref}
          className={cx("ragab-input", inputClass)}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          value={value}
          {...restInput}
          aria-label={restInput["aria-label"] ?? "Command input"}
        />
      </div>
      {suggestion && onAcceptSuggestion ? (
        <button
          type="button"
          className="ragab-suggest-accept"
          onClick={(e) => {
            e.stopPropagation();
            onAcceptSuggestion();
          }}
          title="Accept suggestion"
        >
          tab
        </button>
      ) : null}
      {trailing}
    </div>
  );
}
