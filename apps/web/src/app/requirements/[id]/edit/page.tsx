"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
  TECH_STACK_OPTIONS,
  UpdateRequirementSchema,
} from "@techorbit/types";
import type {
  LocationType,
  RequirementResponse,
  Seniority,
  WorkAuthStatus,
} from "@techorbit/types";
import { getRequirementClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";

type FormData = z.infer<typeof UpdateRequirementSchema>;

const SENIORITY_OPTIONS: Seniority[] = ["JUNIOR", "MID", "SENIOR", "STAFF", "PRINCIPAL"];
const LOCATION_OPTIONS: LocationType[] = ["ONSITE", "HYBRID", "REMOTE"];
const WORK_AUTH_OPTIONS: WorkAuthStatus[] = [
  "US_CITIZEN",
  "GREEN_CARD",
  "H1B",
  "L1",
  "OPT",
  "CPT",
  "TN",
  "OTHER",
];

export default function EditRequirementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [techInput, setTechInput] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(UpdateRequirementSchema),
  });

  useEffect(() => {
    async function run(): Promise<void> {
      if (!params?.id) return;
      try {
        const req = await getRequirementClient().getById(params.id);
        if (req.status !== "DRAFT") {
          // Edit is draft-only per the repo guard; bounce to the detail page.
          router.replace(`/requirements/${req.id}`);
          return;
        }
        reset(toFormValues(req));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load requirement");
      } finally {
        setLoading(false);
      }
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const watchTechStack = watch("techStack") ?? [];
  const watchLocationType = watch("locationType");
  const watchWorkAuth = watch("workAuthPrefs") ?? [];

  function addTechSkill(skill: string): void {
    if (!skill || watchTechStack.includes(skill)) return;
    setValue("techStack", [...watchTechStack, skill], { shouldValidate: true });
    setTechInput("");
  }
  function removeTechSkill(skill: string): void {
    setValue(
      "techStack",
      watchTechStack.filter((s) => s !== skill),
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

  async function onSubmit(data: FormData): Promise<void> {
    if (!params?.id) return;
    setError(null);
    try {
      await getRequirementClient().update(params.id, data);
      router.push(`/requirements/${params.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    }
  }

  if (loading) return <p className="text-sage-600">Loading…</p>;
  if (error) {
    return (
      <Card>
        <CardBody className="text-red-700">{error}</CardBody>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/requirements/${params?.id}`}
          className="text-sm text-forest-700 hover:underline"
        >
          ← Back to requirement
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-forest-900 mb-6">Edit draft</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Requirement details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={8}
                className="w-full px-3 py-2 border border-sage-300 rounded-md"
                {...register("description")}
              />
            </div>

            <div>
              <Label>Tech stack</Label>
              <div className="flex gap-2 items-center">
                <select
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-sage-300 rounded-md"
                >
                  <option value="">Pick a skill…</option>
                  {TECH_STACK_OPTIONS.filter((s) => !watchTechStack.includes(s)).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={() => addTechSkill(techInput)}>
                  Add
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {watchTechStack.map((skill) => (
                  <button key={skill} type="button" onClick={() => removeTechSkill(skill)}>
                    <Badge variant="mint">{skill} ×</Badge>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="seniority">Seniority</Label>
                <select
                  id="seniority"
                  className="w-full px-3 py-2 border border-sage-300 rounded-md"
                  {...register("seniority")}
                >
                  {SENIORITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="locationType">Location</Label>
                <select
                  id="locationType"
                  className="w-full px-3 py-2 border border-sage-300 rounded-md"
                  {...register("locationType")}
                >
                  {LOCATION_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
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
                <Label htmlFor="billRateMinUsd">Bill rate min ($/hr)</Label>
                <Input type="number" step="5" id="billRateMinUsd" {...register("billRateMinUsd", { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="billRateMaxUsd">Bill rate max ($/hr)</Label>
                <Input type="number" step="5" id="billRateMaxUsd" {...register("billRateMaxUsd", { valueAsNumber: true })} />
              </div>
            </div>
            {errors.billRateMaxUsd && <p className="text-red-500 text-sm -mt-3">{errors.billRateMaxUsd.message}</p>}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="durationWeeks">Duration (weeks)</Label>
                <Input type="number" id="durationWeeks" {...register("durationWeeks", { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="startDate">Start date</Label>
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
                <Label htmlFor="openings">Openings</Label>
                <Input type="number" id="openings" {...register("openings", { valueAsNumber: true })} />
              </div>
            </div>

            <div>
              <Label>Work authorization</Label>
              <div className="grid grid-cols-2 gap-2">
                {WORK_AUTH_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={watchWorkAuth.includes(opt)}
                      onChange={() => toggleWorkAuth(opt)}
                    />
                    {opt}
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
                <span>Blind posting (hide company from candidates)</span>
              </label>
            </div>
          </CardBody>
        </Card>

        <div className="mt-6 flex justify-end gap-2">
          <Link href={`/requirements/${params?.id}`}>
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>Save changes</Button>
        </div>
      </form>
    </div>
  );
}

function toFormValues(req: RequirementResponse): FormData {
  return {
    title: req.title,
    description: req.description,
    techStack: req.techStack,
    seniority: req.seniority,
    locationType: req.locationType,
    locationCity: req.locationCity ?? undefined,
    locationState: req.locationState ?? undefined,
    billRateMinUsd: req.billRateMinUsd,
    billRateMaxUsd: req.billRateMaxUsd,
    durationWeeks: req.durationWeeks,
    startDate: req.startDate,
    openings: req.openings,
    workAuthPrefs: req.workAuthPrefs,
    requiredInterviews: req.requiredInterviews,
    blindPosting: req.blindPosting,
  };
}
