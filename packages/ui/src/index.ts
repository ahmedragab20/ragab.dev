export { Badge, type BadgeProps } from "./primitives/Badge";
export { Dot, type DotProps, type DotVariant } from "./primitives/Dot";
export { Kbd, type KbdProps } from "./primitives/Kbd";
export {
  Text,
  type TextProps,
  type TextSize,
  type TextTone,
} from "./primitives/Text";

export { Cursor, type CursorProps } from "./terminal/Cursor";
export { Hint, type HintProps } from "./terminal/Hint";
export { Line, type LineProps } from "./terminal/Line";
export { OutputText, type OutputTextProps } from "./terminal/OutputText";
export { Output, type OutputProps } from "./terminal/Output";
export { Prompt, type PromptProps } from "./terminal/Prompt";
export {
  PromptRow,
  type PromptRowProps,
  type InputToken,
} from "./terminal/PromptRow";
export { Shell, type ShellProps } from "./terminal/Shell";
export { Titlebar, type TitlebarProps } from "./terminal/Titlebar";
export {
  CompletionMenu,
  type CompletionItem,
  type CompletionMenuProps,
} from "./terminal/CompletionMenu";

export {
  ThemeProvider,
  useTheme,
  type ThemeProviderProps,
} from "./theme/ThemeProvider";

export { TerminalProse, type TerminalProseProps } from "./prose/TerminalProse";
export { CodeBlock, type CodeBlockProps } from "./prose/CodeBlock";
export {
  terminalMdxComponents,
  YouTube,
  Embed,
  Callout,
  type YouTubeProps,
  type EmbedProps,
  type CalloutProps,
} from "./prose/mdx-components";

export {
  ToastProvider,
  useToast,
  type ToastItem,
  type ToastProviderProps,
} from "./toast/Toast";

export {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  persistSettings,
  type ShellSettings,
} from "./settings/settings";

export { cx } from "./lib/cx";
