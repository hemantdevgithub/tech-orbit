"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label } from "@techorbit/ui";
import { CreateCustomerCompanySchema } from "@techorbit/types";
import { getProfileClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";

type FormData = z.infer<typeof CreateCustomerCompanySchema>;

const COMPANY_SIZE_OPTIONS = [
  { value: "SIZE_1_10", label: "1–10" },
  { value: "SIZE_11_50", label: "11–50" },
  { value: "SIZE_51_200", label: "51–200" },
  { value: "SIZE_201_500", label: "201–500" },
  { value: "SIZE_501_1000", label: "501–1,000" },
  { value: "SIZE_1001_PLUS", label: "1,001+" },
] as const;

export default function CustomerOnboardingPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(CreateCustomerCompanySchema),
    defaultValues: { defaultNetTerms: 30 },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      await getProfileClient().createCustomerProfile(data);
      router.push("/dashboard");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest-900">Register your company</h1>
        <p className="text-sage-600 mt-1">Set up your customer profile to post requirements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label htmlFor="legalName">Legal company name *</Label>
            <Input
              id="legalName"
              placeholder="Acme Corporation"
              {...register("legalName")}
            />
            {errors.legalName && (
              <p className="text-red-500 text-sm mt-1">{errors.legalName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="dba">DBA (optional)</Label>
            <Input id="dba" {...register("dba")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" placeholder="e.g. Financial Services" {...register("industry")} />
            </div>
            <div>
              <Label htmlFor="companySizeRange">Company size</Label>
              <select
                id="companySizeRange"
                className="w-full px-3 py-2 rounded-lg border border-sage-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                {...register("companySizeRange")}
              >
                <option value="">Select size</option>
                {COMPANY_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" placeholder="https://" {...register("website")} />
            {errors.website && (
              <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="ein">EIN (optional, XX-XXXXXXX)</Label>
            <Input id="ein" placeholder="12-3456789" {...register("ein")} />
            {errors.ein && (
              <p className="text-red-500 text-sm mt-1">{errors.ein.message}</p>
            )}
          </div>

          <hr className="border-sage-200" />

          <h3 className="font-medium text-forest-900">Billing address</h3>

          <div>
            <Label htmlFor="billingStreet">Street</Label>
            <Input id="billingStreet" {...register("billingStreet")} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="billingCity">City</Label>
              <Input id="billingCity" {...register("billingCity")} />
            </div>
            <div>
              <Label htmlFor="billingState">State</Label>
              <Input id="billingState" {...register("billingState")} />
            </div>
            <div>
              <Label htmlFor="billingZip">ZIP</Label>
              <Input id="billingZip" {...register("billingZip")} />
            </div>
          </div>

          <div>
            <Label htmlFor="billingCountry">Country</Label>
            <Input id="billingCountry" defaultValue="US" {...register("billingCountry")} />
          </div>

          {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Register company"}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
