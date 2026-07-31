import type { Meta, StoryObj } from "@storybook/react-vite";
import { Line } from "./Line";

const meta = {
  title: "Terminal/Line",
  component: Line,
  args: { children: "hello from the shell", animate: true },
  decorators: [
    (Story) => (
      <div style={{ padding: 24 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Line>;

export default meta;
type Story = StoryObj<typeof Line>;

export const Default: Story = {};

export const Stack: Story = {
  render: () => (
    <>
      <Line tone="bright" animate>
        blog · 3 posts
      </Line>
      <Line tone="foam" animate>
        2026-07-20 agent-native-sites
      </Line>
      <Line tone="dim" animate>
        Portfolios are becoming workspaces.
      </Line>
      <Line tone="err" animate>
        command not found: foo
      </Line>
    </>
  ),
};
