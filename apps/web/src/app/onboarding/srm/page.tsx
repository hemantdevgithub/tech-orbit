"use client";

import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@techorbit/ui";
import { SearchIcon } from "@/components/icons";

const PLAYBOOK = [
  {
    step: "1",
    title: "Browse open requirements",
    body: "Filter by skills, location, and rate. New requirements from CRM-attributed customers land here every day.",
  },
  {
    step: "2",
    title: "Submit a qualified candidate",
    body: "Share a candidate's profile against a requirement. Good matches get shortlisted and moved to interview quickly.",
  },
  {
    step: "3",
    title: "Earn per placement",
    body: "When your submission becomes a placement, you take the SRM slot in the Value Chain. Paid automatically on invoice.",
  },
];

export default function SrmOnboardingPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900 flex items-center gap-2">
          Welcome, SRM <SearchIcon size={24} />
        </h1>
        <p className="text-sage-600 mt-1">
          You&apos;re set up as a Senior Recruitment Manager. Here&apos;s how the
          sourcing loop works.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The playbook</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          {PLAYBOOK.map((p) => (
            <div key={p.step} className="flex gap-4">
              <div className="shrink-0 w-9 h-9 rounded-full bg-warning/15 text-warning font-semibold flex items-center justify-center">
                {p.step}
              </div>
              <div>
                <p className="font-semibold text-forest-900">{p.title}</p>
                <p className="text-sage-600 text-sm mt-0.5">{p.body}</p>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What&apos;s next</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-sage-700">
          <p>
            A dedicated SRM profile (specializations, placement history, rating)
            is coming in a future release. For now, your account is ready — head
            to the dashboard to browse requirements and start submitting.
          </p>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => router.push("/dashboard")}>
          Go to dashboard →
        </Button>
      </div>
    </div>
  );
}
