import type { Meta, StoryObj } from "@storybook/react";
import { PageHeader } from "./page-header.tsx";
import { Button } from "./button.tsx";

function BriefcaseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

const meta = {
  title: "Components/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <BriefcaseIcon />,
    title: "Dashboard",
    subtitle: "Welcome back, Hemant",
  },
};

export const WithActions: Story = {
  args: {
    icon: <BriefcaseIcon />,
    title: "Dashboard",
    subtitle: "Welcome back, Hemant",
    actions: <Button variant="primary">New Requirement</Button>,
  },
};

export const WithoutIcon: Story = {
  args: {
    title: "Settings",
    subtitle: "Manage your account preferences",
  },
};