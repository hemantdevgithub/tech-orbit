import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input.tsx";

const meta = {
  title: "Components/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Email",
    placeholder: "Enter your email",
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Password",
    type: "password",
    helperText: "Must be at least 8 characters",
    placeholder: "Enter password",
  },
};

export const WithError: Story = {
  args: {
    label: "Email",
    defaultValue: "invalid-email",
    error: "Please enter a valid email address",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled Field",
    defaultValue: "Cannot edit this",
    disabled: true,
  },
};