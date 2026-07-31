import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./Text";

const meta = {
  title: "Primitives/Text",
  component: Text,
  args: { children: "guest@ragab.dev:~$" },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = {};

export const Tones: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8, padding: 24 }}>
      {(
        [
          "default",
          "dim",
          "muted",
          "bright",
          "accent",
          "gold",
          "foam",
          "love",
          "ok",
          "err",
        ] as const
      ).map((tone) => (
        <Text key={tone} tone={tone}>
          {tone.padEnd(8)} · the quick brown fox
        </Text>
      ))}
    </div>
  ),
};
