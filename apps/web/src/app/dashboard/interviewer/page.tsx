"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Input, Label } from "@techorbit/ui";
import type { InterviewerProfileResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getProfileClient } from "@/lib/api-client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function padHH(h: number): string {
  return String(h).padStart(2, "0");
}

// Generate slots for the next 14 days from the recurring pattern.
function generateSlots(daysOfWeek: number[], startHour: number, endHour: number) {
  const slots: { date: string; startTime: string; endTime: string; timezone: string }[] = [];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (daysOfWeek.includes(d.getDay())) {
      const ymd = d.toISOString().split("T")[0]!;
      slots.push({
        date: ymd,
        startTime: `${padHH(startHour)}:00`,
        endTime: `${padHH(endHour)}:00`,
        timezone: tz,
      });
    }
  }
  return slots;
}

export default function InterviewerDashboardPage() {
  const [profile, setProfile] = useState<InterviewerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Recurring pattern state
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon–Fri
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfileClient().getInterviewerProfile();
      setProfile(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const slots = generateSlots(daysOfWeek, startHour, endHour);
      const updated = await getProfileClient().setAvailability({ slots });
      setProfile(updated);
      setNotice(`Saved ${slots.length} availability slots for the next 14 days.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sage-600">Loading…</p>;
  if (!profile && error) {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-700 text-sm mb-3">
            No interviewer profile found. Create one first:
          </p>
          <a href="/onboarding/interviewer" className="text-forest-700 hover:underline text-sm">
            Complete interviewer onboarding →
          </a>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Interviewer availability</h1>
        <p className="text-sage-600 text-sm mt-1">Set your recurring availability. Slots are generated for the next 14 days.</p>
      </div>

      {profile && (
        <Card>
          <CardHeader><CardTitle>Your profile status</CardTitle></CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              <Badge variant={profile.status === "ACTIVE" ? "success" : "warning"}>{profile.status}</Badge>
              <span className="text-sm text-sage-600">{profile.availabilitySlots.length} slots currently set</span>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Set recurring availability</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label>Available days</Label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    daysOfWeek.includes(i)
                      ? "bg-forest-700 text-cream-100"
                      : "bg-sage-100 text-sage-700 hover:bg-sage-200"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startHour">Start hour (24h)</Label>
              <Input
                id="startHour"
                type="number"
                min={0}
                max={23}
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="endHour">End hour (24h)</Label>
              <Input
                id="endHour"
                type="number"
                min={1}
                max={24}
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                disabled={saving}
              />
            </div>
          </div>

          <div className="text-xs text-sage-600 bg-sage-50 p-3 rounded">
            Preview: {daysOfWeek.map((d) => DAYS[d]).join(", ")} from {padHH(startHour)}:00 to {padHH(endHour)}:00 —{" "}
            <strong>{generateSlots(daysOfWeek, startHour, endHour).length} slots</strong> in the next 14 days.
          </div>

          {notice && <div className="p-3 rounded bg-mint-200 text-forest-900 text-sm">{notice}</div>}
          {error && <div className="p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>}

          <Button onClick={onSave} disabled={saving || daysOfWeek.length === 0}>
            {saving ? "Saving…" : "Save availability"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
