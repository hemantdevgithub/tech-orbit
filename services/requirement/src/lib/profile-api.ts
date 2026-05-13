import { InternalError } from "@techorbit/errors";

export type CustomerCompanySummary = {
  id: string;
  primaryUserId: string;
  attributedCrmUserId: string | null;
  isProfileComplete: boolean;
};

// Light HTTP client for profile-svc calls that happen on a request path.
// The caller forwards the user's bearer token so profile-svc's own authz
// applies (the user can see their own company profile via /customers/me or
// by primaryUserId if they are an admin/CRM).
export async function getCustomerCompanyByUser(
  profileSvcUrl: string,
  primaryUserId: string,
  bearerToken: string,
): Promise<CustomerCompanySummary | null> {
  const url = `${profileSvcUrl}/api/v1/customers/${primaryUserId}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { authorization: `Bearer ${bearerToken}` },
    });
  } catch (err) {
    throw new InternalError(
      `Failed to reach profile-svc at ${url}: ${(err as Error).message}`,
    );
  }

  if (res.status === 404) return null;
  if (res.status === 403) return null; // viewer can't see this company
  if (!res.ok) {
    throw new InternalError(
      `profile-svc returned ${res.status} for GET ${url}`,
    );
  }

  const body = (await res.json()) as Record<string, unknown>;
  return {
    id: String(body.id),
    primaryUserId: String(body.primaryUserId),
    attributedCrmUserId:
      body.attributedCrmUserId == null ? null : String(body.attributedCrmUserId),
    isProfileComplete: Boolean(body.isProfileComplete),
  };
}
