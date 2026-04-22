import type {
  AttributeCrm,
  CrmAttributionRequestResponse,
  RequirementResponse,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import { ConflictError, ForbiddenError, NotFoundError } from "@techorbit/errors";
import { prisma } from "../lib/prisma.js";
import { requirementRepository } from "../repositories/requirement.repository.js";
import { crmAttributionRepository } from "../repositories/crm-attribution.repository.js";
import {
  toCrmAttributionResponse,
  toRequirementResponse,
} from "../lib/response-mappers.js";

type AttributeCrmResult =
  | { kind: "attributed"; requirement: RequirementResponse }
  | { kind: "pending"; request: CrmAttributionRequestResponse };

export function createCrmAttributionService() {
  return {
    // A CRM claims attribution on a published requirement.
    //
    // If the requirement's customer already has an attributed CRM (carried
    // over from CustomerCompanyProfile), and it matches this CRM, we just
    // confirm it. If a different CRM is already attributed, we refuse.
    // Otherwise we create a PENDING CrmAttributionRequest awaiting the
    // customer's approval.
    async claimAttribution(
      ctx: AuthContext,
      requirementId: string,
      body: AttributeCrm,
    ): Promise<AttributeCrmResult> {
      if (!ctx.roles.includes("CRM") && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only CRMs can claim attribution");
      }
      // Claimants can only claim for themselves unless they're admins.
      if (body.crmUserId !== ctx.userId && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Cannot claim attribution on behalf of another CRM");
      }

      const req = await requirementRepository.findByIdRaw(requirementId);
      if (!req) throw new NotFoundError("Requirement not found");
      if (req.status === "DRAFT") {
        throw new ForbiddenError("Cannot claim attribution on a draft requirement");
      }

      // Case 1: already attributed.
      if (req.attributedCrmId !== null) {
        if (req.attributedCrmId === body.crmUserId) {
          // Already you — no-op; return the requirement so the UI can confirm.
          return { kind: "attributed", requirement: toRequirementResponse(ctx, req) };
        }
        throw new ConflictError("This requirement is already attributed to a different CRM");
      }

      // Case 2: pending request already exists for this CRM.
      const existingPending = await crmAttributionRepository.findPending(
        requirementId,
        body.crmUserId,
      );
      if (existingPending) {
        return {
          kind: "pending",
          request: toCrmAttributionResponse(existingPending),
        };
      }

      // Case 3: create a fresh pending request.
      const created = await crmAttributionRepository.create({
        requirementId,
        customerCompanyId: req.customerCompanyId,
        crmUserId: body.crmUserId,
      });
      return { kind: "pending", request: toCrmAttributionResponse(created) };
    },

    async approveAttribution(
      ctx: AuthContext,
      attributionRequestId: string,
    ): Promise<CrmAttributionRequestResponse> {
      // Transactionally flip the request to APPROVED and stamp the
      // requirement with attributedCrmId. If both must land or neither.
      const approved = await prisma.$transaction(async (tx) => {
        const approved = await crmAttributionRepository.approve(
          ctx,
          attributionRequestId,
          tx,
        );
        await requirementRepository.setAttributedCrm(
          approved.requirementId,
          approved.crmUserId,
          tx,
        );
        return approved;
      });
      return toCrmAttributionResponse(approved);
    },

    async rejectAttribution(
      ctx: AuthContext,
      attributionRequestId: string,
    ): Promise<CrmAttributionRequestResponse> {
      const rejected = await crmAttributionRepository.reject(
        ctx,
        attributionRequestId,
      );
      return toCrmAttributionResponse(rejected);
    },

    async listPendingForCustomer(
      ctx: AuthContext,
    ): Promise<CrmAttributionRequestResponse[]> {
      // Customer viewing their own pending queue.
      const records = await crmAttributionRepository.listForCustomer(
        ctx,
        ctx.userId,
        "PENDING",
      );
      return records.map(toCrmAttributionResponse);
    },
  };
}

export type CrmAttributionService = ReturnType<typeof createCrmAttributionService>;
