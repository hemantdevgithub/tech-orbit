"use client";

import type {
  CommissionRuleResponse,
  EngagementType,
  ValueChainResponse,
} from "@techorbit/types";
import {
  BuildingIcon,
  FactoryIcon,
  HandshakeIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { useDisplayName } from "@/lib/display-names";

type Props = {
  valueChain: ValueChainResponse;
  commissionRules: CommissionRuleResponse[];
  billRateUsd: number;
  engagementType: EngagementType;
};

// Horizontal flowchart: Customer → (CRM) → (SRM) → Candidate/MSME.
// Interviewers appear as side-nodes.  Each node shows the name (or
// "Confidential"/"Unattributed"), the commission slot, and the projected
// hourly dollars (if the viewer is allowed to see them).

function Node({
  icon, label, sublabel, highlight,
}: { icon: React.ReactNode; label: string; sublabel?: string; highlight?: boolean }) {
  return (
    <div className={`shrink-0 rounded-xl border p-3 text-center min-w-[120px] ${
      highlight
        ? "bg-forest-800 text-cream-100 border-forest-700"
        : "bg-surface border-surface-border"
    }`}>
      <div className={`flex justify-center mb-1.5 ${highlight ? "text-mint-200" : "text-forest-700"}`}>{icon}</div>
      <div className={`text-xs font-semibold ${highlight ? "text-cream-100" : "text-forest-900"}`}>
        {label}
      </div>
      {sublabel && (
        <div className={`text-xs mt-0.5 ${highlight ? "text-sage-400" : "text-sage-500"}`}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <svg className="shrink-0 w-6 h-6 text-sage-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function displayUserId(id: string | null): string {
  if (!id) return "Unattributed";
  return `${id.slice(0, 6)}…${id.slice(-2)}`;
}

function ruleFor(
  rules: CommissionRuleResponse[],
  slot: string,
  beneficiaryUserId?: string | null,
  beneficiaryMsmeId?: string | null,
): CommissionRuleResponse | undefined {
  return rules.find((r) => {
    if (r.slot !== slot) return false;
    if (beneficiaryUserId !== undefined && r.beneficiaryUserId !== beneficiaryUserId) return false;
    if (beneficiaryMsmeId !== undefined && r.beneficiaryMsmeId !== beneficiaryMsmeId) return false;
    return true;
  });
}

function hourlyLabel(r: CommissionRuleResponse | undefined): string {
  if (!r) return "Confidential";
  if (r.projectedHourlyUsd === null) return "—";
  if (r.calculation === "FLAT_FEE") return `$${r.projectedHourlyUsd.toFixed(0)} one-time`;
  if (r.calculation === "PERCENT_OF_BILL" && r.percentOfBillRate !== null) {
    return `$${r.projectedHourlyUsd.toFixed(2)}/hr · ${(r.percentOfBillRate * 100).toFixed(0)}%`;
  }
  return `$${r.projectedHourlyUsd.toFixed(2)}/hr`;
}

export function ValueChainGraph({
  valueChain: vc,
  commissionRules: rules,
  engagementType,
}: Props) {
  const crmRedacted = vc.redactedSlots.includes("CRM");
  const srmRedacted = vc.redactedSlots.includes("SRM");
  const msmeRedacted = vc.redactedSlots.includes("MSME");
  const interviewerRedacted = vc.redactedSlots.includes("INTERVIEWER");

  // Note: vc.customerCompanyId is the COMPANY id, not the primary user id —
  // we don't have a company-by-id name endpoint, so the customer node still
  // shows the short id. Candidate uses their user id which does resolve.
  const candidateName = useDisplayName(vc.candidateId ?? null, "candidate");

  const crmRule = ruleFor(rules, "CRM", vc.attributedCrmId);
  const srmRule = ruleFor(rules, "SRM", vc.attributedSrmId);
  const candidateRule = ruleFor(rules, "CANDIDATE_W2", vc.candidateId);
  const msmeRule = ruleFor(rules, "MSME", undefined, vc.attributedMsmeId);
  const platformRule = rules.find((r) => r.slot === "PLATFORM");
  const interviewerRules = rules.filter((r) => r.slot === "INTERVIEWER");

  // End-of-chain beneficiary depends on engagement type.
  const endNode = engagementType === "C2C"
    ? {
        icon: <FactoryIcon size={20} />,
        label: msmeRedacted ? "Confidential" : vc.attributedMsmeId ? displayUserId(vc.attributedMsmeId) : "MSME",
        sublabel: msmeRule ? `MSME · ${hourlyLabel(msmeRule)}` : "MSME · Confidential",
      }
    : {
        icon: <UserIcon size={20} />,
        label: vc.candidateId ? candidateName : "Candidate",
        sublabel: candidateRule ? `Candidate · ${hourlyLabel(candidateRule)}` : "Candidate",
      };

  return (
    <div className="space-y-4">
      {/* Main horizontal flow */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Node
          icon={<BuildingIcon size={20} />}
          label={vc.customerCompanyId ? "Customer" : "Confidential"}
          sublabel={vc.customerCompanyId ? displayUserId(vc.customerCompanyId) : undefined}
          highlight
        />
        <Arrow />
        <Node
          icon={<HandshakeIcon size={20} />}
          label={crmRedacted ? "Confidential" : vc.attributedCrmId ? displayUserId(vc.attributedCrmId) : "No CRM"}
          sublabel={crmRule ? `CRM · ${hourlyLabel(crmRule)}` : crmRedacted ? "CRM · Hidden" : "CRM · —"}
        />
        <Arrow />
        <Node
          icon={<SearchIcon size={20} />}
          label={srmRedacted ? "Confidential" : vc.attributedSrmId ? displayUserId(vc.attributedSrmId) : "No SRM"}
          sublabel={srmRule ? `SRM · ${hourlyLabel(srmRule)}` : srmRedacted ? "SRM · Hidden" : "SRM · —"}
        />
        <Arrow />
        <Node icon={endNode.icon} label={endNode.label} sublabel={endNode.sublabel} highlight />
      </div>

      {/* Platform + interviewer side-chain */}
      <div className="flex flex-wrap gap-2 items-start">
        <div className="shrink-0 rounded-xl border border-surface-border bg-cream-50 p-3 min-w-[160px]">
          <p className="text-xs uppercase text-sage-500 tracking-wider mb-1">Platform</p>
          <p className="text-sm font-semibold text-forest-900">Techorbit</p>
          <p className="text-xs text-sage-500 mt-0.5">
            {platformRule ? hourlyLabel(platformRule) : "Confidential"}
          </p>
        </div>

        {interviewerRedacted ? (
          <div className="shrink-0 rounded-xl border border-surface-border bg-surface-soft p-3 min-w-[160px]">
            <p className="text-xs uppercase text-sage-500 tracking-wider mb-1">Interviewers</p>
            <p className="text-sm text-sage-500">Confidential</p>
          </div>
        ) : interviewerRules.length === 0 && vc.interviewerIds.length === 0 ? (
          <div className="shrink-0 rounded-xl border border-dashed border-surface-border bg-cream-50 p-3 min-w-[160px]">
            <p className="text-xs uppercase text-sage-500 tracking-wider mb-1">Interviewers</p>
            <p className="text-sm text-sage-500">Self-conducted</p>
          </div>
        ) : (
          interviewerRules.map((ir) => (
            <div key={ir.id} className="shrink-0 rounded-xl border border-surface-border bg-cream-50 p-3 min-w-[160px]">
              <p className="text-xs uppercase text-sage-500 tracking-wider mb-1">Interviewer</p>
              <p className="text-sm font-semibold text-forest-900 font-mono">
                {displayUserId(ir.beneficiaryUserId)}
              </p>
              <p className="text-xs text-sage-500 mt-0.5">{hourlyLabel(ir)}</p>
            </div>
          ))
        )}
      </div>

      {vc.redactedSlots.length > 0 && (
        <p className="text-xs text-sage-500 pt-1 italic">
          Some roles are confidential for your role ({vc.redactedSlots.join(", ")}).
        </p>
      )}
    </div>
  );
}
