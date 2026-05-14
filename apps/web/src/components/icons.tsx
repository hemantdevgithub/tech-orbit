import React from "react";

/**
 * Small inline-SVG icon set styled after Lucide. Using inline SVGs keeps
 * the bundle flat (no icon library dep) and lets us tint with currentColor.
 */

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function Svg({
  size = 16,
  className,
  strokeWidth = 1.75,
  children,
}: IconProps & { children: React.ReactNode }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5Z" /></Svg>
);

export const BriefcaseIcon = (p: IconProps) => (
  <Svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></Svg>
);

export const TargetIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>
);

export const HandshakeIcon = (p: IconProps) => (
  <Svg {...p}><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3L13 7H8L4 11l3 3" /><path d="m18 15 2-2" /><path d="M10 14 7 11" /></Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);

export const ReceiptIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2Z" /><path d="M8 7h8M8 11h8M8 15h5" /></Svg>
);

export const DollarIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 1 0 0 7H15a3.5 3.5 0 1 1 0 7H7" /></Svg>
);

export const MessageIcon = (p: IconProps) => (
  <Svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></Svg>
);

export const BellIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>
);

export const BuildingIcon = (p: IconProps) => (
  <Svg {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" /></Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></Svg>
);

export const UsersIcon = (p: IconProps) => (
  <Svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);

export const FactoryIcon = (p: IconProps) => (
  <Svg {...p}><path d="M2 20v-8l6 3V12l6 3V12l6 3v5H2Z" /><path d="M17 20v-6" /><path d="M13 20v-3" /><path d="M9 20v-3" /></Svg>
);

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" /></Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);

export const AwardIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="9" r="6" /><path d="M8.5 14.5 7 22l5-3 5 3-1.5-7.5" /></Svg>
);

export const GitBranchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="7" r="2" /><path d="M6 7v10" /><path d="M18 9c0 4-6 5-6 9" /></Svg>
);

// Role → icon lookup used in several places.
export const ROLE_ICON_COMPONENT: Record<string, (p: IconProps) => JSX.Element> = {
  CUSTOMER: BuildingIcon,
  CANDIDATE: UserIcon,
  CRM: HandshakeIcon,
  SRM: SearchIcon,
  MSME: FactoryIcon,
  ADMIN: ShieldIcon,
};
