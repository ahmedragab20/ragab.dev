import type { Preview } from "@storybook/react-vite";
import { applyTheme, DEFAULT_THEME, themeNames, type ThemeName } from "@ragab/themes";
import "../src/styles.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: ["Foundation", "Primitives", "Terminal", "Patterns"],
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Terminal color theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: themeNames.map((name) => ({ value: name, title: name })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: DEFAULT_THEME,
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as ThemeName) || DEFAULT_THEME;
      if (typeof document !== "undefined") {
        applyTheme(theme);
        document.body.style.margin = "0";
        document.body.style.minHeight = "100vh";
        document.body.style.background = "var(--bg)";
        document.body.style.color = "var(--fg)";
        document.body.style.fontFamily = "var(--font-mono)";
      }
      return Story();
    },
  ],
};

export default preview;
