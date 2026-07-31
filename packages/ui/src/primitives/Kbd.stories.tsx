import type { Meta, StoryObj } from "@storybook/react-vite";
import { Kbd } from "./Kbd";

const meta = {
  title: "Primitives/Kbd",
  component: Kbd,
  args: { children: "tab" },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, display: "flex", gap: 8, alignItems: "center" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {};

export const Chord: Story = {
  render: () => (
    <>
      <Kbd>ctrl</Kbd>
      <span style={{ color: "var(--dim)" }}>+</span>
      <Kbd>l</Kbd>
      <span style={{ color: "var(--dim)", marginLeft: 8 }}>clear</span>
    </>
  ),
};
