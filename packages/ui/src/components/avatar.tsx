import React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "../lib/utils.js";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
  }
  return (name?.[0] ?? "?").toUpperCase();
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, src, size = "md", className, ...props }, ref) => (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn("rounded-full overflow-hidden flex-shrink-0", sizeClasses[size], className)}
      {...props}
    >
      <AvatarPrimitive.Image
        src={src}
        alt={name}
        className="w-full h-full object-cover"
      />
      <AvatarPrimitive.Fallback
        className="w-full h-full bg-mint-200 text-forest-800 font-medium flex items-center justify-center"
        delayMs={600}
      >
        {getInitials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
);

Avatar.displayName = "Avatar";

export { Avatar };