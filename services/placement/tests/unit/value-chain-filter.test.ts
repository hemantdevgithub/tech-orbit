import { describe, expect, it } from "vitest";
import type { CommissionRule, ValueChain } from "../../src/generated/client/index.js";
import {
  filterCommissionRules,
  filterValueChain,
  type ViewerRole,
} from "../../src/lib/value-chain-filter.js";

const CUSTOMER_USER = "aaaaaaaa-0000-0000-0000-000000000001";
const CRM_USER      = "aaaaaaaa-0000-0000-0000-000000000002";
const SRM_USER      = "aaaaaaaa-0000-0000-0000-000000000003";
const MSME_ID       = "aaaaaaaa-0000-0000-0000-00000000000a";
const CANDIDATE     = "aaaaaaaa-0000-0000-0000-000000000004";
const INT_1         = "aaaaaaaa-0000-0000-0000-000000000005";
const INT_2         = "aaaaaaaa-0000-0000-0000-000000000006";
const COMPANY       = "cccccccc-0000-0000-0000-000000000001";

function fullChain(): ValueChain {
  return {
    id: "vc-1",
    placementId: "pl-1",
    customerCompanyId: COMPANY,
    attributedCrmId: CRM_USER,
    attributedSrmId: SRM_USER,
    attributedMsmeId: MSME_ID,
    candidateId: CANDIDATE,
    interviewerIds: [INT_1, INT_2],
    createdAt: new Date(),
  };
}

function rule(
  partial: Partial<CommissionRule> & Pick<CommissionRule, "slot">,
): CommissionRule {
  return {
    id: "r-" + Math.random().toString(36).slice(2, 8),
    placementId: "pl-1",
    beneficiaryUserId: null,
    beneficiaryMsmeId: null,
    calculation: "PERCENT_OF_BILL" as const,
    percentOfBillRate: null,
    flatFeeUsd: null,
    interviewId: null,
    notes: null,
    createdAt: new Date(),
    ...partial,
  };
}

const fullRules = (): CommissionRule[] => [
  rule({ slot: "CRM",         beneficiaryUserId: CRM_USER }),
  rule({ slot: "SRM",         beneficiaryUserId: SRM_USER }),
  rule({ slot: "INTERVIEWER", beneficiaryUserId: INT_1 }),
  rule({ slot: "INTERVIEWER", beneficiaryUserId: INT_2 }),
  rule({ slot: "CANDIDATE_W2", beneficiaryUserId: CANDIDATE }),
  rule({ slot: "PLATFORM" }),
];

describe("filterValueChain — ADMIN", () => {
  it("sees everything; no redactions", () => {
    const v = filterValueChain(fullChain(), { kind: "ADMIN" });
    expect(v.attributedCrmId).toBe(CRM_USER);
    expect(v.attributedSrmId).toBe(SRM_USER);
    expect(v.attributedMsmeId).toBe(MSME_ID);
    expect(v.candidateId).toBe(CANDIDATE);
    expect(v.interviewerIds).toEqual([INT_1, INT_2]);
    expect(v.redactedSlots).toEqual([]);
  });
});

describe("filterValueChain — CUSTOMER_OWNER", () => {
  it("sees everything like admin", () => {
    const v = filterValueChain(fullChain(), { kind: "CUSTOMER_OWNER" });
    expect(v.attributedCrmId).toBe(CRM_USER);
    expect(v.attributedSrmId).toBe(SRM_USER);
    expect(v.redactedSlots).toEqual([]);
  });
});

describe("filterValueChain — CRM", () => {
  const viewer: ViewerRole = { kind: "CRM", userId: CRM_USER };
  const v = filterValueChain(fullChain(), viewer);

  it("sees customer + candidate + own CRM slot", () => {
    expect(v.customerCompanyId).toBe(COMPANY);
    expect(v.candidateId).toBe(CANDIDATE);
    expect(v.attributedCrmId).toBe(CRM_USER);
  });

  it("SRM, MSME, interviewers all redacted", () => {
    expect(v.attributedSrmId).toBeNull();
    expect(v.attributedMsmeId).toBeNull();
    expect(v.interviewerIds).toEqual([]);
    expect(v.redactedSlots).toContain("SRM");
    expect(v.redactedSlots).toContain("MSME");
    expect(v.redactedSlots).toContain("INTERVIEWER");
  });
});

describe("filterValueChain — SRM", () => {
  const viewer: ViewerRole = { kind: "SRM", userId: SRM_USER };
  const v = filterValueChain(fullChain(), viewer);

  it("sees own SRM slot only (not CRM, not MSME)", () => {
    expect(v.attributedSrmId).toBe(SRM_USER);
    expect(v.attributedCrmId).toBeNull();
    expect(v.attributedMsmeId).toBeNull();
    expect(v.interviewerIds).toEqual([]);
    expect(v.redactedSlots).toContain("CRM");
    expect(v.redactedSlots).toContain("MSME");
  });
});

describe("filterValueChain — MSME", () => {
  const viewer: ViewerRole = { kind: "MSME", msmeId: MSME_ID };
  const v = filterValueChain(fullChain(), viewer);

  it("sees own MSME slot + SRM (sourcing lineage)", () => {
    expect(v.attributedMsmeId).toBe(MSME_ID);
    expect(v.attributedSrmId).toBe(SRM_USER);
  });

  it("CRM and interviewer slots redacted", () => {
    expect(v.attributedCrmId).toBeNull();
    expect(v.interviewerIds).toEqual([]);
    expect(v.redactedSlots).toContain("CRM");
    expect(v.redactedSlots).toContain("INTERVIEWER");
  });
});

describe("filterValueChain — CANDIDATE", () => {
  const viewer: ViewerRole = { kind: "CANDIDATE", userId: CANDIDATE };
  const v = filterValueChain(fullChain(), viewer);

  it("sees customer + their own candidate slot + MSME (for C2C)", () => {
    expect(v.customerCompanyId).toBe(COMPANY);
    expect(v.candidateId).toBe(CANDIDATE);
    expect(v.attributedMsmeId).toBe(MSME_ID); // C2C employer
  });

  it("CRM, SRM, interviewers all redacted", () => {
    expect(v.attributedCrmId).toBeNull();
    expect(v.attributedSrmId).toBeNull();
    expect(v.interviewerIds).toEqual([]);
    expect(v.redactedSlots).toContain("CRM");
    expect(v.redactedSlots).toContain("SRM");
  });
});

describe("filterValueChain — INTERVIEWER", () => {
  const viewer: ViewerRole = { kind: "INTERVIEWER", userId: INT_1 };
  const v = filterValueChain(fullChain(), viewer);

  it("sees customer + candidate + own interviewer id only", () => {
    expect(v.customerCompanyId).toBe(COMPANY);
    expect(v.candidateId).toBe(CANDIDATE);
    expect(v.interviewerIds).toEqual([INT_1]);
  });

  it("other interviewers and all attribution hidden", () => {
    expect(v.attributedCrmId).toBeNull();
    expect(v.attributedSrmId).toBeNull();
    expect(v.attributedMsmeId).toBeNull();
    expect(v.interviewerIds).not.toContain(INT_2);
  });
});

describe("filterValueChain — OUTSIDER", () => {
  it("redacts everything", () => {
    const v = filterValueChain(fullChain(), { kind: "OUTSIDER" });
    expect(v.customerCompanyId).toBeNull();
    expect(v.candidateId).toBeNull();
    expect(v.attributedCrmId).toBeNull();
    expect(v.attributedSrmId).toBeNull();
    expect(v.attributedMsmeId).toBeNull();
    expect(v.interviewerIds).toEqual([]);
    expect(v.redactedSlots.length).toBeGreaterThan(0);
  });
});

// ─── Commission rules filter ───────────────────────────────────────────────────

describe("filterCommissionRules — visibility per role", () => {
  it("ADMIN sees all rules", () => {
    const filtered = filterCommissionRules(fullRules(), { kind: "ADMIN" });
    expect(filtered).toHaveLength(6);
  });

  it("CUSTOMER_OWNER sees all rules", () => {
    const filtered = filterCommissionRules(fullRules(), { kind: "CUSTOMER_OWNER" });
    expect(filtered).toHaveLength(6);
  });

  it("CRM sees only their own CRM rule", () => {
    const filtered = filterCommissionRules(fullRules(), { kind: "CRM", userId: CRM_USER });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.slot).toBe("CRM");
    expect(filtered[0]?.beneficiaryUserId).toBe(CRM_USER);
  });

  it("a CRM cannot see another CRM's rule", () => {
    const rules = [rule({ slot: "CRM", beneficiaryUserId: "other-crm-id" })];
    const filtered = filterCommissionRules(rules, { kind: "CRM", userId: CRM_USER });
    expect(filtered).toHaveLength(0);
  });

  it("SRM sees only their own SRM rule", () => {
    const filtered = filterCommissionRules(fullRules(), { kind: "SRM", userId: SRM_USER });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.slot).toBe("SRM");
  });

  it("MSME sees only their MSME rule", () => {
    const rulesWithMsme = [
      ...fullRules(),
      rule({ slot: "MSME", beneficiaryMsmeId: MSME_ID }),
    ];
    const filtered = filterCommissionRules(rulesWithMsme, { kind: "MSME", msmeId: MSME_ID });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.slot).toBe("MSME");
  });

  it("CANDIDATE sees only their own CANDIDATE_W2 rule", () => {
    const filtered = filterCommissionRules(fullRules(), { kind: "CANDIDATE", userId: CANDIDATE });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.slot).toBe("CANDIDATE_W2");
  });

  it("INTERVIEWER sees only their own interviewer row", () => {
    const filtered = filterCommissionRules(fullRules(), { kind: "INTERVIEWER", userId: INT_1 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.slot).toBe("INTERVIEWER");
    expect(filtered[0]?.beneficiaryUserId).toBe(INT_1);
  });

  it("no viewer kind ever sees PLATFORM except admin/owner", () => {
    const roles: ViewerRole[] = [
      { kind: "CRM", userId: CRM_USER },
      { kind: "SRM", userId: SRM_USER },
      { kind: "MSME", msmeId: MSME_ID },
      { kind: "CANDIDATE", userId: CANDIDATE },
      { kind: "INTERVIEWER", userId: INT_1 },
      { kind: "OUTSIDER" },
    ];
    for (const v of roles) {
      const filtered = filterCommissionRules(fullRules(), v);
      expect(filtered.find((r) => r.slot === "PLATFORM")).toBeUndefined();
    }
  });

  it("OUTSIDER sees nothing", () => {
    const filtered = filterCommissionRules(fullRules(), { kind: "OUTSIDER" });
    expect(filtered).toHaveLength(0);
  });
});
