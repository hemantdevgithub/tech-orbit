import type { Preview } from "@storybook/react";
import "../styles.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "cream",
      values: [
        { name: "cream", value: "#FAF4EA" },
        { name: "surface", value: "#FFFFFF" },
        { name: "sage", value: "#7A9080" },
      ],
    },
  },
};

export default preview;