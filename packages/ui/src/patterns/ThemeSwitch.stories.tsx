import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { Badge } from "../primitives/Badge";
import { Line } from "../terminal/Line";
import { Shell } from "../terminal/Shell";
import { Titlebar } from "../terminal/Titlebar";
import { Output } from "../terminal/Output";

function ThemePlayground() {
  const { theme, themes, setTheme, randomTheme, resetTheme } = useTheme();
  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateRows: "1fr auto" }}>
      <Shell fill>
        <Titlebar badge={theme} />
        <Output>
          <Line tone="bright">theme playground</Line>
          <Line tone="dim">{themes.length} palettes · current: {theme}</Line>
          <Line> </Line>
          <Line tone="muted">Use the toolbar paintbrush, or the controls below.</Line>
        </Output>
      </Shell>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 16,
          borderTop: "1px solid var(--border)",
          background: "var(--panel)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        <button type="button" onClick={() => randomTheme()} style={btn}>
          random
        </button>
        <button type="button" onClick={() => resetTheme()} style={btn}>
          reset (rose-pine)
        </button>
        <Badge>{theme}</Badge>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{
            ...btn,
            maxWidth: 220,
            background: "var(--bg)",
            color: "var(--fg)",
          }}
        >
          {themes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const btn: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--fg)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
};

const meta = {
  title: "Patterns/ThemeSwitch",
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Playground: Story = {
  render: () => <ThemePlayground />,
};
