import React from "react";
import { cn } from "../lib/utils.js";
import { Card } from "./card.js";

export type StepStatus = "complete" | "pending" | "in-progress";

export interface ProgressStep {
  label: string;
  icon: React.ReactNode;
  status: StepStatus;
}

export interface ProgressCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  totalSteps: number;
  completedSteps: number;
  steps: ProgressStep[];
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-forest-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const ProgressCard = React.forwardRef<HTMLDivElement, ProgressCardProps>(
  ({ className, title, totalSteps, completedSteps, steps, ...props }, ref) => {
    const progressPercent = Math.round((completedSteps / totalSteps) * 100);

    return (
      <Card ref={ref} className={cn("p-6", className)} {...props}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold text-forest-800">{title}</h3>
          <span className="text-sm text-sage-500">
            {completedSteps}/{totalSteps} complete
          </span>
        </div>

        <div className="h-2 bg-cream-300 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-forest-800 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "rounded-lg p-4 flex flex-col items-center gap-2 relative",
                step.status === "complete"
                  ? "bg-mint-200 border border-mint-300"
                  : "bg-surface-soft border border-surface-border"
              )}
            >
              <div
                className={cn(
                  "rounded-full p-2",
                  step.status === "complete"
                    ? "bg-mint-100 text-forest-600"
                    : "bg-surface text-sage-400"
                )}
              >
                {step.icon}
              </div>
              <span
                className={cn(
                  "text-sm font-medium text-center",
                  step.status === "complete" ? "text-forest-800" : "text-sage-500"
                )}
              >
                {step.label}
              </span>
              {step.status === "complete" && (
                <div className="absolute top-2 right-2">
                  <CheckIcon />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  }
);

ProgressCard.displayName = "ProgressCard";

export { ProgressCard };