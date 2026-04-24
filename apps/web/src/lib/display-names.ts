"use client";

import { useEffect, useState } from "react";
import { getProfileClient } from "./api-client";

/**
 * Lightweight display-name resolver. Each `type` has a separate cache and
 * hits the profile-svc endpoint that already exists for that role.
 *
 * Notes on what we actually show:
 *  - candidate  → the candidate's professional headline (more useful than
 *                 first+last when scanning a list of engineers). If the
 *                 profile has no headline, falls back to "#short".
 *  - customer   → the company's legalName.
 *  - interviewer→ their displayName.
 *
 * First-party profile data only — no identity-svc /me cross-reads.
 */

type Kind = "candidate" | "customer" | "interviewer";

const caches: Record<Kind, Map<string, Promise<string>>> = {
  candidate: new Map(),
  customer: new Map(),
  interviewer: new Map(),
};

function shortId(id: string): string {
  return `#${id.slice(0, 8)}`;
}

function fetchName(id: string, kind: Kind): Promise<string> {
  const cache = caches[kind];
  const cached = cache.get(id);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const client = getProfileClient();
      if (kind === "candidate") {
        const r = await client.getCandidateByUserId(id);
        return r.headline?.trim() || shortId(id);
      }
      if (kind === "customer") {
        const r = await client.getPublicCustomer(id);
        return r.legalName || shortId(id);
      }
      const r = await client.getInterviewerByUserId(id);
      return r.displayName?.trim() || shortId(id);
    } catch {
      return shortId(id);
    }
  })();

  cache.set(id, promise);
  return promise;
}

/**
 * React hook: returns a display label for the given id + role. Renders the
 * short-id fallback while the network request is in flight, so there's no
 * layout flash when the name arrives.
 */
export function useDisplayName(
  id: string | null | undefined,
  kind: Kind,
): string {
  const [name, setName] = useState<string>(id ? shortId(id) : "");

  useEffect(() => {
    if (!id) {
      setName("");
      return;
    }
    let cancelled = false;
    setName(shortId(id));
    void fetchName(id, kind).then((value) => {
      if (!cancelled) setName(value);
    });
    return () => {
      cancelled = true;
    };
  }, [id, kind]);

  return name;
}
