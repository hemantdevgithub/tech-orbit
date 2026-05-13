import type { Meta, StoryObj } from "@storybook/react";
import { ProgressCard } from "./progress-card.tsx";

function MailIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

const meta = {
  title: "Components/ProgressCard",
  component: ProgressCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ProgressCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PartialProgress: Story = {
  args: {
    title: "Onboarding Progress",
    totalSteps: 4,
    completedSteps: 2,
    steps: [
      { label: "Email verified", icon: <MailIcon />, status: "complete" },
      { label: "ID verification", icon: <ShieldIcon />, status: "complete" },
      { label: "Resume uploaded", icon: <FileTextIcon />, status: "pending" },
      { label: "Profile complete", icon: <UserIcon />, status: "pending" },
    ],
  },
};

export const NoProgress: Story = {
  args: {
    title: "Onboarding Progress",
    totalSteps: 4,
    completedSteps: 0,
    steps: [
      { label: "Email verified", icon: <MailIcon />, status: "pending" },
      { label: "ID verification", icon: <ShieldIcon />, status: "pending" },
      { label: "Resume uploaded", icon: <FileTextIcon />, status: "pending" },
      { label: "Profile complete", icon: <UserIcon />, status: "pending" },
    ],
  },
};

export const Complete: Story = {
  args: {
    title: "Onboarding Progress",
    totalSteps: 4,
    completedSteps: 4,
    steps: [
      { label: "Email verified", icon: <MailIcon />, status: "complete" },
      { label: "ID verification", icon: <ShieldIcon />, status: "complete" },
      { label: "Resume uploaded", icon: <FileTextIcon />, status: "complete" },
      { label: "Profile complete", icon: <UserIcon />, status: "complete" },
    ],
  },
};