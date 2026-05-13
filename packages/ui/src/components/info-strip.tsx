import React from "react";
import { cn } from "../lib/utils.js";

export interface InfoStripItem {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

export interface InfoStripProps extends React.HTMLAttributes<HTMLDivElement> {
  items: InfoStripItem[];
}

const InfoStrip = React.forwardRef<HTMLDivElement, InfoStripProps>(
  ({ className, items, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-surface rounded-lg border border-surface-border p-4 flex flex-wrap items-center gap-x-8 gap-y-3",
        className
      )}
      {...props}
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.icon && (
            <span className="text-sage-500 aria-hidden">{item.icon}</span>
          )}
          <div className="flex flex-col">
            <span className="text-sm text-sage-500">{item.label}</span>
            <span className="text-sm font-semibold text-forest-800 uppercase tracking-wide">
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
);

InfoStrip.displayName = "InfoStrip";

export { InfoStrip };