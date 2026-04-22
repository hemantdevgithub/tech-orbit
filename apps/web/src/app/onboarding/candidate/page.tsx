"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label } from "@techorbit/ui";
import { UpdateCandidateProfileSchema } from "@techorbit/types";
import { getProfileClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";

type FormData = z.infer<typeof UpdateCandidateProfileSchema>;

const SENIORITY_OPTIONS = [
  { value: "JUNIOR", label: "Junior (0–2 yrs)" },
  { value: "MID", label: "Mid-level (2–5 yrs)" },
  { value: "SENIOR", label: "Senior (5–8 yrs)" },
  { value: "STAFF", label: "Staff (8–12 yrs)" },
  { value: "PRINCIPAL", label: "Principal (12+ yrs)" },
  { value: "PARTNER", label: "Partner" },
] as const;

const WORK_AUTH_OPTIONS = [
  { value: "US_CITIZEN", label: "US Citizen" },
  { value: "GREEN_CARD", label: "Green Card" },
  { value: "H1B", label: "H1B" },
  { value: "L1", label: "L1" },
  { value: "OPT", label: "OPT" },
  { value: "CPT", label: "CPT" },
  { value: "TN", label: "TN Visa" },
  { value: "OTHER", label: "Other" },
] as const;

export default function CandidateOnboardingPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [skillInput, setSkillInput] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(UpdateCandidateProfileSchema),
    defaultValues: {
      preferRemote: false,
      preferHybrid: false,
      preferOnsite: false,
      skills: [],
    },
  });

  const skills = watch("skills") ?? [];

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setValue("skills", [...skills, trimmed]);
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setValue("skills", skills.filter((s) => s !== skill));
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      await getProfileClient().updateCandidateProfile(data);
      router.push("/dashboard");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest-900">Complete your candidate profile</h1>
        <p className="text-sage-600 mt-1">Step {step} of 2</p>
        <div className="flex gap-2 mt-3">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-forest-700" : "bg-sage-200"}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Professional info</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div>
              <Label htmlFor="headline">Professional headline</Label>
              <Input
                id="headline"
                placeholder="e.g. Senior Java Developer with 8 years experience"
                {...register("headline")}
              />
              {errors.headline && (
                <p className="text-red-500 text-sm mt-1">{errors.headline.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bio">Bio (optional)</Label>
              <textarea
                id="bio"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-sage-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                placeholder="Tell clients about your experience..."
                {...register("bio")}
              />
            </div>

            <div>
              <Label htmlFor="seniority">Seniority level</Label>
              <select
                id="seniority"
                className="w-full px-3 py-2 rounded-lg border border-sage-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                {...register("seniority")}
              >
                <option value="">Select seniority</option>
                {SENIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Java, AWS, React"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                />
                <Button type="button" variant="secondary" onClick={addSkill}>Add</Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 bg-forest-100 text-forest-800 rounded-full px-3 py-1 text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
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
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="e.g. Austin, TX" {...register("location")} />
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={() => setStep(2)}
            >
              Next →
            </Button>
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Work authorization & availability</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div>
              <Label htmlFor="workAuthStatus">Work authorization</Label>
              <select
                id="workAuthStatus"
                className="w-full px-3 py-2 rounded-lg border border-sage-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                {...register("workAuthStatus")}
              >
                <option value="">Select status</option>
                {WORK_AUTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rateMin">Rate min ($/hr)</Label>
                <Input
                  id="rateMin"
                  type="number"
                  min={0}
                  {...register("rateMin", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="rateMax">Rate max ($/hr)</Label>
                <Input
                  id="rateMax"
                  type="number"
                  min={0}
                  {...register("rateMax", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div>
              <Label>Work preference</Label>
              <div className="flex gap-4 mt-2">
                {[
                  { name: "preferRemote" as const, label: "Remote" },
                  { name: "preferHybrid" as const, label: "Hybrid" },
                  { name: "preferOnsite" as const, label: "On-site" },
                ].map(({ name, label }) => (
                  <label key={name} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...register(name)} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {serverError && (
              <p className="text-red-500 text-sm">{serverError}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                ← Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Complete profile"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </form>
  );
}
