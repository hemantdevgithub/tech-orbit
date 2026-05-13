"use client";

import Link from "next/link";
import React from "react";

export type Crumb = {
  label: string;
  href?: string;
};

/**
 * Sits at the top of content pages under the header. Last item has no
 * href (current page). All prior items link.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-xs text-sage-500 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <React.Fragment key={`${item.label}-${i}`}>
              <li className="flex items-center gap-1.5">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-forest-700 hover:underline transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={isLast ? "text-forest-900 font-medium truncate max-w-[40ch]" : ""}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && <span className="text-sage-300 select-none">/</span>}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
