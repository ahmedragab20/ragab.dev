import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const storybookConfig: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      // allow importing workspace packages as source
      server: {
        fs: {
          allow: ["../.."],
        },
      },
    });
  },
};

export default storybookConfig;
