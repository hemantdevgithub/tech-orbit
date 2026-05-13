import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import {
  calculateWeeklyPayouts,
  calculateInterviewerFeePayouts,
  type CommissionRuleInput,
  type PayoutDraft,
} from "../../src/services/payout-calculator.js";

const d = (n: string | number): Decimal => new Decimal(n);

const RULE_IDS = {
  crm: "11111111-1111-1111-1111-111111111111",
  srm: "22222222-2222-2222-2222-222222222222",
  candW2: "33333333-3333-3333-3333-333333333333",
  platform: "44444444-4444-4444-4444-444444444444",
  msme: "55555555-5555-5555-5555-555555555555",
  interviewer1: "66666666-6666-6666-6666-666666666666",
  interviewer2: "77777777-7777-7777-7777-777777777777",
};

const USERS = {
  crm: "cccccccc-1111-1111-1111-111111111111",
  srm: "ddddddd1-1111-1111-1111-111111111111",
  candidate: "cccccccc-2222-2222-2222-222222222222",
  msme: "eeeeee11-1111-1111-1111-111111111111",
  int1: "ffffff11-1111-1111-1111-111111111111",
  int2: "ffffff22-2222-2222-2222-222222222222",
};

const fullW2Rules = (): CommissionRuleInput[] => [
  {
    id: RULE_IDS.crm,
    slot: "CRM",
    calculation: "PERCENT_OF_BILL",
    percentOfBillRate: d("0.08"),
    flatFeeUsd: null,
    beneficiaryUserId: USERS.crm,
    beneficiaryMsmeId: null,
  },
  {
    id: RULE_IDS.srm,
    slot: "SRM",
    calculation: "PERCENT_OF_BILL",
    percentOfBillRate: d("0.05"),
    flatFeeUsd: null,
    beneficiaryUserId: USERS.srm,
    beneficiaryMsmeId: null,
  },
  {
    id: RULE_IDS.candW2,
    slot: "CANDIDATE_W2",
    calculation: "PERCENT_OF_BILL",
    percentOfBillRate: d("0.75"),
    flatFeeUsd: null,
    beneficiaryUserId: USERS.candidate,
    beneficiaryMsmeId: null,
  },
  {
    id: RULE_IDS.platform,
    slot: "PLATFORM",
    calculation: "RESIDUAL",
    percentOfBillRate: null,
    flatFeeUsd: null,
    beneficiaryUserId: null,
    beneficiaryMsmeId: null,
  },
];

const c2cRules = (): CommissionRuleInput[] => [
  {
    id: RULE_IDS.crm,
    slot: "CRM",
    calculation: "PERCENT_OF_BILL",
    percentOfBillRate: d("0.08"),
    flatFeeUsd: null,
    beneficiaryUserId: USERS.crm,
    beneficiaryMsmeId: null,
  },
  {
    id: RULE_IDS.srm,
    slot: "SRM",
    calculation: "PERCENT_OF_BILL",
    percentOfBillRate: d("0.05"),
    flatFeeUsd: null,
    beneficiaryUserId: USERS.srm,
    beneficiaryMsmeId: null,
  },
  {
    id: RULE_IDS.msme,
    slot: "MSME",
    calculation: "RESIDUAL",
    percentOfBillRate: null,
    flatFeeUsd: null,
    beneficiaryUserId: null,
    beneficiaryMsmeId: USERS.msme,
  },
  {
    id: RULE_IDS.platform,
    slot: "PLATFORM",
    calculation: "PERCENT_OF_BILL",
    percentOfBillRate: d("0.12"),
    flatFeeUsd: null,
    beneficiaryUserId: null,
    beneficiaryMsmeId: null,
  },
];

function find(payouts: PayoutDraft[], slot: PayoutDraft["slot"]): PayoutDraft | undefined {
  return payouts.find((p) => p.slot === slot);
}

// ─── Spec scenario: W-2, $120/hr, CRM + SRM, 40 hours ──────────────────────

describe("calculateWeeklyPayouts — W-2 scenario from SPRINT_7_PROMPT", () => {
  const input = {
    placementId: "pppppppp-1111-1111-1111-111111111111",
    invoiceId: "iiiiiiii-1111-1111-1111-111111111111",
    billRateUsd: d("120"),
    totalHoursWorked: d("40"),
    commissionRules: fullW2Rules(),
  };
  const payouts = calculateWeeklyPayouts(input);

  it("produces 4 payouts (CRM, SRM, Candidate W-2, Platform)", () => {
    expect(payouts).toHaveLength(4);
  });

  it("CRM = 40 × $120 × 8% = $384", () => {
    const p = find(payouts, "CRM");
    expect(p?.amountUsd.toFixed(2)).toBe("384.00");
    expect(p?.beneficiaryUserId).toBe(USERS.crm);
  });

  it("SRM = 40 × $120 × 5% = $240", () => {
    expect(find(payouts, "SRM")?.amountUsd.toFixed(2)).toBe("240.00");
  });

  it("Candidate W-2 = 40 × $120 × 75% = $3,600", () => {
    const p = find(payouts, "CANDIDATE_W2");
    expect(p?.amountUsd.toFixed(2)).toBe("3600.00");
    expect(p?.beneficiaryUserId).toBe(USERS.candidate);
  });

  it("Platform residual = 40 × $120 × 12% = $576", () => {
    expect(find(payouts, "PLATFORM")?.amountUsd.toFixed(2)).toBe("576.00");
  });

  it("sum of all payouts === 40 × $120 = $4,800 (invoice total)", () => {
    const total = payouts.reduce((s, p) => s.plus(p.amountUsd), d(0));
    expect(total.toFixed(2)).toBe("4800.00");
  });

  it("no FLAT_FEE payouts in the weekly cycle", () => {
    // Weekly cycle never pays interviewer fees — those come from the
    // separate INTERVIEWER_FEES invoice.
    expect(payouts.find((p) => p.slot === "INTERVIEWER")).toBeUndefined();
  });

  it("every payout has the correct invoiceId + placementId", () => {
    for (const p of payouts) {
      expect(p.invoiceId).toBe(input.invoiceId);
      expect(p.placementId).toBe(input.placementId);
    }
  });
});

// ─── C2C scenario ──────────────────────────────────────────────────────────

describe("calculateWeeklyPayouts — C2C scenario", () => {
  const input = {
    placementId: "pppppppp-2222-2222-2222-222222222222",
    invoiceId: "iiiiiiii-2222-2222-2222-222222222222",
    billRateUsd: d("120"),
    totalHoursWorked: d("40"),
    commissionRules: c2cRules(),
  };
  const payouts = calculateWeeklyPayouts(input);

  it("produces 4 payouts (CRM, SRM, MSME, Platform)", () => {
    expect(payouts).toHaveLength(4);
  });

  it("CRM = $384, SRM = $240, Platform (12% fixed) = $576", () => {
    expect(find(payouts, "CRM")?.amountUsd.toFixed(2)).toBe("384.00");
    expect(find(payouts, "SRM")?.amountUsd.toFixed(2)).toBe("240.00");
    expect(find(payouts, "PLATFORM")?.amountUsd.toFixed(2)).toBe("576.00");
  });

  it("MSME residual = 40 × $120 - $384 - $240 - $576 = $3,600", () => {
    const msme = find(payouts, "MSME");
    expect(msme?.amountUsd.toFixed(2)).toBe("3600.00");
    expect(msme?.beneficiaryMsmeId).toBe(USERS.msme);
    expect(msme?.beneficiaryUserId).toBeNull();
  });

  it("no CANDIDATE_W2 payout in C2C", () => {
    expect(find(payouts, "CANDIDATE_W2")).toBeUndefined();
  });

  it("sum === invoice total $4,800", () => {
    const total = payouts.reduce((s, p) => s.plus(p.amountUsd), d(0));
    expect(total.toFixed(2)).toBe("4800.00");
  });
});

// ─── No CRM attribution → Platform residual absorbs CRM's cut ──────────────

describe("calculateWeeklyPayouts — no CRM attribution", () => {
  const noCrmRules: CommissionRuleInput[] = fullW2Rules().filter(
    (r) => r.slot !== "CRM",
  );

  const input = {
    placementId: "pppppppp-3333-3333-3333-333333333333",
    invoiceId: "iiiiiiii-3333-3333-3333-333333333333",
    billRateUsd: d("120"),
    totalHoursWorked: d("40"),
    commissionRules: noCrmRules,
  };
  const payouts = calculateWeeklyPayouts(input);

  it("no CRM payout (rule is absent)", () => {
    expect(find(payouts, "CRM")).toBeUndefined();
  });

  it("Platform residual absorbs CRM's 8% → 40 × $120 × 20% = $960", () => {
    // Bill = $120, 40 hrs = $4,800
    // SRM: 40 × $120 × 0.05 = $240
    // Candidate: 40 × $120 × 0.75 = $3,600
    // Platform (residual): $4,800 - $240 - $3,600 = $960 (= 20% of $4,800)
    expect(find(payouts, "PLATFORM")?.amountUsd.toFixed(2)).toBe("960.00");
  });

  it("sum still === invoice total", () => {
    const total = payouts.reduce((s, p) => s.plus(p.amountUsd), d(0));
    expect(total.toFixed(2)).toBe("4800.00");
  });
});

// ─── Hours precision ──────────────────────────────────────────────────────

describe("calculateWeeklyPayouts — hours with decimals", () => {
  it("37.5 hours scales correctly", () => {
    const payouts = calculateWeeklyPayouts({
      placementId: "p",
      invoiceId: "i",
      billRateUsd: d("100"),
      totalHoursWorked: d("37.5"),
      commissionRules: fullW2Rules(),
    });
    // CRM: 37.5 × 100 × 0.08 = 300.00
    expect(find(payouts, "CRM")?.amountUsd.toFixed(2)).toBe("300.00");
    // Candidate: 37.5 × 100 × 0.75 = 2812.50
    expect(find(payouts, "CANDIDATE_W2")?.amountUsd.toFixed(2)).toBe("2812.50");
  });

  it("zero hours → all payouts are $0.00 (not absent)", () => {
    const payouts = calculateWeeklyPayouts({
      placementId: "p",
      invoiceId: "i",
      billRateUsd: d("120"),
      totalHoursWorked: d("0"),
      commissionRules: fullW2Rules(),
    });
    // Still generates rows; downstream caller decides whether to persist
    // zero-dollar payouts or filter them.  Returning them explicitly is
    // safer — consumers can filter if they want.
    expect(payouts).toHaveLength(4);
    for (const p of payouts) {
      expect(p.amountUsd.toFixed(2)).toBe("0.00");
    }
  });
});

// ─── Interviewer flat fees: separate function ──────────────────────────────

describe("calculateInterviewerFeePayouts", () => {
  const interviewerRules: CommissionRuleInput[] = [
    {
      id: RULE_IDS.interviewer1,
      slot: "INTERVIEWER",
      calculation: "FLAT_FEE",
      percentOfBillRate: null,
      flatFeeUsd: d("150"),
      beneficiaryUserId: USERS.int1,
      beneficiaryMsmeId: null,
    },
    {
      id: RULE_IDS.interviewer2,
      slot: "INTERVIEWER",
      calculation: "FLAT_FEE",
      percentOfBillRate: null,
      flatFeeUsd: d("200"),
      beneficiaryUserId: USERS.int2,
      beneficiaryMsmeId: null,
    },
  ];

  const payouts = calculateInterviewerFeePayouts({
    placementId: "pppppppp-4444-4444-4444-444444444444",
    invoiceId: "iiiiiiii-4444-4444-4444-444444444444",
    commissionRules: interviewerRules,
  });

  it("one payout per interviewer rule", () => {
    expect(payouts).toHaveLength(2);
  });

  it("amount = flat fee exactly (no hour multiplication)", () => {
    expect(payouts[0]?.amountUsd.toFixed(2)).toBe("150.00");
    expect(payouts[1]?.amountUsd.toFixed(2)).toBe("200.00");
  });

  it("ignores non-INTERVIEWER rules in the input", () => {
    const mixed = [...interviewerRules, ...fullW2Rules()];
    const out = calculateInterviewerFeePayouts({
      placementId: "p",
      invoiceId: "i",
      commissionRules: mixed,
    });
    expect(out).toHaveLength(2);
    for (const p of out) expect(p.slot).toBe("INTERVIEWER");
  });

  it("each payout carries commissionRuleId for audit back to source", () => {
    expect(payouts[0]?.commissionRuleId).toBe(RULE_IDS.interviewer1);
    expect(payouts[1]?.commissionRuleId).toBe(RULE_IDS.interviewer2);
  });
});

// ─── Safety checks ─────────────────────────────────────────────────────────

describe("calculateWeeklyPayouts — edge cases", () => {
  it("rules with only a RESIDUAL and no PERCENT_OF_BILL → residual = whole bill", () => {
    const payouts = calculateWeeklyPayouts({
      placementId: "p",
      invoiceId: "i",
      billRateUsd: d("100"),
      totalHoursWorked: d("40"),
      commissionRules: [
        {
          id: "r1",
          slot: "PLATFORM",
          calculation: "RESIDUAL",
          percentOfBillRate: null,
          flatFeeUsd: null,
          beneficiaryUserId: null,
          beneficiaryMsmeId: null,
        },
      ],
    });
    expect(payouts).toHaveLength(1);
    expect(payouts[0]?.amountUsd.toFixed(2)).toBe("4000.00");
  });

  it("PERCENT_OF_BILL with null percent is skipped (bad data defense)", () => {
    const payouts = calculateWeeklyPayouts({
      placementId: "p",
      invoiceId: "i",
      billRateUsd: d("100"),
      totalHoursWorked: d("40"),
      commissionRules: [
        {
          id: "r1", slot: "CRM", calculation: "PERCENT_OF_BILL",
          percentOfBillRate: null, flatFeeUsd: null,
          beneficiaryUserId: USERS.crm, beneficiaryMsmeId: null,
        },
      ],
    });
    expect(payouts).toHaveLength(0);
  });

  it("decimals never leak floats — all amounts are Decimal instances", () => {
    const payouts = calculateWeeklyPayouts({
      placementId: "p",
      invoiceId: "i",
      billRateUsd: d("123.45"),
      totalHoursWorked: d("37.25"),
      commissionRules: fullW2Rules(),
    });
    for (const p of payouts) {
      expect(p.amountUsd).toBeInstanceOf(Decimal);
    }
  });
});
