import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTheme } from "../theme/ThemeProvider";
import { ThemeProvider } from "../theme/ThemeProvider";
import { Hint } from "./Hint";
import { Line } from "./Line";
import { Output } from "./Output";
import { PromptRow } from "./PromptRow";
import { Shell } from "./Shell";
import { Titlebar } from "./Titlebar";

function TerminalPreview() {
  const { theme } = useTheme();
  return (
    <div style={{ height: "100vh" }}>
      <Shell fill>
        <Titlebar badge={theme} />
        <Output>
          <Line tone="bright" animate>
            ragab.dev — classic terminal
          </Line>
          <Line tone="dim" animate>
            theme: {theme} · type help to begin
          </Line>
          <Line animate> </Line>
          <Line tone="muted" animate>
            blogs · announcements · contact · theme list
          </Line>
          <Line animate> </Line>
        </Output>
        <PromptRow inputProps={{ defaultValue: "", readOnly: true, placeholder: "help" }} />
        <Hint />
      </Shell>
    </div>
  );
}

const meta = {
  title: "Terminal/Shell",
  component: Shell,
  decorators: [
    (Story) => (
      <ThemeProvider persist={false}>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof Shell>;

export const Classic: Story = {
  render: () => <TerminalPreview />,
};
