"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@techorbit/ui";
import { getProfileClient } from "@/lib/api-client";
import { CandidateEarningsCards } from "./earnings-cards";

export function CandidateDashboard() {
  const [toggling, setToggling] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  async function toggleAvailability() {
    setToggling(true);
    try {
      const today = new Date().toISOString();
      await getProfileClient().updateCandidateProfile({
        availableFrom: isAvailable ? null : today,
      });
      setIsAvailable(!isAvailable);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      <CandidateEarningsCards />

      {/* Availability toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-forest-900">Ready to work</p>
              <p className="text-sm text-sage-600">Signal to recruiters that you&apos;re available now</p>
            </div>
            <Button
              variant={isAvailable ? "primary" : "secondary"}
              size="sm"
              disabled={toggling}
              onClick={toggleAvailability}
            >
              {isAvailable ? "Available ✓" : "Set available"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Matching opportunities placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Matching opportunities</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8 text-sage-500">
            <p className="text-lg mb-1">🔍</p>
            <p className="font-medium">Coming in Sprint 3</p>
            <p className="text-sm">Matched requirements will appear here</p>
          </div>
        </CardBody>
      </Card>

      {/* Profile completion cue */}
      <Card>
        <CardHeader>
          <CardTitle>Profile checklist</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm">
            {[
              "Add professional headline",
              "Upload resume",
              "Set work authorization",
              "Add at least 3 skills",
              "Complete KYC verification",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sage-600">
                <span className="w-4 h-4 rounded-full border border-sage-300 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
