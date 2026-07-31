import type { Meta, StoryObj } from "@storybook/react-vite";
import { TerminalProse } from "./TerminalProse";

const sample = `
## Hello from MDX

This is **terminal-styled** prose with *emphasis*, \`inline code\`, and a [link](https://ragab.dev).

### List

- one
- two
- three

### Code

\`\`\`ts
export function greet(name: string) {
  return \`hey \${name}\`;
}
\`\`\`

### Callout

<Callout type="tip">
Shortcodes work too — YouTube, Embed, Callout.
</Callout>

### Image

![placeholder](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80)

### Embed

<YouTube id="dQw4w9WgXcQ" title="demo" />
`;

const meta = {
  title: "Prose/TerminalProse",
  component: TerminalProse,
  decorators: [
    (Story) => (
      <div style={{ padding: 24, maxWidth: 720, background: "var(--bg)", minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TerminalProse>;

export default meta;
type Story = StoryObj<typeof TerminalProse>;

export const KitchenSink: Story = {
  args: { source: sample },
};
