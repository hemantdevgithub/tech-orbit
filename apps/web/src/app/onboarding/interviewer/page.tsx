"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label } from "@techorbit/ui";
import { CreateInterviewerProfileSchema } from "@techorbit/types";
import { getProfileClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";

type FormData = z.infer<typeof CreateInterviewerProfileSchema>;

const SENIORITY_OPTIONS = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid-level" },
  { value: "SENIOR", label: "Senior" },
  { value: "STAFF", label: "Staff" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "PARTNER", label: "Partner" },
] as const;

const INTERVIEW_TYPE_OPTIONS = [
  { value: "TECHNICAL_CODING", label: "Technical / Coding" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "CASE_STUDY", label: "Case Study" },
  { value: "DOMAIN_SPECIFIC", label: "Domain Specific" },
] as const;

export default function InterviewerOnboardingPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [specializationInput, setSpecializationInput] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(CreateInterviewerProfileSchema),
    defaultValues: {
      specializations: [],
      seniorityLevelsCoverable: [],
      interviewTypes: [],
    },
  });

  const specializations = watch("specializations") ?? [];
  const selectedSeniority = watch("seniorityLevelsCoverable") ?? [];
  const selectedInterviewTypes = watch("interviewTypes") ?? [];

  function addSpecialization() {
    const trimmed = specializationInput.trim();
    if (!trimmed || specializations.includes(trimmed)) return;
    setValue("specializations", [...specializations, trimmed]);
    setSpecializationInput("");
  }

  function toggleSeniority(val: typeof SENIORITY_OPTIONS[number]["value"]) {
    const current = (selectedSeniority ?? []) as typeof SENIORITY_OPTIONS[number]["value"][];
    setValue(
      "seniorityLevelsCoverable",
      current.includes(val) ? current.filter((v) => v !== val) : [...current, val],
    );
  }

  function toggleInterviewType(val: typeof INTERVIEW_TYPE_OPTIONS[number]["value"]) {
    const current = (selectedInterviewTypes ?? []) as typeof INTERVIEW_TYPE_OPTIONS[number]["value"][];
    setValue(
      "interviewTypes",
      current.includes(val) ? current.filter((v) => v !== val) : [...current, val],
    );
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      await getProfileClient().createInterviewerProfile(data);
      router.push("/dashboard");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest-900">Set up your interviewer profile</h1>
        <p className="text-sage-600 mt-1">Tell candidates what you specialize in</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Professional details</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" placeholder="How you appear to candidates" {...register("displayName")} />
          </div>

          <div>
            <Label htmlFor="headline">Professional headline</Label>
            <Input
              id="headline"
              placeholder="e.g. Staff SWE at Google | 10+ yrs backend"
              {...register("headline")}
            />
          </div>

          <div>
            <Label htmlFor="currentRole">Current role</Label>
            <Input id="currentRole" placeholder="e.g. Staff Engineer" {...register("currentRole")} />
          </div>

          <div>
            <Label htmlFor="currentCompany">Current company</Label>
            <Input id="currentCompany" placeholder="e.g. Google" {...register("currentCompany")} />
          </div>

          <div>
            <Label>Specializations</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Distributed Systems, React"
                value={specializationInput}
                onChange={(e) => setSpecializationInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpecialization(); } }}
              />
              <Button type="button" variant="secondary" onClick={addSpecialization}>Add</Button>
            </div>
            {specializations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {specializations.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 bg-forest-100 text-forest-800 rounded-full px-3 py-1 text-sm">
                    {s}
                    <button
                      type="button"
                      onClick={() => setValue("specializations", specializations.filter((x) => x !== s))}
                      className="text-forest-600 hover:text-forest-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Seniority levels you cover</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SENIORITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleSeniority(value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    (selectedSeniority as string[]).includes(value)
                      ? "bg-forest-700 text-white border-forest-700"
                      : "bg-white text-sage-700 border-sage-300 hover:border-forest-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Interview types</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {INTERVIEW_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleInterviewType(value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    (selectedInterviewTypes as string[]).includes(value)
                      ? "bg-forest-700 text-white border-forest-700"
                      : "bg-white text-sage-700 border-sage-300 hover:border-forest-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="perInterviewFeeUsd">Fee per interview ($)</Label>
              <Input
                id="perInterviewFeeUsd"
                type="number"
                min={0}
                placeholder="e.g. 150"
                {...register("perInterviewFeeUsd", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                placeholder="e.g. America/Chicago"
                {...register("timezone")}
              />
            </div>
          </div>

          {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Create profile"}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
