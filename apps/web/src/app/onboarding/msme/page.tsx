"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label } from "@techorbit/ui";
import { CreateMsmeProfileSchema } from "@techorbit/types";
import { getProfileClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";

type FormData = z.infer<typeof CreateMsmeProfileSchema>;

export default function MsmeOnboardingPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(CreateMsmeProfileSchema),
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      await getProfileClient().createMsmeProfile(data);
      router.push("/dashboard");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest-900">Register your MSME</h1>
        <p className="text-sage-600 mt-1">Tell us about your vendor firm</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company information</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label htmlFor="legalName">Legal company name *</Label>
            <Input
              id="legalName"
              placeholder="Acme Technologies Inc."
              {...register("legalName")}
            />
            {errors.legalName && (
              <p className="text-red-500 text-sm mt-1">{errors.legalName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="dba">DBA (doing business as)</Label>
            <Input id="dba" placeholder="Optional trade name" {...register("dba")} />
          </div>

          <div>
            <Label htmlFor="ein">EIN (XX-XXXXXXX)</Label>
            <Input
              id="ein"
              placeholder="12-3456789"
              {...register("ein")}
            />
            {errors.ein && (
              <p className="text-red-500 text-sm mt-1">{errors.ein.message}</p>
            )}
            <p className="text-xs text-sage-500 mt-1">Encrypted at rest. Used for tax purposes.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="yearsInBusiness">Years in business</Label>
              <Input
                id="yearsInBusiness"
                type="number"
                min={0}
                {...register("yearsInBusiness", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="totalEmployees">Total employees</Label>
              <Input
                id="totalEmployees"
                type="number"
                min={1}
                {...register("totalEmployees", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" placeholder="https://" {...register("website")} />
            {errors.website && (
              <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
            )}
          </div>

          <hr className="border-sage-200" />

          <h3 className="font-medium text-forest-900">Primary contact</h3>

          <div>
            <Label htmlFor="primaryContactName">Contact name</Label>
            <Input id="primaryContactName" {...register("primaryContactName")} />
          </div>

          <div>
            <Label htmlFor="primaryContactEmail">Contact email</Label>
            <Input id="primaryContactEmail" type="email" {...register("primaryContactEmail")} />
            {errors.primaryContactEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.primaryContactEmail.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="primaryContactPhone">Contact phone</Label>
            <Input id="primaryContactPhone" type="tel" {...register("primaryContactPhone")} />
          </div>

          {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Register MSME"}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
