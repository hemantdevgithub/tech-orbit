"use client";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@techorbit/ui";
import { HandshakeIcon } from "@/components/icons";

const PLAYBOOK = [
  {
    step: "1",
    title: "Bring a customer to the platform",
    body: "Invite a company you already have a relationship with. You earn attribution on every placement that comes from their requirements.",
  },
  {
    step: "2",
    title: "Get attributed",
    body: "Submit an attribution request from the company's page. Once approved, you sit in the Value Chain for every hire.",
  },
  {
    step: "3",
    title: "Collect your cut",
    body: "Each placement generates a commission split. Your share is paid automatically when the invoice is paid — nothing to invoice manually.",
  },
];

export default function CrmOnboardingPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900 flex items-center gap-2">
          Welcome, CRM <HandshakeIcon size={24} />
        </h1>
        <p className="text-sage-600 mt-1">
          You&apos;re set up as a Client Relationship Manager. Here&apos;s how to start earning.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The playbook</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          {PLAYBOOK.map((p) => (
            <div key={p.step} className="flex gap-4">
              <div className="shrink-0 w-9 h-9 rounded-full bg-forest-100 text-forest-800 font-semibold flex items-center justify-center">
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
            A dedicated CRM profile (bio, regions, target industries) is coming
            in a future release. For now, your account is ready — head to the
            dashboard to browse active requirements and submit attribution
            requests.
          </p>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => router.push("/techforce/dashboard")}>
          Go to dashboard →
        </Button>
      </div>
    </div>
  );
}
