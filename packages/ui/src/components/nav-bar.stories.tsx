import type { Meta, StoryObj } from "@storybook/react";
import { NavBar } from "./nav-bar.tsx";

const meta = {
  title: "Components/NavBar",
  component: NavBar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof NavBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    logoText: "Techorbit",
    userName: "John Doe",
    links: [
      { label: "Home", href: "/", active: true },
      { label: "Requirements", href: "/requirements" },
      { label: "Candidates", href: "/candidates" },
    ],
    notificationCount: 3,
  },
};

export const NoNotifications: Story = {
  args: {
    logoText: "Techorbit",
    userName: "Jane Smith",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Jobs", href: "/jobs" },
    ],
  },
};