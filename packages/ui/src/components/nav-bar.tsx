import React from "react";
import { cn } from "../lib/utils.js";

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
  // Render a live widget (e.g. NotificationBell with unread count) in place of the
  // default static bell. When provided, replaces the built-in NotificationBell slot.
  rightSlot?: React.ReactNode;
  // Replace the user-menu button with a live widget (dropdown, auth-aware).
  // When provided, takes the place of the default static UserMenu.
  userSlot?: React.ReactNode;
}

function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <button
      className="relative p-2 rounded-lg text-sage-400 hover:text-cream-100 hover:bg-forest-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning rounded-full ring-2 ring-forest-800" />
      )}
    </button>
  );
}

function UserMenu({ name }: { name?: string }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return (
    <button
      className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-forest-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300 group"
      aria-label="User menu"
    >
      <div className="w-7 h-7 rounded-full bg-mint-300 text-forest-800 text-xs font-bold flex items-center justify-center shrink-0">
        {initials}
      </div>
      <span className="text-sm font-medium text-cream-200 hidden md:block max-w-[120px] truncate">
        {name ?? "Account"}
      </span>
      <svg className="w-3 h-3 text-sage-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
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
      notificationCount = 0,
      rightSlot,
      userSlot,
      ...props
    },
    ref
  ) => (
    <header
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        "sticky top-0 z-40 h-14 bg-forest-800 border-b border-forest-700/60",
        className
      )}
      {...props}
    >
      <div className="h-full max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-mint-200 flex items-center justify-center font-bold text-forest-800 text-sm">
            T
          </div>
          <span className="text-[15px] font-semibold text-cream-100 tracking-tight hidden sm:block">{logoText}</span>
        </a>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 px-4" aria-label="Main navigation">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                link.active
                  ? "bg-forest-700 text-cream-100"
                  : "text-sage-400 hover:text-cream-100 hover:bg-forest-700"
              )}
              aria-current={link.active ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {rightSlot ?? <NotificationBell count={notificationCount} />}
          <div className="w-px h-5 bg-forest-700 mx-1" />
          {userSlot ?? <UserMenu name={userName} />}
        </div>
      </div>
    </header>
  )
);

NavBar.displayName = "NavBar";

export { NavBar };
