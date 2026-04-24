"use client";

import { Card, CardBody, CardHeader, CardTitle, Button } from "@techorbit/ui";
import { CustomerEarningsCards } from "./earnings-cards";

export function CustomerDashboard() {
  return (
    <div className="space-y-6">
      <CustomerEarningsCards />

      {/* Post requirement */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between">
            <p className="text-sage-600 text-sm">Post IT requirements to find pre-vetted consultants</p>
            <Button
              disabled
              title="Available in Sprint 3"
              className="opacity-50 cursor-not-allowed"
            >
              Post a requirement
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Active requirements placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Active requirements</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8 text-sage-500">
            <p className="text-lg mb-1">📌</p>
            <p className="font-medium">Coming in Sprint 3</p>
            <p className="text-sm">Your open requirements and candidate pipelines will appear here</p>
          </div>
        </CardBody>
      </Card>

      {/* Profile checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Account setup checklist</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm">
            {[
              "Add company legal name",
              "Add billing address",
              "Add EIN (optional, required for invoicing)",
              "Connect payment method",
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
