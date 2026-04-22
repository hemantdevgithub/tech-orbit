import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge.tsx";

const meta = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["mint", "cream", "danger", "muted", "success", "warning"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mint: Story = {
  args: { variant: "mint", children: "Mint Badge" },
};

export const Cream: Story = {
  args: { variant: "cream", children: "Cream Badge" },
};

export const Success: Story = {
  args: { variant: "success", children: "Success" },
};

export const Warning: Story = {
  args: { variant: "warning", children: "Warning" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Danger" },
};

export const Muted: Story = {
  args: { variant: "muted", children: "Muted" },
};