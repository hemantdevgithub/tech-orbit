import type {
  MemberRequestJoin,
  PortfolioMembershipStatus,
  PortfolioMemberType,
  PortfolioReject,
  SrmInviteMember,
  SrmPortfolioMembershipResponse,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import { ConflictError, ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { SrmPortfolioMembership } from "../generated/client/index.js";
import { srmPortfolioRepository } from "../repositories/srm-portfolio.repository.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import { prisma } from "../lib/prisma.js";

function toResponse(row: SrmPortfolioMembership): SrmPortfolioMembershipResponse {
  return {
    id: row.id,
    srmUserId: row.srmUserId,
    memberUserId: row.memberUserId,
    memberType: row.memberType,
    status: row.status,
    initiatedBy: row.initiatedBy,
    initiatedByUserId: row.initiatedByUserId,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    approvedByUserId: row.approvedByUserId,
    rejectedAt: row.rejectedAt ? row.rejectedAt.toISOString() : null,
    rejectedByUserId: row.rejectedByUserId,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const srmPortfolioService = {
  // SRM-initiated: SRM sends an invite to a candidate or MSME.
  async srmInvite(
    ctx: AuthContext,
    body: SrmInviteMember,
  ): Promise<SrmPortfolioMembershipResponse> {
    if (!ctx.roles.includes("SRM") && !ctx.roles.includes("ADMIN")) {
      throw new ForbiddenError("Only SRMs can invite portfolio members");
    }
    if (body.memberUserId === ctx.userId) {
      throw new ConflictError("Cannot invite yourself");
    }
    const existing = await srmPortfolioRepository.findByPair(
      ctx.userId,
      body.memberUserId,
      body.memberType,
    );
    if (existing) {
      throw new ConflictError(
        `A ${existing.status.toLowerCase()} membership already exists for this pair`,
      );
    }
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.srmPortfolioMembership.create({
        data: {
          srmUserId: ctx.userId,
          memberUserId: body.memberUserId,
          memberType: body.memberType,
          initiatedBy: "SRM",
          initiatedByUserId: ctx.userId,
        },
      });
      const event = buildEvent("srm-portfolio.invited.v1", {
        membershipId: row.id,
        srmUserId: row.srmUserId,
        memberUserId: row.memberUserId,
        memberType: row.memberType,
      });
      await enqueueEvent(tx, event, row.id);
      return row;
    });
    return toResponse(created);
  },

  // Member-initiated: a candidate or MSME asks to join an SRM's roster.
  async memberRequestJoin(
    ctx: AuthContext,
    body: MemberRequestJoin,
  ): Promise<SrmPortfolioMembershipResponse> {
    if (
      !ctx.roles.includes("CANDIDATE") &&
      !ctx.roles.includes("MSME") &&
      !ctx.roles.includes("ADMIN")
    ) {
      throw new ForbiddenError(
        "Only candidates or MSMEs can request to join an SRM's portfolio",
      );
    }
    if (body.srmUserId === ctx.userId) {
      throw new ConflictError("Cannot request to join yourself");
    }
    const existing = await srmPortfolioRepository.findByPair(
      body.srmUserId,
      ctx.userId,
      body.memberType,
    );
    if (existing) {
      throw new ConflictError(
        `A ${existing.status.toLowerCase()} membership already exists for this pair`,
      );
    }
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.srmPortfolioMembership.create({
        data: {
          srmUserId: body.srmUserId,
          memberUserId: ctx.userId,
          memberType: body.memberType,
          initiatedBy: "MEMBER",
          initiatedByUserId: ctx.userId,
        },
      });
      const event = buildEvent("srm-portfolio.requested.v1", {
        membershipId: row.id,
        srmUserId: row.srmUserId,
        memberUserId: row.memberUserId,
        memberType: row.memberType,
      });
      await enqueueEvent(tx, event, row.id);
      return row;
    });
    return toResponse(created);
  },

  async approve(
    ctx: AuthContext,
    id: string,
  ): Promise<SrmPortfolioMembershipResponse> {
    const row = await srmPortfolioRepository.findById(id);
    if (!row) throw new NotFoundError("Membership request not found");
    if (row.status !== "PENDING") {
      throw new ConflictError(`Membership is already ${row.status.toLowerCase()}`);
    }
    // Only the OTHER party (not the initiator) can approve.
    const approverIsSrm = row.srmUserId === ctx.userId;
    const approverIsMember = row.memberUserId === ctx.userId;
    if (!approverIsSrm && !approverIsMember && !ctx.roles.includes("ADMIN")) {
      throw new ForbiddenError("Only the counterparty can approve this request");
    }
    if (
      (row.initiatedBy === "SRM" && approverIsSrm) ||
      (row.initiatedBy === "MEMBER" && approverIsMember)
    ) {
      throw new ForbiddenError("The initiator cannot approve their own request");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const approved = await tx.srmPortfolioMembership.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedByUserId: ctx.userId,
        },
      });
      const event = buildEvent("srm-portfolio.approved.v1", {
        membershipId: approved.id,
        srmUserId: approved.srmUserId,
        memberUserId: approved.memberUserId,
        memberType: approved.memberType,
        approvedByUserId: ctx.userId,
        initiatedByUserId: approved.initiatedByUserId,
      });
      await enqueueEvent(tx, event, approved.id);
      return approved;
    });
    return toResponse(updated);
  },

  async reject(
    ctx: AuthContext,
    id: string,
    body: PortfolioReject,
  ): Promise<SrmPortfolioMembershipResponse> {
    const row = await srmPortfolioRepository.findById(id);
    if (!row) throw new NotFoundError("Membership request not found");
    if (row.status !== "PENDING") {
      throw new ConflictError(`Membership is already ${row.status.toLowerCase()}`);
    }
    const approverIsSrm = row.srmUserId === ctx.userId;
    const approverIsMember = row.memberUserId === ctx.userId;
    if (!approverIsSrm && !approverIsMember && !ctx.roles.includes("ADMIN")) {
      throw new ForbiddenError("Only the counterparty can reject this request");
    }
    if (
      (row.initiatedBy === "SRM" && approverIsSrm) ||
      (row.initiatedBy === "MEMBER" && approverIsMember)
    ) {
      throw new ForbiddenError("The initiator cannot reject their own request");
    }
    const rejected = await srmPortfolioRepository.reject(id, ctx.userId, body.reason);
    return toResponse(rejected);
  },

  async listForSrm(
    ctx: AuthContext,
    filters: { status?: PortfolioMembershipStatus; memberType?: PortfolioMemberType },
  ): Promise<SrmPortfolioMembershipResponse[]> {
    if (!ctx.roles.includes("SRM") && !ctx.roles.includes("ADMIN")) {
      throw new ForbiddenError("Only SRMs can list their portfolio");
    }
    const rows = await srmPortfolioRepository.listForSrm(ctx.userId, filters);
    return rows.map(toResponse);
  },

  async listForMember(
    ctx: AuthContext,
    filters: { status?: PortfolioMembershipStatus },
  ): Promise<SrmPortfolioMembershipResponse[]> {
    const rows = await srmPortfolioRepository.listForMember(ctx.userId, filters);
    return rows.map(toResponse);
  },

  // S2S helper — matching-svc calls this to verify a candidate is in an
  // SRM's approved portfolio before allowing an invite-to-submit.
  async hasApprovedLink(
    srmUserId: string,
    memberUserId: string,
    memberType: PortfolioMemberType,
  ): Promise<boolean> {
    return srmPortfolioRepository.hasApprovedLink(srmUserId, memberUserId, memberType);
  },
};

export type SrmPortfolioService = typeof srmPortfolioService;
