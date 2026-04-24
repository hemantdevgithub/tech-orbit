"use client";

import { useState } from "react";

export type StarRatingProps = {
  value: number | null;
  onChange?: (next: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
};

const SIZE_CLASSES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
};

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
  "aria-label": ariaLabel,
}: StarRatingProps): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      role={readOnly ? "img" : "radiogroup"}
      aria-label={ariaLabel ?? `Rating: ${value ?? "unrated"}`}
      className={`inline-flex items-center gap-1 ${SIZE_CLASSES[size]}`}
    >
      {stars.map((n) => {
        const filled = n <= display;
        if (readOnly) {
          return (
            <span key={n} className={filled ? "text-warning" : "text-sage-300"}>
              ★
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange?.(n)}
            className={`transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-forest-500 rounded ${
              filled ? "text-warning" : "text-sage-300 hover:text-warning/70"
            }`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
