import React from "react";
import { cn } from "../lib/utils.js";
import { Avatar } from "./avatar.js";

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavBarProps extends React.HTMLAttributes<HTMLElement> {
  logoText?: string;
  links?: NavLink[];
  userName?: string;
  userAvatar?: string;
  notificationCount?: number;
}

function LogoIcon() {
  return (
    <div className="w-10 h-10 rounded-md bg-forest-800 text-white flex items-center justify-center font-bold">
      T
    </div>
  );
}

function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <button
      className="relative p-2 rounded-md text-forest-800 hover:bg-mint-100 focus-visible:ring-2 ring-forest-500"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-xs rounded-full flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

function UserMenu({ name, avatar }: { name?: string; avatar?: string }) {
  return (
    <button
      className="flex items-center gap-2 p-2 rounded-md hover:bg-mint-100 focus-visible:ring-2 ring-forest-500"
      aria-label="User menu"
    >
      <Avatar name={name ?? "User"} src={avatar} size="sm" />
      <span className="text-sm font-medium text-forest-800 hidden md:block">
        {name ?? "User"}
      </span>
      <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

const NavBar = React.forwardRef<HTMLElement, NavBarProps>(
  (
    {
      className,
      logoText = "Techorbit",
      links = [],
      userName,
      userAvatar,
      notificationCount = 0,
      ...props
    },
    ref
  ) => (
    <header
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        "sticky top-0 z-40 h-16 bg-surface/95 backdrop-blur border-b border-surface-border",
        className
      )}
      {...props}
    >
      <div className="h-full max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoIcon />
          <span className="text-xl font-semibold text-forest-800">{logoText}</span>
        </div>

        <nav className="hidden md:flex items-center gap-2" aria-label="Main navigation">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-2 rounded-md text-base font-medium text-forest-800 hover:bg-mint-100",
                link.active && "bg-mint-200"
              )}
              aria-current={link.active ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <NotificationBell count={notificationCount} />
          <UserMenu name={userName} avatar={userAvatar} />
        </div>
      </div>
    </header>
  )
);

NavBar.displayName = "NavBar";

export { NavBar };