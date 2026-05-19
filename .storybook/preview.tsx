import type { Preview, Decorator } from "@storybook/react";
import React from "react";
import "../src/index.css";

const ThemeDecorator: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "light";
  return (
    <div className={theme} style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme for components",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
    layout: "centered",
  },
  decorators: [ThemeDecorator],
};

export default preview;
