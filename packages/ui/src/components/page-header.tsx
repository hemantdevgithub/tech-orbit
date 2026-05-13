import React from "react";
import { cn } from "../lib/utils.js";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, icon, title, subtitle, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-start justify-between gap-4 mb-8", className)}
      {...props}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="w-14 h-14 rounded-lg bg-surface-soft flex items-center justify-center text-forest-800">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold text-forest-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-lg text-sage-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  )
);

PageHeader.displayName = "PageHeader";

export { PageHeader };