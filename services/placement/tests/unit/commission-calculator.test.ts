import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import {
  COMMISSION_WEIGHTS,
  calculateCommissionRules,
  projectHourly,
  type CommissionInput,
  type CommissionRuleDraft,
} from "../../src/services/commission-calculator.js";

const d = (s: string | number): Decimal => new Decimal(s);

function findRule(
  rules: CommissionRuleDraft[],
  slot: CommissionRuleDraft["slot"],
): CommissionRuleDraft | undefined {
  return rules.find((r) => r.slot === slot);
}

describe("commission weights constants", () => {
  it("CRM is 8%", () => {
    expect(COMMISSION_WEIGHTS.CRM.toString()).toBe("0.08");
  });
  it("SRM is 5%", () => {
    expect(COMMISSION_WEIGHTS.SRM.toString()).toBe("0.05");
  });
  it("Candidate W-2 default is 75%", () => {
    expect(COMMISSION_WEIGHTS.CANDIDATE_W2_DEFAULT.toString()).toBe("0.75");
  });
});

describe("Scenario 1 — W-2, $120/hr bill, $90/hr pay, CRM + SRM + 2 interviewers", () => {
  const input: CommissionInput = {
    engagementType: "W2",
    billRateUsd: d(120),
    payRateUsd: d(90),
    attributedCrmId: "crm-1",
    attributedSrmId: "srm-1",
    attributedMsmeId: null,
    candidateId: "cand-1",
    interviewerFees: [
      { interviewId: "iv-1", interviewerUserId: "int-1", feeUsd: d(150) },
      { interviewId: "iv-2", interviewerUserId: "int-2", feeUsd: d(150) },
    ],
  };
  const rules = calculateCommissionRules(input);

  it("produces 6 rules", () => {
    expect(rules).toHaveLength(6);
  });

  it("CRM rule is 8% of bill rate", () => {
    const rule = findRule(rules, "CRM");
    expect(rule).toBeDefined();
    expect(rule?.beneficiaryUserId).toBe("crm-1");
    expect(rule?.calculation).toBe("PERCENT_OF_BILL");
    expect(rule?.percentOfBillRate?.toString()).toBe("0.08");
  });

  it("SRM rule is 5%", () => {
    const rule = findRule(rules, "SRM");
    expect(rule?.percentOfBillRate?.toString()).toBe("0.05");
    expect(rule?.beneficiaryUserId).toBe("srm-1");
  });

  it("Candidate W-2 rule is payRate/billRate = 0.75", () => {
    const rule = findRule(rules, "CANDIDATE_W2");
    expect(rule).toBeDefined();
    expect(rule?.beneficiaryUserId).toBe("cand-1");
    expect(rule?.percentOfBillRate?.toString()).toBe("0.75");
  });

  it("Platform rule is RESIDUAL", () => {
    const rule = findRule(rules, "PLATFORM");
    expect(rule?.calculation).toBe("RESIDUAL");
    expect(rule?.beneficiaryUserId).toBeNull();
  });

  it("two interviewer rules with $150 flat fees and interviewId set", () => {
    const interviewerRules = rules.filter((r) => r.slot === "INTERVIEWER");
    expect(interviewerRules).toHaveLength(2);
    for (const r of interviewerRules) {
      expect(r.calculation).toBe("FLAT_FEE");
      expect(r.flatFeeUsd?.toString()).toBe("150");
      expect(r.interviewId).toMatch(/^iv-/);
    }
  });

  it("hourly sum (CRM + SRM + Candidate + Platform) === bill rate", () => {
    const hourly =
      projectHourly(findRule(rules, "CRM")!, input).plus(
        projectHourly(findRule(rules, "SRM")!, input),
      )
      .plus(projectHourly(findRule(rules, "CANDIDATE_W2")!, input))
      .plus(projectHourly(findRule(rules, "PLATFORM")!, input));
    expect(hourly.toFixed(2)).toBe("120.00");
  });

  it("concrete hourly breakdown matches the spec", () => {
    expect(projectHourly(findRule(rules, "CRM")!, input).toFixed(2)).toBe("9.60");
    expect(projectHourly(findRule(rules, "SRM")!, input).toFixed(2)).toBe("6.00");
    expect(projectHourly(findRule(rules, "CANDIDATE_W2")!, input).toFixed(2)).toBe("90.00");
    expect(projectHourly(findRule(rules, "PLATFORM")!, input).toFixed(2)).toBe("14.40");
  });
});

describe("Scenario 2 — C2C, $120/hr, CRM + SRM + MSME", () => {
  const input: CommissionInput = {
    engagementType: "C2C",
    billRateUsd: d(120),
    payRateUsd: null,
    attributedCrmId: "crm-1",
    attributedSrmId: "srm-1",
    attributedMsmeId: "msme-1",
    candidateId: "cand-1",
    interviewerFees: [],
  };
  const rules = calculateCommissionRules(input);

  it("produces 4 rules (CRM, SRM, MSME, Platform)", () => {
    expect(rules).toHaveLength(4);
  });

  it("no CANDIDATE_W2 rule in C2C", () => {
    expect(findRule(rules, "CANDIDATE_W2")).toBeUndefined();
  });

  it("MSME rule is RESIDUAL and carries msmeId", () => {
    const rule = findRule(rules, "MSME");
    expect(rule).toBeDefined();
    expect(rule?.calculation).toBe("RESIDUAL");
    expect(rule?.beneficiaryMsmeId).toBe("msme-1");
    expect(rule?.beneficiaryUserId).toBeNull();
  });

  it("Platform is PERCENT_OF_BILL 12% in C2C (not residual)", () => {
    // In C2C, MSME takes the residual, so platform is fixed 12%.
    const rule = findRule(rules, "PLATFORM");
    expect(rule?.calculation).toBe("PERCENT_OF_BILL");
    expect(rule?.percentOfBillRate?.toString()).toBe("0.12");
  });

  it("MSME residual resolves to bill rate minus CRM+SRM+Platform = $90", () => {
    // $120 − $9.60 (CRM) − $6 (SRM) − $14.40 (Platform) = $90
    const msme = findRule(rules, "MSME")!;
    expect(projectHourly(msme, input).toFixed(2)).toBe("90.00");
  });
});

describe("Scenario 3 — W-2, $100/hr bill, $75/hr pay, NO CRM, SRM + 1 interviewer", () => {
  const input: CommissionInput = {
    engagementType: "W2",
    billRateUsd: d(100),
    payRateUsd: d(75),
    attributedCrmId: null,
    attributedSrmId: "srm-1",
    attributedMsmeId: null,
    candidateId: "cand-1",
    interviewerFees: [
      { interviewId: "iv-1", interviewerUserId: "int-1", feeUsd: d(150) },
    ],
  };
  const rules = calculateCommissionRules(input);

  it("no CRM rule when attribution is null", () => {
    expect(findRule(rules, "CRM")).toBeUndefined();
  });

  it("produces 4 rules: SRM, Candidate, Platform, 1 Interviewer", () => {
    expect(rules).toHaveLength(4);
  });

  it("platform is RESIDUAL and absorbs the missing CRM slot (20% here)", () => {
    const platform = findRule(rules, "PLATFORM")!;
    expect(platform.calculation).toBe("RESIDUAL");
    // 100 − 5 (SRM) − 75 (candidate) = 20
    expect(projectHourly(platform, input).toFixed(2)).toBe("20.00");
  });

  it("hourly sum still matches bill rate", () => {
    const hourly =
      projectHourly(findRule(rules, "SRM")!, input)
      .plus(projectHourly(findRule(rules, "CANDIDATE_W2")!, input))
      .plus(projectHourly(findRule(rules, "PLATFORM")!, input));
    expect(hourly.toFixed(2)).toBe("100.00");
  });
});

describe("edge cases", () => {
  it("W-2 without payRate defaults candidate to 75% (CANDIDATE_W2_DEFAULT)", () => {
    const rules = calculateCommissionRules({
      engagementType: "W2",
      billRateUsd: d(100),
      payRateUsd: null,
      attributedCrmId: null,
      attributedSrmId: null,
      attributedMsmeId: null,
      candidateId: "cand-1",
      interviewerFees: [],
    });
    const cand = findRule(rules, "CANDIDATE_W2");
    expect(cand?.percentOfBillRate?.toString()).toBe("0.75");
  });

  it("no CRM + no SRM + W-2 → platform gets 25% residual", () => {
    const input: CommissionInput = {
      engagementType: "W2",
      billRateUsd: d(100),
      payRateUsd: d(75),
      attributedCrmId: null,
      attributedSrmId: null,
      attributedMsmeId: null,
      candidateId: "cand-1",
      interviewerFees: [],
    };
    const rules = calculateCommissionRules(input);
    const platform = findRule(rules, "PLATFORM")!;
    expect(projectHourly(platform, input).toFixed(2)).toBe("25.00");
  });

  it("C2C without MSME attribution throws (invalid config)", () => {
    expect(() =>
      calculateCommissionRules({
        engagementType: "C2C",
        billRateUsd: d(120),
        payRateUsd: null,
        attributedCrmId: null,
        attributedSrmId: null,
        attributedMsmeId: null,
        candidateId: "cand-1",
        interviewerFees: [],
      }),
    ).toThrow(/C2C placement requires attributedMsmeId/);
  });

  it("IC_1099 throws — not supported in v1", () => {
    expect(() =>
      calculateCommissionRules({
        engagementType: "IC_1099",
        billRateUsd: d(100),
        payRateUsd: null,
        attributedCrmId: null,
        attributedSrmId: null,
        attributedMsmeId: null,
        candidateId: "cand-1",
        interviewerFees: [],
      }),
    ).toThrow(/1099/);
  });

  it("W-2 candidate share > 1 is rejected (pay > bill)", () => {
    expect(() =>
      calculateCommissionRules({
        engagementType: "W2",
        billRateUsd: d(100),
        payRateUsd: d(110),
        attributedCrmId: null,
        attributedSrmId: null,
        attributedMsmeId: null,
        candidateId: "cand-1",
        interviewerFees: [],
      }),
    ).toThrow(/payRateUsd must be less than billRateUsd/);
  });

  it("W-2 pay rate that leaves no residual for platform is rejected", () => {
    // payRate = 0.95 * bill + CRM 0.08 + SRM 0.05 = 1.08 > 1.0
    expect(() =>
      calculateCommissionRules({
        engagementType: "W2",
        billRateUsd: d(100),
        payRateUsd: d(95),
        attributedCrmId: "crm",
        attributedSrmId: "srm",
        attributedMsmeId: null,
        candidateId: "cand-1",
        interviewerFees: [],
      }),
    ).toThrow(/exceed 100% of bill rate/);
  });

  it("all rules carry placement-anchored metadata (no leaked refs)", () => {
    const rules = calculateCommissionRules({
      engagementType: "W2",
      billRateUsd: d(120),
      payRateUsd: d(90),
      attributedCrmId: "crm-1",
      attributedSrmId: "srm-1",
      attributedMsmeId: null,
      candidateId: "cand-1",
      interviewerFees: [],
    });
    for (const r of rules) {
      expect(r.notes).toBeTruthy();
      // Either PERCENT_OF_BILL has a percent, FLAT_FEE has a flatFee, or RESIDUAL has neither
      if (r.calculation === "PERCENT_OF_BILL") {
        expect(r.percentOfBillRate).toBeDefined();
        expect(r.flatFeeUsd).toBeNull();
      }
      if (r.calculation === "FLAT_FEE") {
        expect(r.flatFeeUsd).toBeDefined();
        expect(r.percentOfBillRate).toBeNull();
      }
      if (r.calculation === "RESIDUAL") {
        expect(r.percentOfBillRate).toBeNull();
        expect(r.flatFeeUsd).toBeNull();
      }
    }
  });
});

describe("projectHourly dollar math", () => {
  it("PERCENT_OF_BILL: computes correctly", () => {
    const input: CommissionInput = {
      engagementType: "W2", billRateUsd: d(120), payRateUsd: d(90),
      attributedCrmId: "c", attributedSrmId: null, attributedMsmeId: null,
      candidateId: "cand", interviewerFees: [],
    };
    const crm = calculateCommissionRules(input).find((r) => r.slot === "CRM")!;
    expect(projectHourly(crm, input).toFixed(2)).toBe("9.60");
  });

  it("FLAT_FEE: returns the flat fee (one-time, not hourly)", () => {
    const input: CommissionInput = {
      engagementType: "W2", billRateUsd: d(120), payRateUsd: d(90),
      attributedCrmId: null, attributedSrmId: null, attributedMsmeId: null,
      candidateId: "cand",
      interviewerFees: [{ interviewId: "iv", interviewerUserId: "int", feeUsd: d(150) }],
    };
    const interviewer = calculateCommissionRules(input).find((r) => r.slot === "INTERVIEWER")!;
    expect(projectHourly(interviewer, input).toFixed(2)).toBe("150.00");
  });
});
