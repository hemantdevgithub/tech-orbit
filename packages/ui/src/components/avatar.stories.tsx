import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./avatar.tsx";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: { name: "John Doe", size: "sm" },
};

export const Medium: Story = {
  args: { name: "John Doe", size: "md" },
};

export const Large: Story = {
  args: { name: "John Doe", size: "lg" },
};

export const WithImage: Story = {
  args: {
    name: "John Doe",
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
    size: "md",
  },
};

export const SingleName: Story = {
  args: { name: "Alice", size: "md" },
};