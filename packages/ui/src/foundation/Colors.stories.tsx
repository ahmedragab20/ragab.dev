import { TOKEN_KEYS, getTheme, themeNames, type ThemeName } from "@ragab/themes";
import type { Meta, StoryObj } from "@storybook/react-vite";

function ColorGrid({ theme }: { theme: ThemeName }) {
  const tokens = getTheme(theme);
  return (
    <div style={{ padding: 24, fontFamily: "var(--font-mono)", fontSize: 13 }}>
      <div style={{ marginBottom: 16, color: "var(--muted)" }}>
        palette · <strong style={{ color: "var(--bright)" }}>{theme}</strong>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        {TOKEN_KEYS.filter((k) => !["scan", "vignette"].includes(k)).map((key) => (
          <div
            key={key}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--panel)",
            }}
          >
            <div style={{ height: 56, background: tokens[key] }} />
            <div style={{ padding: "8px 10px" }}>
              <div style={{ color: "var(--fg)" }}>--{key}</div>
              <div style={{ color: "var(--dim)", fontSize: 11 }}>{tokens[key]}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, color: "var(--dim)", fontSize: 12 }}>
        {themeNames.length} themes · switch via toolbar paintbrush
      </div>
    </div>
  );
}

const meta = {
  title: "Foundation/Colors",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Tokens: Story = {
  render: (_args, { globals }) => (
    <ColorGrid theme={(globals.theme as ThemeName) || "rose-pine"} />
  ),
};
