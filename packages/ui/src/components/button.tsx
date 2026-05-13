import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../lib/utils.js";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles = "rounded-lg font-medium transition-colors duration-150 focus-visible:ring-2 ring-forest-500 ring-offset-2 outline-none disabled:opacity-40 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-forest-800 text-white hover:bg-forest-700 active:bg-forest-900 shadow-card",
      secondary: "bg-surface border border-forest-800 text-forest-800 hover:bg-mint-100",
      ghost: "bg-transparent text-forest-800 hover:bg-mint-200",
      destructive: "bg-danger text-white hover:bg-[#9C3E3E]",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm h-8",
      md: "px-6 py-3 text-base h-11",
      lg: "px-8 py-4 text-lg h-[52px]",
    };

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };