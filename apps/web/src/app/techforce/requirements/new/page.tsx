"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from "@techorbit/ui";
import {
  CreateRequirementSchema,
  TECH_STACK_OPTIONS,
} from "@techorbit/types";
import type { LocationType, Seniority, WorkAuthStatus } from "@techorbit/types";
import { getRequirementClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";

type FormData = z.infer<typeof CreateRequirementSchema>;

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid-level" },
  { value: "SENIOR", label: "Senior" },
  { value: "STAFF", label: "Staff" },
  { value: "PRINCIPAL", label: "Principal" },
];

const LOCATION_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "ONSITE", label: "Onsite" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "REMOTE", label: "Remote" },
];

const WORK_AUTH_OPTIONS: { value: WorkAuthStatus; label: string }[] = [
  { value: "US_CITIZEN", label: "US Citizen" },
  { value: "GREEN_CARD", label: "Green Card" },
  { value: "H1B", label: "H-1B" },
  { value: "L1", label: "L-1" },
  { value: "OPT", label: "OPT" },
  { value: "CPT", label: "CPT" },
  { value: "TN", label: "TN Visa" },
  { value: "OTHER", label: "Other" },
];

export default function NewRequirementPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [techInput, setTechInput] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(CreateRequirementSchema),
    defaultValues: {
      techStack: [],
      workAuthPrefs: [],
      openings: 1,
      requiredInterviews: 2,
      blindPosting: false,
      billRateMinUsd: 80,
      billRateMaxUsd: 120,
      durationWeeks: 12,
    },
  });

  const watchTechStack = watch("techStack");
  const watchLocationType = watch("locationType");
  const watchWorkAuth = watch("workAuthPrefs");

  function addTechSkill(skill: string): void {
    if (!skill) return;
    const current = getValues("techStack") ?? [];
    if (current.includes(skill)) return;
    setValue("techStack", [...current, skill], { shouldValidate: true });
    setTechInput("");
  }

  function removeTechSkill(skill: string): void {
    const current = getValues("techStack") ?? [];
    setValue(
      "techStack",
      current.filter((s) => s !== skill),
      { shouldValidate: true },
    );
  }

  function toggleWorkAuth(value: WorkAuthStatus): void {
    const current = getValues("workAuthPrefs") ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue("workAuthPrefs", next, { shouldValidate: true });
  }

  async function goToNextStep(): Promise<void> {
    // Validate only the fields for the current step before advancing.
    const step1Fields: (keyof FormData)[] = [
      "title",
      "description",
      "techStack",
      "seniority",
    ];
    const step2Fields: (keyof FormData)[] = [
      "locationType",
      "billRateMinUsd",
      "billRateMaxUsd",
      "durationWeeks",
      "startDate",
      "openings",
    ];
    const toValidate = step === 1 ? step1Fields : step2Fields;
    const ok = await trigger(toValidate);
    if (!ok) return;
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 3));
  }

  async function saveDraft(data: FormData): Promise<void> {
    setServerError(null);
    try {
      const created = await getRequirementClient().create(data);
      router.push(`/techforce/requirements/${created.id}`);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function publishNow(data: FormData): Promise<void> {
    setServerError(null);
    try {
      const client = getRequirementClient();
      const created = await client.create(data);
      const published = await client.publish(created.id);
      router.push(`/techforce/requirements/${published.id}`);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest-900">
          Post a requirement
        </h1>
        <p className="text-sage-600 mt-1">Step {step} of 3</p>
      </div>

      {serverError && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800 text-sm">
          {serverError}
        </div>
      )}

      <form>
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Job basics</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="Senior Java Developer" {...register("title")} />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  rows={8}
                  className="w-full px-3 py-2 border border-sage-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500"
                  placeholder="Responsibilities, team context, must-haves… Markdown supported."
                  {...register("description")}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
              </div>

              <div>
                <Label>Tech stack *</Label>
                <div className="flex gap-2 items-center">
                  <select
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-sage-300 rounded-md"
                  >
                    <option value="">Pick a skill…</option>
                    {TECH_STACK_OPTIONS.filter((s) => !(watchTechStack ?? []).includes(s)).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Button type="button" variant="secondary" onClick={() => addTechSkill(techInput)}>Add</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(watchTechStack ?? []).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => removeTechSkill(skill)}
                      className="inline-flex items-center gap-1"
                    >
                      <Badge variant="mint">{skill} ×</Badge>
                    </button>
                  ))}
                </div>
                {errors.techStack && <p className="text-red-500 text-sm mt-1">{errors.techStack.message}</p>}
              </div>

              <div>
                <Label htmlFor="seniority">Seniority *</Label>
                <select
                  id="seniority"
                  className="w-full px-3 py-2 border border-sage-300 rounded-md"
                  {...register("seniority")}
                >
                  <option value="">Select seniority…</option>
                  {SENIORITY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {errors.seniority && <p className="text-red-500 text-sm mt-1">{errors.seniority.message}</p>}
              </div>
            </CardBody>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Location &amp; rates</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <Label>Location type *</Label>
                <div className="flex gap-2 mt-1">
                  {LOCATION_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 px-3 py-2 border border-sage-300 rounded-md cursor-pointer">
                      <input type="radio" value={opt.value} {...register("locationType")} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {errors.locationType && <p className="text-red-500 text-sm mt-1">{errors.locationType.message}</p>}
              </div>

              {(watchLocationType === "ONSITE" || watchLocationType === "HYBRID") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="locationCity">City</Label>
                    <Input id="locationCity" {...register("locationCity")} />
                  </div>
                  <div>
                    <Label htmlFor="locationState">State (2 letters)</Label>
                    <Input id="locationState" maxLength={2} {...register("locationState")} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="billRateMinUsd">Bill rate min ($/hr) *</Label>
                  <Input type="number" id="billRateMinUsd" step="5" {...register("billRateMinUsd", { valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="billRateMaxUsd">Bill rate max ($/hr) *</Label>
                  <Input type="number" id="billRateMaxUsd" step="5" {...register("billRateMaxUsd", { valueAsNumber: true })} />
                </div>
              </div>
              {errors.billRateMaxUsd && <p className="text-red-500 text-sm -mt-3">{errors.billRateMaxUsd.message}</p>}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="durationWeeks">Duration (weeks) *</Label>
                  <Input type="number" id="durationWeeks" {...register("durationWeeks", { valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="startDate">Start date *</Label>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <Input
                        type="date"
                        id="startDate"
                        value={field.value ? field.value.slice(0, 10) : ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value).toISOString() : "",
                          )
                        }
                      />
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="openings">Openings *</Label>
                  <Input type="number" id="openings" {...register("openings", { valueAsNumber: true })} />
                </div>
              </div>
              {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate.message}</p>}
            </CardBody>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <Label>Work authorization preferences</Label>
                <p className="text-sm text-sage-600 mb-2">Leave empty to accept any authorization.</p>
                <div className="grid grid-cols-2 gap-2">
                  {WORK_AUTH_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(watchWorkAuth ?? []).includes(opt.value)}
                        onChange={() => toggleWorkAuth(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="requiredInterviews">Required interviews</Label>
                <select
                  id="requiredInterviews"
                  className="w-full px-3 py-2 border border-sage-300 rounded-md"
                  {...register("requiredInterviews", { valueAsNumber: true })}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-start gap-2">
                  <input type="checkbox" {...register("blindPosting")} className="mt-1" />
                  <span>
                    <div className="font-medium">Blind posting</div>
                    <div className="text-sm text-sage-600">
                      Hide your company name from candidates. Only attributed CRMs and
                      admins will see it.
                    </div>
                  </span>
                </label>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((s) => (s === 3 ? 2 : s === 2 ? 1 : 1))}
            disabled={step === 1}
          >
            Back
          </Button>

          {step < 3 && (
            <Button type="button" onClick={goToNextStep}>
              Next
            </Button>
          )}

          {step === 3 && (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit(saveDraft)}>
                Save draft
              </Button>
              <Button type="button" disabled={isSubmitting} onClick={handleSubmit(publishNow)}>
                Publish now
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
