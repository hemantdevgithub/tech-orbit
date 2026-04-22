import React from "react";
import { cn } from "../lib/utils.js";

export type BadgeVariant = "mint" | "cream" | "danger" | "muted" | "success" | "warning";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "mint", ...props }, ref) => {
    const variants: Record<BadgeVariant, string> = {
      mint: "bg-mint-200 text-forest-800",
      cream: "bg-cream-200 text-forest-700",
      danger: "bg-danger/10 text-danger",
      muted: "bg-surface-soft text-sage-500",
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };